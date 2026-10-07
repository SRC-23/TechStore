using TechStore.Core.Entities;

namespace TechStore.Core.Interfaces;

public interface ICartRepository : IRepository<ShoppingCart>
{
    Task<ShoppingCart?> GetByUserIdWithItemsAsync(Guid userId);
}
