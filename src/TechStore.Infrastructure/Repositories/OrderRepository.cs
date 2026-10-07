using Microsoft.EntityFrameworkCore;
using TechStore.Core.Entities;
using TechStore.Core.Interfaces;
using TechStore.Infrastructure.Data;

namespace TechStore.Infrastructure.Repositories;

public class OrderRepository : Repository<Order>, IOrderRepository
{
    public OrderRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<Order>> GetByUserIdAsync(Guid userId)
    {
        return await _dbSet
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
            .Include(o => o.AppliedDiscounts)
            .Include(o => o.Address)
            .Where(o => o.UserId == userId)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
    }

    public async Task<Order?> GetWithDetailsAsync(Guid orderId)
    {
        return await _dbSet
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
            .Include(o => o.AppliedDiscounts)
            .Include(o => o.Address)
            .Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == orderId);
    }

    public async Task<IEnumerable<Order>> GetAllWithDetailsAsync()
    {
        return await _dbSet
            .Include(o => o.Items)
                .ThenInclude(i => i.Product)
            .Include(o => o.AppliedDiscounts)
            .Include(o => o.Address)
            .Include(o => o.User)
            .OrderByDescending(o => o.CreatedAt)
            .ToListAsync();
    }

    public async Task<string> GenerateOrderNumberAsync()
    {
        var count = await _dbSet.CountAsync();
        return $"TS-{DateTime.UtcNow:yyyyMMdd}-{(count + 1):D4}";
    }
}
