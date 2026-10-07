using TechStore.Core.Entities;
using TechStore.Core.Enums;
using TechStore.Core.Interfaces;
using TechStore.Core.Services.PricingEngine;

namespace TechStore.Infrastructure.Services.PricingEngine;

/// <summary>
/// Motor de precios: evalúa todas las reglas de descuento activas contra el
/// carrito y decide cuáles aplicar según prioridad y acumulabilidad.
/// Implementa el patrón Strategy: cada tipo de descuento tiene su propio
/// método de evaluación.
/// </summary>
public class PricingEngine : IPricingEngine
{
    private readonly IUnitOfWork _unitOfWork;

    public PricingEngine(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<PricingResult> CalculateAsync(ShoppingCart cart)
    {
        var result = new PricingResult();

        // Solo se consideran items cuyo Producto esté cargado; así ninguna
        // evaluación puede lanzar NullReferenceException.
        var items = cart.Items.Where(i => i.Product != null).ToList();

        if (items.Count == 0)
            return result;

        var subtotal = items.Sum(i => i.Product.Price * i.Quantity);
        if (subtotal <= 0)
            return result;

        var activeRules = (await _unitOfWork.DiscountRules.GetActiveRulesAsync()).ToList();

        var applicableRules = new List<(DiscountRule Rule, decimal Discount, string Description)>();

        foreach (var rule in activeRules)
        {
            var (applies, discount, description) = EvaluateRule(rule, cart, items, subtotal);
            if (applies && discount > 0)
                applicableRules.Add((rule, discount, description));
        }

        // Cupón: se evalúa aparte porque no siempre aparece en las reglas activas.
        if (!string.IsNullOrWhiteSpace(cart.CouponCode))
        {
            var couponRule = await _unitOfWork.DiscountRules.GetByCouponCodeAsync(cart.CouponCode);
            if (couponRule != null && applicableRules.All(r => r.Rule.Id != couponRule.Id))
            {
                var (applies, discount, description) = EvaluateRule(couponRule, cart, items, subtotal);
                if (applies && discount > 0)
                    applicableRules.Add((couponRule, discount, description));
            }
        }

        // Prioridad 1 = mayor precedencia.
        applicableRules = applicableRules.OrderBy(r => r.Rule.Priority).ToList();

        decimal totalDiscount = 0;

        foreach (var (rule, discount, description) in applicableRules)
        {
            // El descuento nunca puede exceder lo que queda por descontar.
            // Se redondea cada línea a colones enteros para que la suma del
            // desglose coincida exactamente con el total mostrado al cliente.
            var actualDiscount = decimal.Round(
                Math.Min(discount, subtotal - totalDiscount), 0, MidpointRounding.AwayFromZero);
            if (actualDiscount <= 0)
                break;

            totalDiscount += actualDiscount;

            result.AppliedDiscounts.Add(new DiscountDetail
            {
                RuleId = rule.Id,
                RuleName = rule.Name,
                Description = description,
                DiscountAmount = actualDiscount
            });

            // Una regla no acumulable se aplica sola: se detiene la evaluación.
            if (!rule.IsStackable)
                break;
        }

        result.TotalDiscount = decimal.Round(totalDiscount, 2);
        return result;
    }

    private (bool Applies, decimal Discount, string Description) EvaluateRule(
        DiscountRule rule, ShoppingCart cart, List<CartItem> items, decimal subtotal)
    {
        return rule.Type switch
        {
            DiscountType.Percentage => EvaluatePercentageRule(rule, items, subtotal),
            DiscountType.FixedAmount => EvaluateFixedAmountRule(rule, subtotal),
            DiscountType.Coupon => EvaluateCouponRule(rule, cart, subtotal),
            DiscountType.Volume => EvaluateVolumeRule(rule, items),
            DiscountType.TimeLimited => EvaluateTimeLimitedRule(rule, items, subtotal),
            DiscountType.Category => EvaluateCategoryRule(rule, items),
            DiscountType.Bundle => EvaluateBundleRule(rule, items),
            _ => (false, 0, "")
        };
    }

    private (bool, decimal, string) EvaluatePercentageRule(DiscountRule rule, List<CartItem> items, decimal subtotal)
    {
        if (rule.MinimumAmount.HasValue && subtotal < rule.MinimumAmount.Value)
            return (false, 0, "");

        var applicableAmount = GetApplicableAmount(rule, items, subtotal);

        if (applicableAmount <= 0)
            return (false, 0, "");

        var discount = applicableAmount * (rule.Value / 100m);
        return (true, discount, $"{Percent(rule.Value)}% de descuento - {rule.Name}");
    }

    private (bool, decimal, string) EvaluateFixedAmountRule(DiscountRule rule, decimal subtotal)
    {
        if (rule.MinimumAmount.HasValue && subtotal < rule.MinimumAmount.Value)
            return (false, 0, "");

        return (true, rule.Value, $"{Money(rule.Value)} de descuento - {rule.Name}");
    }

    private (bool, decimal, string) EvaluateCouponRule(DiscountRule rule, ShoppingCart cart, decimal subtotal)
    {
        if (!string.Equals(cart.CouponCode, rule.CouponCode, StringComparison.OrdinalIgnoreCase))
            return (false, 0, "");

        if (rule.MaxUses.HasValue && rule.TimesUsed >= rule.MaxUses.Value)
            return (false, 0, "");

        if (rule.MinimumAmount.HasValue && subtotal < rule.MinimumAmount.Value)
            return (false, 0, "");

        if (rule.IsPercentage)
            return (true, subtotal * (rule.Value / 100m), $"Cupón {rule.CouponCode}: {Percent(rule.Value)}% de descuento");

        return (true, rule.Value, $"Cupón {rule.CouponCode}: {Money(rule.Value)} de descuento");
    }

    private (bool, decimal, string) EvaluateVolumeRule(DiscountRule rule, List<CartItem> items)
    {
        if (!rule.MinimumQuantity.HasValue)
            return (false, 0, "");

        decimal totalDiscount = 0;
        var productIds = rule.DiscountRuleProducts.Select(p => p.ProductId).ToHashSet();

        foreach (var item in items)
        {
            if (productIds.Any() && !productIds.Contains(item.ProductId))
                continue;

            if (item.Quantity < rule.MinimumQuantity.Value)
                continue;

            var itemTotal = item.Product.Price * item.Quantity;
            totalDiscount += rule.IsPercentage
                ? itemTotal * (rule.Value / 100m)
                : rule.Value;
        }

        if (totalDiscount <= 0)
            return (false, 0, "");

        var label = Label(rule);
        return (true, totalDiscount, $"Descuento por volumen ({rule.MinimumQuantity}+ unidades): {label} off");
    }

    private (bool, decimal, string) EvaluateTimeLimitedRule(DiscountRule rule, List<CartItem> items, decimal subtotal)
    {
        var now = DateTime.UtcNow;
        if (now < rule.StartDate || now > rule.EndDate)
            return (false, 0, "");

        if (rule.MinimumAmount.HasValue && subtotal < rule.MinimumAmount.Value)
            return (false, 0, "");

        var applicableAmount = GetApplicableAmount(rule, items, subtotal);

        if (applicableAmount <= 0)
            return (false, 0, "");

        var discount = rule.IsPercentage
            ? applicableAmount * (rule.Value / 100m)
            : rule.Value;

        return (true, discount, $"Oferta limitada: {rule.Name}");
    }

    /// <summary>
    /// Monto sobre el que aplica una regla: si está limitada a productos y/o
    /// categorías, solo cuentan esos ítems; si no, todo el subtotal.
    /// </summary>
    private static decimal GetApplicableAmount(DiscountRule rule, List<CartItem> items, decimal subtotal)
    {
        var productIds = rule.DiscountRuleProducts.Select(p => p.ProductId).ToHashSet();
        var categoryIds = rule.DiscountRuleCategories.Select(c => c.CategoryId).ToHashSet();

        if (productIds.Count == 0 && categoryIds.Count == 0)
            return subtotal;

        return items
            .Where(i => productIds.Contains(i.ProductId) || categoryIds.Contains(i.Product.CategoryId))
            .Sum(i => i.Product.Price * i.Quantity);
    }

    private (bool, decimal, string) EvaluateCategoryRule(DiscountRule rule, List<CartItem> items)
    {
        var categoryIds = rule.DiscountRuleCategories.Select(c => c.CategoryId).ToHashSet();
        if (categoryIds.Count == 0)
            return (false, 0, "");

        var applicableAmount = items
            .Where(i => categoryIds.Contains(i.Product.CategoryId))
            .Sum(i => i.Product.Price * i.Quantity);

        if (applicableAmount <= 0)
            return (false, 0, "");

        var discount = rule.IsPercentage
            ? applicableAmount * (rule.Value / 100m)
            : rule.Value;

        var label = Label(rule);
        return (true, discount, $"{label} en categoría - {rule.Name}");
    }

    private (bool, decimal, string) EvaluateBundleRule(DiscountRule rule, List<CartItem> items)
    {
        var bundleProductIds = rule.DiscountRuleProducts.Select(p => p.ProductId).ToHashSet();
        if (bundleProductIds.Count == 0)
            return (false, 0, "");

        var cartProductIds = items.Select(i => i.ProductId).ToHashSet();

        // El combo solo aplica si el carrito contiene TODOS sus productos.
        if (!bundleProductIds.All(cartProductIds.Contains))
            return (false, 0, "");

        var bundleTotal = items
            .Where(i => bundleProductIds.Contains(i.ProductId))
            .Sum(i => i.Product.Price * i.Quantity);

        if (bundleTotal <= 0)
            return (false, 0, "");

        var discount = rule.IsPercentage
            ? bundleTotal * (rule.Value / 100m)
            : rule.Value;

        var label = Label(rule);
        return (true, discount, $"Combo: {rule.Name} - {label} off");
    }

    // ---------- Formato de las descripciones ----------

    private static readonly System.Globalization.CultureInfo Invariant = System.Globalization.CultureInfo.InvariantCulture;

    /// <summary>10.00 → "10"; 12.5 → "12.5" (la columna guarda 2 decimales).</summary>
    private static string Percent(decimal value) => value.ToString("0.##", Invariant);

    /// <summary>25000 → "₡25 000".</summary>
    private static string Money(decimal value) => "₡" + value.ToString("#,0", Invariant).Replace(",", " ");

    private static string Label(DiscountRule rule) => rule.IsPercentage ? $"{Percent(rule.Value)}%" : Money(rule.Value);
}
