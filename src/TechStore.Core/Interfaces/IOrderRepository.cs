using TechStore.Core.Entities;

namespace TechStore.Core.Interfaces;

public interface IOrderRepository : IRepository<Order>
{
    Task<IEnumerable<Order>> GetByUserIdAsync(Guid userId);
    Task<IEnumerable<Order>> GetAllWithDetailsAsync();
    Task<Order?> GetWithDetailsAsync(Guid orderId);
    Task<string> GenerateOrderNumberAsync();
}
