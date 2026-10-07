namespace TechStore.API.DTOs.Orders;

/// <summary>
/// Métricas agregadas para el panel de administración (HU-22).
/// </summary>
public class OrderStatsDto
{
    public int TotalOrders { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal TotalDiscountsGiven { get; set; }
    public decimal AverageOrderValue { get; set; }

    public decimal SalesToday { get; set; }
    public decimal SalesWeek { get; set; }
    public decimal SalesMonth { get; set; }

    public int PendingOrders { get; set; }
    public int ConfirmedOrders { get; set; }
    public int ShippedOrders { get; set; }
    public int DeliveredOrders { get; set; }
    public int CancelledOrders { get; set; }

    public int TotalProducts { get; set; }
    public int LowStockProducts { get; set; }
    public int LowStockThreshold { get; set; }

    public List<TopProductDto> TopProducts { get; set; } = new();
    public List<DailySalesDto> SalesLast7Days { get; set; } = new();
    public List<LowStockItemDto> LowStockItems { get; set; } = new();
}

public class TopProductDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int UnitsSold { get; set; }
    public decimal Revenue { get; set; }
}

public class DailySalesDto
{
    /// <summary>Fecha local de Costa Rica (yyyy-MM-dd).</summary>
    public string Date { get; set; } = string.Empty;
    public decimal Total { get; set; }
    public int Orders { get; set; }
}

public class LowStockItemDto
{
    public Guid ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public int Stock { get; set; }
}
