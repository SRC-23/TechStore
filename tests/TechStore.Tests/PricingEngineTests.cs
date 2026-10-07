using Moq;
using TechStore.Core.Entities;
using TechStore.Core.Enums;
using TechStore.Core.Interfaces;
using Xunit;
using Engine = global::TechStore.Infrastructure.Services.PricingEngine.PricingEngine;

namespace TechStore.Tests;

/// <summary>
/// Pruebas unitarias del motor de precios (el "core" del proyecto).
/// Se usan mocks de IUnitOfWork para no depender de la base de datos.
/// </summary>
public class PricingEngineTests
{
    private readonly Mock<IUnitOfWork> _unitOfWork = new();
    private readonly Mock<IDiscountRuleRepository> _rules = new();

    public PricingEngineTests()
    {
        _unitOfWork.Setup(u => u.DiscountRules).Returns(_rules.Object);
    }

    // ---------- Helpers ----------

    private Engine BuildEngine(params DiscountRule[] activeRules)
    {
        _rules.Setup(r => r.GetActiveRulesAsync())
              .ReturnsAsync(activeRules.ToList());
        _rules.Setup(r => r.GetByCouponCodeAsync(It.IsAny<string>()))
              .ReturnsAsync((DiscountRule?)null);
        return new Engine(_unitOfWork.Object);
    }

    private static Product NewProduct(decimal price, Guid? categoryId = null) => new()
    {
        Id = Guid.NewGuid(),
        Name = "Producto de prueba",
        Price = price,
        Stock = 100,
        CategoryId = categoryId ?? Guid.NewGuid(),
        BrandId = Guid.NewGuid()
    };

    private static ShoppingCart CartWith(params (Product Product, int Quantity)[] entries)
    {
        var cart = new ShoppingCart { Id = Guid.NewGuid(), UserId = Guid.NewGuid() };
        foreach (var (product, quantity) in entries)
        {
            cart.Items.Add(new CartItem
            {
                Id = Guid.NewGuid(),
                CartId = cart.Id,
                ProductId = product.Id,
                Product = product,
                Quantity = quantity
            });
        }
        return cart;
    }

    private static DiscountRule NewRule(
        DiscountType type,
        decimal value,
        bool isPercentage = true,
        int priority = 1,
        bool isStackable = true,
        decimal? minimumAmount = null,
        int? minimumQuantity = null,
        string? couponCode = null,
        int? maxUses = null,
        int timesUsed = 0) => new()
    {
        Id = Guid.NewGuid(),
        Name = $"Regla {type}",
        Type = type,
        Value = value,
        IsPercentage = isPercentage,
        Priority = priority,
        IsStackable = isStackable,
        MinimumAmount = minimumAmount,
        MinimumQuantity = minimumQuantity,
        CouponCode = couponCode,
        MaxUses = maxUses,
        TimesUsed = timesUsed,
        StartDate = DateTime.UtcNow.AddDays(-1),
        EndDate = DateTime.UtcNow.AddDays(30),
        IsActive = true
    };

    // ---------- Casos base ----------

    [Fact]
    public async Task CarritoVacio_NoAplicaDescuentos()
    {
        var engine = BuildEngine(NewRule(DiscountType.Percentage, 10));
        var cart = new ShoppingCart { Id = Guid.NewGuid(), UserId = Guid.NewGuid() };

        var result = await engine.CalculateAsync(cart);

        Assert.Equal(0, result.TotalDiscount);
        Assert.Empty(result.AppliedDiscounts);
    }

    [Fact]
    public async Task ItemsConProductoNulo_SeIgnoran_YNoLanzaExcepcion()
    {
        // Este era el origen del error 500 al agregar al carrito: un CartItem
        // sin Product cargado hacía que el motor lanzara NullReferenceException.
        var engine = BuildEngine(NewRule(DiscountType.Percentage, 10));
        var cart = new ShoppingCart { Id = Guid.NewGuid(), UserId = Guid.NewGuid() };
        cart.Items.Add(new CartItem
        {
            Id = Guid.NewGuid(),
            ProductId = Guid.NewGuid(),
            Quantity = 2,
            Product = null!
        });

        var result = await engine.CalculateAsync(cart);

        Assert.Equal(0, result.TotalDiscount);
    }

    [Fact]
    public async Task SinReglasActivas_NoAplicaDescuentos()
    {
        var engine = BuildEngine();
        var cart = CartWith((NewProduct(500m), 1));

        var result = await engine.CalculateAsync(cart);

        Assert.Equal(0, result.TotalDiscount);
    }

    // ---------- Porcentaje ----------

    [Fact]
    public async Task DescuentoPorcentaje_CalculaSobreElSubtotal()
    {
        var engine = BuildEngine(NewRule(DiscountType.Percentage, 10));
        var cart = CartWith((NewProduct(1000m), 1));

        var result = await engine.CalculateAsync(cart);

        Assert.Equal(100m, result.TotalDiscount);
        Assert.Single(result.AppliedDiscounts);
    }

    [Fact]
    public async Task DescuentoPorcentaje_NoAplicaSiNoAlcanzaElMontoMinimo()
    {
        var engine = BuildEngine(NewRule(DiscountType.Percentage, 10, minimumAmount: 500m));
        var cart = CartWith((NewProduct(100m), 1));

        var result = await engine.CalculateAsync(cart);

        Assert.Equal(0, result.TotalDiscount);
    }

    // ---------- Monto fijo ----------

    [Fact]
    public async Task DescuentoMontoFijo_AplicaAlSuperarElMinimo()
    {
        var engine = BuildEngine(
            NewRule(DiscountType.FixedAmount, 50m, isPercentage: false, minimumAmount: 500m));
        var cart = CartWith((NewProduct(600m), 1));

        var result = await engine.CalculateAsync(cart);

        Assert.Equal(50m, result.TotalDiscount);
    }

    // ---------- Volumen ----------

    [Fact]
    public async Task DescuentoPorVolumen_AplicaAlAlcanzarLaCantidadMinima()
    {
        var engine = BuildEngine(NewRule(DiscountType.Volume, 15, minimumQuantity: 3));
        var cart = CartWith((NewProduct(100m), 3));   // subtotal 300

        var result = await engine.CalculateAsync(cart);

        Assert.Equal(45m, result.TotalDiscount);
    }

    [Fact]
    public async Task DescuentoPorVolumen_NoAplicaConCantidadInsuficiente()
    {
        var engine = BuildEngine(NewRule(DiscountType.Volume, 15, minimumQuantity: 3));
        var cart = CartWith((NewProduct(100m), 2));

        var result = await engine.CalculateAsync(cart);

        Assert.Equal(0, result.TotalDiscount);
    }

    // ---------- Categoría ----------

    [Fact]
    public async Task DescuentoPorCategoria_SoloAfectaProductosDeEsaCategoria()
    {
        var categoriaId = Guid.NewGuid();
        var rule = NewRule(DiscountType.Category, 10);
        rule.DiscountRuleCategories.Add(new DiscountRuleCategory
        {
            RuleId = rule.Id,
            CategoryId = categoriaId
        });

        var engine = BuildEngine(rule);
        var cart = CartWith(
            (NewProduct(200m, categoriaId), 1),     // sí aplica -> 20
            (NewProduct(800m, Guid.NewGuid()), 1)); // no aplica

        var result = await engine.CalculateAsync(cart);

        Assert.Equal(20m, result.TotalDiscount);
    }

    [Fact]
    public async Task DescuentoPorCategoria_SinCategoriasConfiguradas_NoAplica()
    {
        var engine = BuildEngine(NewRule(DiscountType.Category, 10));
        var cart = CartWith((NewProduct(500m), 1));

        var result = await engine.CalculateAsync(cart);

        Assert.Equal(0, result.TotalDiscount);
    }

    [Fact]
    public async Task ElDesgloseSumaExactamenteElTotal()
    {
        // 3 x 99.99: categoría 10% (29.997) + volumen 15% (44.9955).
        var categoriaId = Guid.NewGuid();
        var categoria = NewRule(DiscountType.Category, 10, priority: 1);
        categoria.DiscountRuleCategories.Add(new DiscountRuleCategory { RuleId = categoria.Id, CategoryId = categoriaId });

        var engine = BuildEngine(categoria, NewRule(DiscountType.Volume, 15, priority: 2, minimumQuantity: 3));
        var result = await engine.CalculateAsync(CartWith((NewProduct(99.99m, categoriaId), 3)));

        Assert.Equal(75.00m, result.TotalDiscount);
        Assert.Equal(result.TotalDiscount, result.AppliedDiscounts.Sum(d => d.DiscountAmount));
    }

    // ---------- Oferta por tiempo limitado ----------

    [Fact]
    public async Task OfertaTemporalPorCategoria_SoloAfectaEsaCategoria()
    {
        var laptops = Guid.NewGuid();
        var rule = NewRule(DiscountType.TimeLimited, 5);
        rule.DiscountRuleCategories.Add(new DiscountRuleCategory { RuleId = rule.Id, CategoryId = laptops });

        var engine = BuildEngine(rule);
        var cart = CartWith(
            (NewProduct(1000m, laptops), 1),        // sí aplica -> 50
            (NewProduct(400m, Guid.NewGuid()), 1)); // no aplica

        var result = await engine.CalculateAsync(cart);

        Assert.Equal(50m, result.TotalDiscount);
    }

    [Fact]
    public async Task OfertaTemporalVencida_NoAplica()
    {
        var rule = NewRule(DiscountType.TimeLimited, 5);
        rule.StartDate = DateTime.UtcNow.AddDays(-10);
        rule.EndDate = DateTime.UtcNow.AddDays(-1);

        var engine = BuildEngine(rule);
        var result = await engine.CalculateAsync(CartWith((NewProduct(1000m), 1)));

        Assert.Equal(0, result.TotalDiscount);
    }

    // ---------- Cupones ----------

    [Fact]
    public async Task Cupon_AplicaCuandoElCodigoCoincide()
    {
        var rule = NewRule(DiscountType.Coupon, 20, couponCode: "TECH20", minimumAmount: 100m);
        var engine = BuildEngine(rule);
        var cart = CartWith((NewProduct(500m), 1));
        cart.CouponCode = "TECH20";

        var result = await engine.CalculateAsync(cart);

        Assert.Equal(100m, result.TotalDiscount);
    }

    [Fact]
    public async Task Cupon_IgnoraMayusculasYMinusculas()
    {
        var rule = NewRule(DiscountType.Coupon, 20, couponCode: "TECH20");
        var engine = BuildEngine(rule);
        var cart = CartWith((NewProduct(500m), 1));
        cart.CouponCode = "tech20";

        var result = await engine.CalculateAsync(cart);

        Assert.Equal(100m, result.TotalDiscount);
    }

    [Fact]
    public async Task Cupon_NoAplicaSiSeAgotaronLosUsos()
    {
        var rule = NewRule(DiscountType.Coupon, 20, couponCode: "TECH20",
                           maxUses: 5, timesUsed: 5);
        var engine = BuildEngine(rule);
        var cart = CartWith((NewProduct(500m), 1));
        cart.CouponCode = "TECH20";

        var result = await engine.CalculateAsync(cart);

        Assert.Equal(0, result.TotalDiscount);
    }

    [Fact]
    public async Task Cupon_NoAplicaSiElCodigoNoCoincide()
    {
        var rule = NewRule(DiscountType.Coupon, 20, couponCode: "TECH20");
        var engine = BuildEngine(rule);
        var cart = CartWith((NewProduct(500m), 1));
        cart.CouponCode = "OTRO";

        var result = await engine.CalculateAsync(cart);

        Assert.Equal(0, result.TotalDiscount);
    }

    // ---------- Combo (Bundle) ----------

    [Fact]
    public async Task Combo_AplicaSoloSiEstanTodosLosProductos()
    {
        var p1 = NewProduct(100m);
        var p2 = NewProduct(200m);

        var rule = NewRule(DiscountType.Bundle, 10);
        rule.DiscountRuleProducts.Add(new DiscountRuleProduct { RuleId = rule.Id, ProductId = p1.Id });
        rule.DiscountRuleProducts.Add(new DiscountRuleProduct { RuleId = rule.Id, ProductId = p2.Id });

        var engine = BuildEngine(rule);

        // Carrito completo: 10% de 300 = 30
        var resultCompleto = await engine.CalculateAsync(CartWith((p1, 1), (p2, 1)));
        Assert.Equal(30m, resultCompleto.TotalDiscount);

        // Carrito incompleto: no aplica
        var resultIncompleto = await engine.CalculateAsync(CartWith((p1, 1)));
        Assert.Equal(0, resultIncompleto.TotalDiscount);
    }

    // ---------- Acumulabilidad y prioridad ----------

    [Fact]
    public async Task ReglasAcumulables_SeSuman()
    {
        var engine = BuildEngine(
            NewRule(DiscountType.Percentage, 10, priority: 1, isStackable: true),
            NewRule(DiscountType.FixedAmount, 50m, isPercentage: false, priority: 2, isStackable: true));

        var cart = CartWith((NewProduct(1000m), 1));

        var result = await engine.CalculateAsync(cart);

        Assert.Equal(150m, result.TotalDiscount);   // 100 + 50
        Assert.Equal(2, result.AppliedDiscounts.Count);
    }

    [Fact]
    public async Task ReglaNoAcumulable_SeAplicaSola()
    {
        var engine = BuildEngine(
            NewRule(DiscountType.Percentage, 20, priority: 1, isStackable: false),
            NewRule(DiscountType.FixedAmount, 50m, isPercentage: false, priority: 2, isStackable: true));

        var cart = CartWith((NewProduct(1000m), 1));

        var result = await engine.CalculateAsync(cart);

        Assert.Equal(200m, result.TotalDiscount);   // solo la del 20%
        Assert.Single(result.AppliedDiscounts);
    }

    [Fact]
    public async Task LaPrioridadDefineElOrdenDeAplicacion()
    {
        var engine = BuildEngine(
            NewRule(DiscountType.FixedAmount, 50m, isPercentage: false, priority: 5),
            NewRule(DiscountType.Percentage, 10, priority: 1));

        var cart = CartWith((NewProduct(1000m), 1));

        var result = await engine.CalculateAsync(cart);

        // Prioridad 1 (porcentaje) se registra primero.
        Assert.Equal(2, result.AppliedDiscounts.Count);
        Assert.Contains("10%", result.AppliedDiscounts[0].Description);
    }

    [Fact]
    public async Task ElDescuentoTotalNuncaExcedeElSubtotal()
    {
        var engine = BuildEngine(
            NewRule(DiscountType.FixedAmount, 500m, isPercentage: false, priority: 1),
            NewRule(DiscountType.FixedAmount, 500m, isPercentage: false, priority: 2));

        var cart = CartWith((NewProduct(600m), 1));

        var result = await engine.CalculateAsync(cart);

        Assert.Equal(600m, result.TotalDiscount);
        Assert.True(result.TotalDiscount <= 600m);
    }
}
