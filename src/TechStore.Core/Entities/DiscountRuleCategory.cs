namespace TechStore.Core.Entities;

public class DiscountRuleCategory
{
    public Guid RuleId { get; set; }
    public Guid CategoryId { get; set; }

    // Navigation properties
    public DiscountRule Rule { get; set; } = null!;
    public Category Category { get; set; } = null!;
}
