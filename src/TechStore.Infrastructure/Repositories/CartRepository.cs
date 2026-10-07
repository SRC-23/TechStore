using Microsoft.EntityFrameworkCore;
using TechStore.Core.Entities;
using TechStore.Core.Interfaces;
using TechStore.Infrastructure.Data;

namespace TechStore.Infrastructure.Repositories;

public class CartRepository : Repository<ShoppingCart>, ICartRepository
{
    public CartRepository(AppDbContext context) : base(context) { }

    /// <summary>
    /// Obtiene el carrito del usuario con sus items y el Producto de cada item
    /// SIEMPRE cargado.
    ///
    /// Se cargan los items en una consulta aparte (en vez de un Include anidado)
    /// porque cuando se acaba de insertar un CartItem nuevo, el rastreador de
    /// cambios de EF devuelve la instancia ya rastreada y la navegación .Product
    /// puede quedar en null. Eso provocaba NullReferenceException (error 500)
    /// al calcular el carrito. Esta consulta explícita garantiza que Product
    /// nunca sea null.
    /// </summary>
    public async Task<ShoppingCart?> GetByUserIdWithItemsAsync(Guid userId)
    {
        var cart = await _dbSet.FirstOrDefaultAsync(c => c.UserId == userId);
        if (cart == null)
            return null;

        var items = await _context.CartItems
            .Include(i => i.Product).ThenInclude(p => p.Category)
            .Include(i => i.Product).ThenInclude(p => p.Brand)
            .Where(i => i.CartId == cart.Id)
            .OrderBy(i => i.Id)
            .ToListAsync();

        cart.Items = items;
        return cart;
    }
}
