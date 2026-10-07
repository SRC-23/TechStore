using TechStore.Core.Enums;

namespace TechStore.Core.Entities;

public class DiscountCondition
{
    public Guid Id { get; set; }
    public Guid RuleId { get; set; }
    public ConditionType ConditionType { get; set; }
    public string Value { get; set; } = string.Empty;
    public ConditionOperator Operator { get; set; }

    // Navigation properties
    public DiscountRule Rule { get; set; } = null!;
}
