using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TechStore.Infrastructure.Data;

namespace TechStore.API.Controllers;

/// <summary>
/// Endpoints de apoyo para las pruebas automatizadas (tests/e2e).
///
/// Solo responden si la configuración "Testing:Enabled" es true (activado en
/// appsettings.Development.json). En producción no existe: devuelve 404.
/// </summary>
[ApiController]
[Route("api/testing")]
public class TestingController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public TestingController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    private bool Enabled => _configuration.GetValue<bool>("Testing:Enabled");

    /// <summary>
    /// Borra todos los datos y vuelve a cargar los datos semilla, para que cada
    /// archivo de pruebas empiece desde el mismo estado. No elimina la base de
    /// datos (en Azure eso cambiaría su nivel de servicio).
    /// </summary>
    [HttpPost("reset")]
    public async Task<ActionResult> Reset()
    {
        if (!Enabled)
            return NotFound();

        await _context.AppliedDiscounts.ExecuteDeleteAsync();
        await _context.OrderItems.ExecuteDeleteAsync();
        await _context.Orders.ExecuteDeleteAsync();
        await _context.CartItems.ExecuteDeleteAsync();
        await _context.ShoppingCarts.ExecuteDeleteAsync();
        await _context.Addresses.ExecuteDeleteAsync();
        await _context.DiscountRuleProducts.ExecuteDeleteAsync();
        await _context.DiscountRuleCategories.ExecuteDeleteAsync();
        await _context.DiscountConditions.ExecuteDeleteAsync();
        await _context.DiscountRules.ExecuteDeleteAsync();
        await _context.Products.ExecuteDeleteAsync();
        await _context.Categories.ExecuteUpdateAsync(s => s.SetProperty(c => c.ParentId, c => (Guid?)null));
        await _context.Categories.ExecuteDeleteAsync();
        await _context.Brands.ExecuteDeleteAsync();
        await _context.Users.ExecuteDeleteAsync();

        _context.ChangeTracker.Clear();
        await SeedData.InitializeAsync(_context, resetAdminPassword: true);

        return Ok(new
        {
            products = await _context.Products.CountAsync(),
            rules = await _context.DiscountRules.CountAsync(),
            users = await _context.Users.CountAsync()
        });
    }

    /// <summary>
    /// RNF-04: devuelve solo el prefijo del hash (p. ej. "$2a$") para comprobar que
    /// la contraseña se guarda con BCrypt sin exponer el hash completo.
    /// </summary>
    [HttpGet("password-hash-prefix")]
    public async Task<ActionResult> PasswordHashPrefix([FromQuery] string email)
    {
        if (!Enabled)
            return NotFound();

        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
            return NotFound(new { message = "Usuario no encontrado" });

        return Ok(new
        {
            prefix = user.PasswordHash.Length >= 4 ? user.PasswordHash[..4] : user.PasswordHash,
            length = user.PasswordHash.Length
        });
    }

    /// <summary>Permite fechar un pedido en el pasado para probar el gráfico de 7 días (HU-22).</summary>
    [HttpPut("orders/{id}/created-at")]
    public async Task<ActionResult> SetOrderDate(Guid id, [FromQuery] int daysAgo)
    {
        if (!Enabled)
            return NotFound();

        var order = await _context.Orders.FindAsync(id);
        if (order == null)
            return NotFound();

        order.CreatedAt = DateTime.UtcNow.AddDays(-Math.Abs(daysAgo));
        await _context.SaveChangesAsync();
        return NoContent();
    }
}
