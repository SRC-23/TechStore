using TechStore.Core.Entities;

namespace TechStore.Core.Interfaces;

public interface IDiscountRuleRepository : IRepository<DiscountRule>
{
    Task<IEnumerable<DiscountRule>> GetActiveRulesAsync();
    Task<DiscountRule?> GetByCouponCodeAsync(string couponCode);
    Task<DiscountRule?> GetWithDetailsAsync(Guid id);
    Task<IEnumerable<DiscountRule>> GetAllWithDetailsAsync();
}
