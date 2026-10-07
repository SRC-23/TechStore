using Microsoft.EntityFrameworkCore;
using TechStore.Core.Entities;
using TechStore.Core.Interfaces;
using TechStore.Infrastructure.Data;

namespace TechStore.Infrastructure.Repositories;

public class DiscountRuleRepository : Repository<DiscountRule>, IDiscountRuleRepository
{
    public DiscountRuleRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<DiscountRule>> GetActiveRulesAsync()
    {
        var now = DateTime.UtcNow;
        return await _dbSet
            .Include(r => r.Conditions)
            .Include(r => r.DiscountRuleProducts)
            .Include(r => r.DiscountRuleCategories)
            .Where(r => r.IsActive && r.StartDate <= now && r.EndDate >= now)
            .OrderBy(r => r.Priority)
            .ToListAsync();
    }

    /// <summary>
    /// Busca una regla por su código de cupón. Incluye productos y categorías
    /// porque el motor de precios los necesita para evaluar la regla; sin ellos
    /// un cupón limitado a categorías nunca aplicaría.
    /// La comparación es insensible a mayúsculas/minúsculas.
    /// </summary>
    public async Task<DiscountRule?> GetByCouponCodeAsync(string couponCode)
    {
        if (string.IsNullOrWhiteSpace(couponCode))
            return null;

        var normalized = couponCode.Trim().ToUpper();

        return await _dbSet
            .Include(r => r.Conditions)
            .Include(r => r.DiscountRuleProducts)
            .Include(r => r.DiscountRuleCategories)
            .FirstOrDefaultAsync(r => r.CouponCode != null
                                   && r.CouponCode.ToUpper() == normalized
                                   && r.IsActive);
    }

    public async Task<DiscountRule?> GetWithDetailsAsync(Guid id)
    {
        return await _dbSet
            .Include(r => r.Conditions)
            .Include(r => r.DiscountRuleProducts)
            .Include(r => r.DiscountRuleCategories)
            .FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<IEnumerable<DiscountRule>> GetAllWithDetailsAsync()
    {
        return await _dbSet
            .Include(r => r.DiscountRuleProducts)
            .Include(r => r.DiscountRuleCategories)
            .OrderBy(r => r.Priority)
            .ToListAsync();
    }
}
