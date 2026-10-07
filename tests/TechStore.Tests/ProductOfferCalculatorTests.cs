using TechStore.Core.Entities;
using TechStore.Core.Enums;
using TechStore.Core.Services.PricingEngine;
using Xunit;

namespace TechStore.Tests;

/// <summary>
/// Pruebas del precio de vitrina que se muestra en catálogo y detalle (HU-04, HU-07, HU-13).
/// </summary>
public class ProductOfferCalculatorTests
{
    private static readonly DateTime Now = new(2026, 10, 5, 12, 0, 0, DateTimeKind.Utc);

    private static Product NewProduct(decimal price, Guid? categoryId = null) => new()
    {
        Id = Guid.NewGuid(),
        Name = "Producto",
        Price = price,
        CategoryId = categoryId ?? Guid.NewGuid()
    };

    private static DiscountRule NewRule(DiscountType type, decimal value, int priority = 1, bool stackable = true,
                                        int daysLeft = 10) => new()
    {
        Id = Guid.NewGuid(),
        Name = $"Regla {type}",
        Type = type,
        Value = value,
        IsPercentage = true,
        Priority = priority,
        IsStackable = stackable,
        StartDate = Now.AddDays(-1),
        EndDate = Now.AddDays(daysLeft),
        IsActive = true
    };

    [Fact]
    public void SinReglas_NoHayOferta()
    {
        Assert.Null(ProductOfferCalculator.Calculate(NewProduct(59900), new List<DiscountRule>(), Now));
    }

    [Fact]
    public void ReglaPorCategoria_CalculaPrecioRebajado()
    {
        var categoria = Guid.NewGuid();
        var rule = NewRule(DiscountType.Category, 10);
        rule.DiscountRuleCategories.Add(new DiscountRuleCategory { RuleId = rule.Id, CategoryId = categoria });

        var offer = ProductOfferCalculator.Calculate(NewProduct(59900, categoria), new[] { rule }, Now);

        Assert.NotNull(offer);
        Assert.Equal(53910m, offer!.DiscountedPrice);
        Assert.Equal(10, offer.DiscountPercentage);
        Assert.False(offer.IsOnSale);
    }

    [Fact]
    public void OfertaTemporal_MarcaOfertaYFechaDeFin()
    {
        var product = NewProduct(69900);
        var rule = NewRule(DiscountType.TimeLimited, 15, daysLeft: 3);
        rule.DiscountRuleProducts.Add(new DiscountRuleProduct { RuleId = rule.Id, ProductId = product.Id });

        var offer = ProductOfferCalculator.Calculate(product, new[] { rule }, Now);

        Assert.NotNull(offer);
        Assert.True(offer!.IsOnSale);
        Assert.Equal(rule.EndDate, offer.OfferEndsAt);
        Assert.Equal(59415m, offer.DiscountedPrice);
    }

    [Fact]
    public void OfertaVencida_NoAplica()
    {
        var product = NewProduct(69900);
        var rule = NewRule(DiscountType.TimeLimited, 15, daysLeft: -1);
        rule.DiscountRuleProducts.Add(new DiscountRuleProduct { RuleId = rule.Id, ProductId = product.Id });

        Assert.Null(ProductOfferCalculator.Calculate(product, new[] { rule }, Now));
    }

    [Fact]
    public void CuponesYReglasConMontoMinimo_NoSeMuestranEnVitrina()
    {
        var cupon = NewRule(DiscountType.Coupon, 20);
        cupon.CouponCode = "TECH20";
        var minimo = NewRule(DiscountType.Percentage, 5, priority: 2);
        minimo.MinimumAmount = 100000;

        Assert.Null(ProductOfferCalculator.Calculate(NewProduct(59900), new[] { cupon, minimo }, Now));
    }

    [Fact]
    public void ReglaNoAcumulable_DetieneLaSuma()
    {
        var product = NewProduct(100000);
        var primera = NewRule(DiscountType.Percentage, 10, priority: 1, stackable: false);
        var segunda = NewRule(DiscountType.Percentage, 5, priority: 2);

        var offer = ProductOfferCalculator.Calculate(product, new[] { segunda, primera }, Now);

        Assert.Equal(90000m, offer!.DiscountedPrice);
    }
}
