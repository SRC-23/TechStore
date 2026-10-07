namespace TechStore.Core.Services.PricingEngine;

public class PricingResult
{
    public decimal TotalDiscount { get; set; }
    public List<DiscountDetail> AppliedDiscounts { get; set; } = new();
}

public class DiscountDetail
{
    public Guid RuleId { get; set; }
    public string RuleName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal DiscountAmount { get; set; }
}
