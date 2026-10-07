namespace TechStore.Core.Entities;

public class AppliedDiscount
{
    public Guid Id { get; set; }
    public Guid OrderId { get; set; }
    public Guid RuleId { get; set; }
    public decimal DiscountAmount { get; set; }
    public string Description { get; set; } = string.Empty;
    public DateTime AppliedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public Order Order { get; set; } = null!;
    public DiscountRule Rule { get; set; } = null!;
}
