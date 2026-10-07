namespace TechStore.Core.Entities;

public class DiscountRuleProduct
{
    public Guid RuleId { get; set; }
    public Guid ProductId { get; set; }

    // Navigation properties
    public DiscountRule Rule { get; set; } = null!;
    public Product Product { get; set; } = null!;
}
