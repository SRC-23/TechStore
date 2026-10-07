using TechStore.Core.Enums;

namespace TechStore.API.DTOs.PricingRules;

public class PricingRuleDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DiscountType Type { get; set; }
    public decimal Value { get; set; }
    public bool IsPercentage { get; set; }
    public string? CouponCode { get; set; }
    public int Priority { get; set; }
    public bool IsStackable { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal? MinimumAmount { get; set; }
    public int? MinimumQuantity { get; set; }
    public bool IsActive { get; set; }
    public int TimesUsed { get; set; }
    public int? MaxUses { get; set; }
    public List<Guid> ProductIds { get; set; } = new();
    public List<Guid> CategoryIds { get; set; } = new();
}

public class CreatePricingRuleRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DiscountType Type { get; set; }
    public decimal Value { get; set; }
    public bool IsPercentage { get; set; }
    public string? CouponCode { get; set; }
    public int Priority { get; set; } = 1;
    public bool IsStackable { get; set; } = false;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public decimal? MinimumAmount { get; set; }
    public int? MinimumQuantity { get; set; }
    public int? MaxUses { get; set; }
    public List<Guid> ProductIds { get; set; } = new();
    public List<Guid> CategoryIds { get; set; } = new();
}
