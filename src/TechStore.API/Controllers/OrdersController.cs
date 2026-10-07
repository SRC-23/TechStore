using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TechStore.API.DTOs.Orders;
using TechStore.Core.Entities;
using TechStore.Core.Enums;
using TechStore.Core.Interfaces;

namespace TechStore.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPricingEngine _pricingEngine;

    public OrdersController(IUnitOfWork unitOfWork, IPricingEngine pricingEngine)
    {
        _unitOfWork = unitOfWork;
        _pricingEngine = pricingEngine;
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue("sub")
                    ?? User.FindFirstValue("nameid");

        if (!Guid.TryParse(claim, out var userId))
            throw new InvalidOperationException("El token no contiene un identificador de usuario válido. Cierra sesión y vuelve a iniciarla.");

        return userId;
    }

    [HttpPost]
    public async Task<ActionResult<OrderDto>> CreateOrder([FromBody] CreateOrderRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var cart = await _unitOfWork.Carts.GetByUserIdWithItemsAsync(userId);

        var items = cart?.Items.Where(i => i.Product != null).ToList() ?? new List<CartItem>();
        if (items.Count == 0)
            return BadRequest(new { message = "El carrito está vacío" });

        // Validación de stock antes de descontar nada.
        foreach (var item in items)
        {
            if (item.Product.Stock < item.Quantity)
                return BadRequest(new { message = $"Stock insuficiente para {item.Product.Name}. Disponible: {item.Product.Stock}" });
        }

        var subtotal = items.Sum(i => i.Product.Price * i.Quantity);
        var pricingResult = await _pricingEngine.CalculateAsync(cart!);
        var total = subtotal - pricingResult.TotalDiscount;

        // Dirección del pedido: copia archivada de una dirección guardada o de la
        // dirección nueva escrita en el checkout.
        Address source;
        if (request.AddressId.HasValue)
        {
            var saved = await _unitOfWork.Addresses.GetByIdAsync(request.AddressId.Value);
            if (saved == null || saved.UserId != userId || saved.IsArchived)
                return BadRequest(new { message = "La dirección seleccionada no existe" });
            source = saved;
        }
        else
        {
            if (string.IsNullOrWhiteSpace(request.Street) || string.IsNullOrWhiteSpace(request.City) ||
                string.IsNullOrWhiteSpace(request.State) || string.IsNullOrWhiteSpace(request.ZipCode))
                return BadRequest(new { message = "Completa todos los campos de dirección" });

            source = new Address
            {
                Street = request.Street.Trim(),
                City = request.City.Trim(),
                State = request.State.Trim(),
                ZipCode = request.ZipCode.Trim(),
                Country = string.IsNullOrWhiteSpace(request.Country) ? "Costa Rica" : request.Country.Trim()
            };

            if (request.SaveAddress)
            {
                var hasSaved = await _unitOfWork.Addresses.ExistsAsync(a => a.UserId == userId && !a.IsArchived);
                await _unitOfWork.Addresses.AddAsync(new Address
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Street = source.Street,
                    City = source.City,
                    State = source.State,
                    ZipCode = source.ZipCode,
                    Country = source.Country,
                    IsDefault = !hasSaved
                });
            }
        }

        var address = new Address
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Label = source.Label,
            Street = source.Street,
            City = source.City,
            State = source.State,
            ZipCode = source.ZipCode,
            Country = source.Country,
            IsArchived = true
        };
        await _unitOfWork.Addresses.AddAsync(address);

        var order = new Order
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            AddressId = address.Id,
            OrderNumber = await GenerateUniqueOrderNumberAsync(),
            Status = OrderStatus.Pending,
            Subtotal = decimal.Round(subtotal, 2),
            TotalDiscount = decimal.Round(pricingResult.TotalDiscount, 2),
            Total = decimal.Round(total, 2),
            Items = items.Select(i => new OrderItem
            {
                Id = Guid.NewGuid(),
                ProductId = i.ProductId,
                Quantity = i.Quantity,
                UnitPrice = decimal.Round(i.Product.Price, 2),
                Discount = 0,
                Total = decimal.Round(i.Product.Price * i.Quantity, 2)
            }).ToList(),
            AppliedDiscounts = pricingResult.AppliedDiscounts.Select(d => new AppliedDiscount
            {
                Id = Guid.NewGuid(),
                RuleId = d.RuleId,
                DiscountAmount = decimal.Round(d.DiscountAmount, 2),
                Description = d.Description
            }).ToList()
        };

        // Descontar stock.
        foreach (var item in items)
            item.Product.Stock -= item.Quantity;

        // Registrar cuántas veces se aplicó cada regla (incluye el cupón). Este
        // contador también controla el máximo de usos de los cupones (HU-11, HU-15).
        foreach (var ruleId in pricingResult.AppliedDiscounts.Select(d => d.RuleId).Distinct())
        {
            var appliedRule = await _unitOfWork.DiscountRules.GetByIdAsync(ruleId);
            if (appliedRule != null)
                appliedRule.TimesUsed += 1;
        }

        await _unitOfWork.Orders.AddAsync(order);

        // Vaciar el carrito.
        foreach (var item in items)
            await _unitOfWork.CartItems.DeleteAsync(item);

        cart!.Items.Clear();
        cart.CouponCode = null;
        cart.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();

        var created = await _unitOfWork.Orders.GetWithDetailsAsync(order.Id);
        return Ok(MapToDto(created ?? order));
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetMyOrders()
    {
        var userId = GetUserId();
        var orders = await _unitOfWork.Orders.GetByUserIdAsync(userId);
        return Ok(orders.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<OrderDto>> GetById(Guid id)
    {
        var order = await _unitOfWork.Orders.GetWithDetailsAsync(id);
        if (order == null)
            return NotFound(new { message = "Pedido no encontrado" });

        var userId = GetUserId();
        if (order.UserId != userId && !User.IsInRole("Admin"))
            return Forbid();

        return Ok(MapToDto(order));
    }

    [HttpGet("admin/all")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IEnumerable<OrderDto>>> GetAllOrders([FromQuery] string? status = null)
    {
        var orders = await _unitOfWork.Orders.GetAllWithDetailsAsync();

        if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<OrderStatus>(status, true, out var orderStatus))
            orders = orders.Where(o => o.Status == orderStatus);

        return Ok(orders.Select(MapToDto));
    }

    /// <summary>
    /// Métricas para el dashboard de administración (HU-22).
    /// </summary>
    [HttpGet("admin/stats")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<OrderStatsDto>> GetStats()
    {
        var orders = (await _unitOfWork.Orders.GetAllWithDetailsAsync()).ToList();
        var products = (await _unitOfWork.Products.GetAllAsync()).ToList();

        // Los pedidos cancelados no cuentan como ingresos.
        var validOrders = orders.Where(o => o.Status != OrderStatus.Cancelled).ToList();

        var topProducts = validOrders
            .SelectMany(o => o.Items)
            .GroupBy(i => i.ProductId)
            .Select(g => new TopProductDto
            {
                ProductId = g.Key,
                ProductName = g.First().Product?.Name ?? "Producto",
                UnitsSold = g.Sum(i => i.Quantity),
                Revenue = decimal.Round(g.Sum(i => i.Total), 2)
            })
            .OrderByDescending(p => p.UnitsSold)
            .Take(5)
            .ToList();

        // Las ventas se agrupan por día local de Costa Rica (UTC-6, sin horario de verano).
        static DateTime ToCostaRica(DateTime utc) => utc.AddHours(-6);
        var today = ToCostaRica(DateTime.UtcNow).Date;

        decimal SalesSince(DateTime fromLocalDate) => validOrders
            .Where(o => ToCostaRica(o.CreatedAt).Date >= fromLocalDate)
            .Sum(o => o.Total);

        var last7Days = Enumerable.Range(0, 7)
            .Select(offset => today.AddDays(offset - 6))
            .Select(day =>
            {
                var dayOrders = validOrders.Where(o => ToCostaRica(o.CreatedAt).Date == day).ToList();
                return new DailySalesDto
                {
                    Date = day.ToString("yyyy-MM-dd"),
                    Total = dayOrders.Sum(o => o.Total),
                    Orders = dayOrders.Count
                };
            })
            .ToList();

        const int lowStockThreshold = 5;
        var lowStock = products
            .Where(p => p.IsActive && p.Stock < lowStockThreshold)
            .OrderBy(p => p.Stock)
            .ToList();

        var stats = new OrderStatsDto
        {
            TotalOrders = orders.Count,
            TotalRevenue = decimal.Round(validOrders.Sum(o => o.Total), 2),
            TotalDiscountsGiven = decimal.Round(validOrders.Sum(o => o.TotalDiscount), 2),
            AverageOrderValue = validOrders.Count > 0
                ? decimal.Round(validOrders.Sum(o => o.Total) / validOrders.Count, 0)
                : 0,
            SalesToday = SalesSince(today),
            SalesWeek = SalesSince(today.AddDays(-6)),
            SalesMonth = SalesSince(new DateTime(today.Year, today.Month, 1)),
            PendingOrders = orders.Count(o => o.Status == OrderStatus.Pending),
            ConfirmedOrders = orders.Count(o => o.Status == OrderStatus.Confirmed),
            ShippedOrders = orders.Count(o => o.Status == OrderStatus.Shipped),
            DeliveredOrders = orders.Count(o => o.Status == OrderStatus.Delivered),
            CancelledOrders = orders.Count(o => o.Status == OrderStatus.Cancelled),
            TotalProducts = products.Count(p => p.IsActive),
            LowStockProducts = lowStock.Count,
            LowStockThreshold = lowStockThreshold,
            TopProducts = topProducts,
            SalesLast7Days = last7Days,
            LowStockItems = lowStock.Select(p => new LowStockItemDto
            {
                ProductId = p.Id,
                ProductName = p.Name,
                Stock = p.Stock
            }).ToList()
        };

        return Ok(stats);
    }

    /// <summary>
    /// Permite al cliente cancelar su propio pedido (HU-17), siempre que aún no
    /// haya sido enviado. El stock se devuelve al inventario (HU-18).
    /// </summary>
    [HttpPut("{id}/cancel")]
    public async Task<ActionResult<OrderDto>> CancelMyOrder(Guid id)
    {
        var order = await _unitOfWork.Orders.GetWithDetailsAsync(id);
        if (order == null)
            return NotFound(new { message = "Pedido no encontrado" });

        var userId = GetUserId();
        if (order.UserId != userId && !User.IsInRole("Admin"))
            return Forbid();

        if (order.Status != OrderStatus.Pending && order.Status != OrderStatus.Confirmed)
            return BadRequest(new { message = $"Un pedido en estado {order.Status} ya no se puede cancelar" });

        await RestoreStockAsync(order);

        order.Status = OrderStatus.Cancelled;
        order.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        return Ok(MapToDto(order));
    }

    [HttpPut("{id}/status")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<OrderDto>> UpdateStatus(Guid id, [FromBody] UpdateOrderStatusRequest request)
    {
        var order = await _unitOfWork.Orders.GetWithDetailsAsync(id);
        if (order == null)
            return NotFound(new { message = "Pedido no encontrado" });

        if (!IsValidTransition(order.Status, request.Status))
            return BadRequest(new { message = $"No se puede cambiar de {order.Status} a {request.Status}" });

        // Al cancelar, se devuelve el stock al inventario.
        if (request.Status == OrderStatus.Cancelled)
            await RestoreStockAsync(order);

        order.Status = request.Status;
        order.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        return Ok(MapToDto(order));
    }

    /// <summary>
    /// Devuelve al inventario las unidades de un pedido cancelado (HU-18).
    /// </summary>
    private async Task RestoreStockAsync(Order order)
    {
        foreach (var item in order.Items)
        {
            var product = await _unitOfWork.Products.GetByIdAsync(item.ProductId);
            if (product != null)
                product.Stock += item.Quantity;
        }
    }

    private static bool IsValidTransition(OrderStatus current, OrderStatus next)
    {
        return (current, next) switch
        {
            (OrderStatus.Pending, OrderStatus.Confirmed) => true,
            (OrderStatus.Pending, OrderStatus.Cancelled) => true,
            (OrderStatus.Confirmed, OrderStatus.Shipped) => true,
            (OrderStatus.Confirmed, OrderStatus.Cancelled) => true,
            (OrderStatus.Shipped, OrderStatus.Delivered) => true,
            _ => false
        };
    }

    /// <summary>
    /// Genera un número de orden único. OrderNumber tiene índice único en la BD,
    /// así que se reintenta si por casualidad se repite.
    /// </summary>
    private async Task<string> GenerateUniqueOrderNumberAsync()
    {
        for (var attempt = 0; attempt < 10; attempt++)
        {
            var candidate = $"TS-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
            var exists = await _unitOfWork.Orders.ExistsAsync(o => o.OrderNumber == candidate);
            if (!exists)
                return candidate;
        }

        return $"TS-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
    }

    private static OrderDto MapToDto(Order o) => new()
    {
        Id = o.Id,
        OrderNumber = o.OrderNumber,
        Status = o.Status.ToString(),
        Subtotal = o.Subtotal,
        TotalDiscount = o.TotalDiscount,
        Total = o.Total,
        CreatedAt = o.CreatedAt,
        CustomerName = o.User != null ? $"{o.User.FirstName} {o.User.LastName}" : null,
        CustomerEmail = o.User?.Email,
        ShippingAddress = o.Address == null ? null : new AddressDto
        {
            Street = o.Address.Street,
            City = o.Address.City,
            State = o.Address.State,
            ZipCode = o.Address.ZipCode,
            Country = o.Address.Country
        },
        Items = o.Items.Select(i => new OrderItemDto
        {
            ProductId = i.ProductId,
            ProductName = i.Product?.Name ?? "Producto",
            Quantity = i.Quantity,
            UnitPrice = i.UnitPrice,
            Discount = i.Discount,
            Total = i.Total
        }).ToList(),
        AppliedDiscounts = o.AppliedDiscounts.Select(d => new AppliedDiscountInfoDto
        {
            Description = d.Description,
            DiscountAmount = d.DiscountAmount
        }).ToList()
    };
}
