using System.ComponentModel.DataAnnotations;

namespace TechStore.API.DTOs.Orders;

public class OrderDto
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal Subtotal { get; set; }
    public decimal TotalDiscount { get; set; }
    public decimal Total { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerEmail { get; set; }
    public AddressDto? ShippingAddress { get; set; }
    public List<OrderItemDto> Items { get; set; } = new();
    public List<AppliedDiscountInfoDto> AppliedDiscounts { get; set; } = new();
}

public class AddressDto
{
    public string Street { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string ZipCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
}

public class OrderItemDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal Discount { get; set; }
    public decimal Total { get; set; }
}

public class AppliedDiscountInfoDto
{
    public string Description { get; set; } = string.Empty;
    public decimal DiscountAmount { get; set; }
}

/// <summary>
/// El checkout envía una dirección guardada (AddressId) o una dirección nueva.
/// En ambos casos el servidor guarda una copia archivada para el pedido, de modo
/// que editar la libreta de direcciones no altera pedidos anteriores.
/// </summary>
public class CreateOrderRequest
{
    public Guid? AddressId { get; set; }

    [MaxLength(200)]
    public string? Street { get; set; }

    [MaxLength(100)]
    public string? City { get; set; }

    [MaxLength(100)]
    public string? State { get; set; }

    [MaxLength(20)]
    public string? ZipCode { get; set; }

    [MaxLength(100)]
    public string? Country { get; set; } = "Costa Rica";

    /// <summary>Si es true, la dirección nueva también se guarda en el perfil.</summary>
    public bool SaveAddress { get; set; }
}

public class UpdateOrderStatusRequest
{
    public Core.Enums.OrderStatus Status { get; set; }
}
