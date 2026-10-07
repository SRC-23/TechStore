using TechStore.Core.Entities;
using TechStore.Core.Enums;

namespace TechStore.Core.Services.PricingEngine;

/// <summary>
/// Precio con descuento que se muestra en el catálogo para una unidad de un producto.
/// </summary>
public class ProductOffer
{
    public decimal DiscountedPrice { get; set; }
    public int DiscountPercentage { get; set; }
    public bool IsOnSale { get; set; }
    public DateTime? OfferEndsAt { get; set; }
    public string? OfferName { get; set; }
}

/// <summary>
/// Calcula el precio "de vitrina" de un producto (HU-04, HU-07, HU-13).
///
/// Solo considera reglas que aplican a una unidad sin condiciones del carrito:
/// porcentuales de tipo Percentage, Category o TimeLimited, sin monto ni cantidad
/// mínima y sin cupón. Sigue el mismo orden que el motor del carrito: prioridad
/// ascendente, y una regla no acumulable detiene la evaluación.
/// </summary>
public static class ProductOfferCalculator
{
    private static readonly DiscountType[] CatalogTypes =
        { DiscountType.Percentage, DiscountType.Category, DiscountType.TimeLimited };

    public static ProductOffer? Calculate(Product product, IEnumerable<DiscountRule> activeRules, DateTime nowUtc)
    {
        if (product.Price <= 0)
            return null;

        var applicable = activeRules
            .Where(r => r.IsActive && r.StartDate <= nowUtc && r.EndDate >= nowUtc)
            .Where(r => CatalogTypes.Contains(r.Type) && r.IsPercentage)
            .Where(r => string.IsNullOrEmpty(r.CouponCode) && !r.MinimumAmount.HasValue && !r.MinimumQuantity.HasValue)
            .Where(r => AppliesTo(r, product))
            .OrderBy(r => r.Priority)
            .ToList();

        if (applicable.Count == 0)
            return null;

        decimal discount = 0;
        DiscountRule? saleRule = null;

        foreach (var rule in applicable)
        {
            var amount = decimal.Round(product.Price * (rule.Value / 100m), 0, MidpointRounding.AwayFromZero);
            discount += Math.Min(amount, product.Price - discount);

            if (rule.Type == DiscountType.TimeLimited && (saleRule == null || rule.EndDate < saleRule.EndDate))
                saleRule = rule;

            if (!rule.IsStackable || discount >= product.Price)
                break;
        }

        if (discount <= 0)
            return null;

        return new ProductOffer
        {
            DiscountedPrice = product.Price - discount,
            DiscountPercentage = (int)Math.Round(discount / product.Price * 100m, MidpointRounding.AwayFromZero),
            IsOnSale = saleRule != null,
            OfferEndsAt = saleRule?.EndDate,
            OfferName = saleRule?.Name
        };
    }

    private static bool AppliesTo(DiscountRule rule, Product product)
    {
        var productIds = rule.DiscountRuleProducts.Select(p => p.ProductId).ToHashSet();
        var categoryIds = rule.DiscountRuleCategories.Select(c => c.CategoryId).ToHashSet();

        // Una regla por categoría sin categorías configuradas no aplica a nada.
        if (rule.Type == DiscountType.Category && categoryIds.Count == 0)
            return false;

        if (productIds.Count == 0 && categoryIds.Count == 0)
            return true;

        return productIds.Contains(product.Id) || categoryIds.Contains(product.CategoryId);
    }
}
