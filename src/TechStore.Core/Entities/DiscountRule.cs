using TechStore.Core.Enums;

namespace TechStore.Core.Entities;

public class DiscountRule
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DiscountType Type { get; set; }
    public decimal Value { get; set; }
    public bool IsPercentage { get; set; }
    public string? CouponCode { get; set; }
    public int Priority { get; set; }
    public bool IsStackable { get; set; } = false;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal? MinimumAmount { get; set; }
    public int? MinimumQuantity { get; set; }
    public bool IsActive { get; set; } = true;
    public int TimesUsed { get; set; } = 0;
    public int? MaxUses { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<DiscountCondition> Conditions { get; set; } = new List<DiscountCondition>();
    public ICollection<DiscountRuleProduct> DiscountRuleProducts { get; set; } = new List<DiscountRuleProduct>();
    public ICollection<DiscountRuleCategory> DiscountRuleCategories { get; set; } = new List<DiscountRuleCategory>();
}
