namespace TechStore.API.DTOs.Products;

public class ProductDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Specifications { get; set; }
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public Guid CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public Guid BrandId { get; set; }
    public string BrandName { get; set; } = string.Empty;
    public string? ImageUrls { get; set; }
    public bool IsActive { get; set; }

    // Precio de vitrina calculado por el motor de precios (HU-04, HU-07, HU-13)
    public decimal? DiscountedPrice { get; set; }
    public int? DiscountPercentage { get; set; }
    public bool IsOnSale { get; set; }
    public DateTime? OfferEndsAt { get; set; }
    public string? OfferName { get; set; }
}

public class ProductsPagedResponse
{
    public IEnumerable<ProductDto> Products { get; set; } = new List<ProductDto>();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}
