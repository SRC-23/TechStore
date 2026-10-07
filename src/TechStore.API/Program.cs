using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using TechStore.API.Middleware;
using TechStore.Core.Interfaces;
using TechStore.Infrastructure.Data;
using TechStore.Infrastructure.Repositories;
using TechStore.Infrastructure.Services;
using TechStore.Infrastructure.Services.PricingEngine;

var builder = WebApplication.CreateBuilder(args);

// Database
// EnableRetryOnFailure: Azure SQL (nivel gratuito serverless) se pausa cuando no
// se usa y la primera conexión falla mientras se reanuda; EF reintenta solo.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"), sql =>
    {
        sql.EnableRetryOnFailure(maxRetryCount: 6, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null);
        sql.CommandTimeout(60);
    }));

// Authentication (JWT)
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = Encoding.UTF8.GetBytes(jwtSettings["SecretKey"]!);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.MapInboundClaims = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(secretKey),
        NameClaimType = System.Security.Claims.ClaimTypes.Name,
        RoleClaimType = System.Security.Claims.ClaimTypes.Role
    };
});

builder.Services.AddAuthorization();

// CORS (para permitir requests del frontend React)
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Controllers
// JsonStringEnumConverter permite que el frontend envíe/reciba enums como texto
// ("Pending", "Percentage") en lugar de números. Sin esto, los endpoints que
// reciben enums devuelven 400 Bad Request.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "TechStore API",
        Version = "v1",
        Description = "API para e-commerce de tecnología con motor de precios"
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Ingrese 'Bearer' seguido de un espacio y el token JWT"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Dependency Injection - Repositorios y Servicios
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IPricingEngine, PricingEngine>();

var app = builder.Build();

// Creación de la base de datos + datos iniciales
//
// No se requiere ejecutar "dotnet ef migrations add" ni "dotnet ef database update":
// si el proyecto tiene migraciones, se aplican; si no las tiene, el esquema se crea
// directamente a partir del modelo con EnsureCreated(). Así el proyecto arranca en
// cualquier máquina sin depender de la herramienta dotnet-ef.
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        if (context.Database.GetMigrations().Any())
        {
            logger.LogInformation("Aplicando migraciones pendientes...");
            context.Database.Migrate();
        }
        else
        {
            logger.LogInformation("No hay migraciones; creando el esquema desde el modelo...");
            await context.Database.EnsureCreatedAsync();
        }

        await SeedData.InitializeAsync(context, resetAdminPassword: app.Environment.IsDevelopment());

        logger.LogInformation("Base de datos lista. Productos: {Products}, Usuarios: {Users}, Reglas: {Rules}",
            await context.Products.CountAsync(),
            await context.Users.CountAsync(),
            await context.DiscountRules.CountAsync());
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "ERROR al preparar la base de datos. Revisa la cadena de conexión en appsettings.json (Server=...). Detalle: {Message}", ex.Message);
        throw;
    }
}

// Middleware pipeline
// El manejador de excepciones va PRIMERO para capturar todo lo que ocurra después.
app.UseMiddleware<ExceptionMiddleware>();

// Swagger siempre en desarrollo; en Azure se activa con la configuración
// "Swagger:Enabled" = true para que el grupo par pueda ejecutar las pruebas de API.
if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("Swagger:Enabled"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowFrontend");

// El frontend compilado (npm run build) se publica en wwwroot y se sirve desde
// el mismo App Service, así la API y la web comparten dominio y HTTPS.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Cualquier ruta que no sea /api ni un archivo la resuelve React Router.
// Las rutas /api inexistentes responden 404 en lugar de devolver la página web.
app.MapFallback("/api/{**rest}", context =>
{
    context.Response.StatusCode = StatusCodes.Status404NotFound;
    return Task.CompletedTask;
});
app.MapFallbackToFile("index.html");

app.Run();
