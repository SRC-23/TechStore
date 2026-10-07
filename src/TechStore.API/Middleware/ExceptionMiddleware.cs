using System.Net;
using System.Text.Json;

namespace TechStore.API.Middleware;

/// <summary>
/// Captura cualquier excepción no controlada y devuelve un JSON controlado en lugar
/// de un 500 vacío. En desarrollo incluye el detalle técnico para depurar; en
/// producción solo un mensaje genérico y un código de seguimiento (RNF-10), y el
/// detalle queda en el log del servidor.
/// </summary>
public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger, IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error no controlado en {Method} {Path} (traceId {TraceId})",
                context.Request.Method, context.Request.Path, context.TraceIdentifier);

            if (context.Response.HasStarted)
                throw;

            context.Response.Clear();
            context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
            context.Response.ContentType = "application/json";

            object payload = _environment.IsDevelopment()
                ? new
                {
                    message = ex.Message,
                    type = ex.GetType().Name,
                    inner = ex.InnerException?.Message,
                    path = context.Request.Path.Value,
                    traceId = context.TraceIdentifier
                }
                : new
                {
                    message = "Ocurrió un error inesperado. Intenta de nuevo o contacta a soporte.",
                    traceId = context.TraceIdentifier
                };

            await context.Response.WriteAsync(JsonSerializer.Serialize(payload,
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }));
        }
    }
}
