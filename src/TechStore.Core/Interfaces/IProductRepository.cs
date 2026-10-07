using TechStore.Core.Entities;

namespace TechStore.Core.Interfaces;

/// <summary>Criterios de búsqueda del catálogo (HU-05, HU-06).</summary>
public class ProductQuery
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 12;
    public string? Search { get; set; }
    public ICollection<Guid> CategoryIds { get; set; } = new List<Guid>();
    public ICollection<Guid> BrandIds { get; set; } = new List<Guid>();
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public bool? InStock { get; set; }

    /// <summary>name | price_asc | price_desc | newest</summary>
    public string? SortBy { get; set; }

    public bool IncludeInactive { get; set; }
}

public interface IProductRepository : IRepository<Product>
{
    Task<(IEnumerable<Product> Products, int TotalCount)> GetPagedAsync(ProductQuery query);
    Task<Product?> GetWithDetailsAsync(Guid id);
}
