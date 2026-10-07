using Microsoft.EntityFrameworkCore;
using TechStore.Core.Entities;
using TechStore.Core.Interfaces;
using TechStore.Infrastructure.Data;

namespace TechStore.Infrastructure.Repositories;

public class ProductRepository : Repository<Product>, IProductRepository
{
    public ProductRepository(AppDbContext context) : base(context) { }

    public async Task<(IEnumerable<Product> Products, int TotalCount)> GetPagedAsync(ProductQuery q)
    {
        var query = _dbSet
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .AsQueryable();

        if (!q.IncludeInactive)
            query = query.Where(p => p.IsActive);

        if (!string.IsNullOrWhiteSpace(q.Search))
        {
            var search = q.Search.Trim().ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(search) ||
                                     p.Description.ToLower().Contains(search) ||
                                     p.Brand.Name.ToLower().Contains(search));
        }

        if (q.CategoryIds.Count > 0)
            query = query.Where(p => q.CategoryIds.Contains(p.CategoryId));

        if (q.BrandIds.Count > 0)
            query = query.Where(p => q.BrandIds.Contains(p.BrandId));

        if (q.MinPrice.HasValue)
            query = query.Where(p => p.Price >= q.MinPrice.Value);

        if (q.MaxPrice.HasValue)
            query = query.Where(p => p.Price <= q.MaxPrice.Value);

        if (q.InStock == true)
            query = query.Where(p => p.Stock > 0);

        var totalCount = await query.CountAsync();

        query = q.SortBy switch
        {
            "price_asc" => query.OrderBy(p => p.Price).ThenBy(p => p.Name),
            "price_desc" => query.OrderByDescending(p => p.Price).ThenBy(p => p.Name),
            "newest" => query.OrderByDescending(p => p.CreatedAt),
            _ => query.OrderBy(p => p.Name)
        };

        var page = Math.Max(1, q.Page);
        var pageSize = Math.Clamp(q.PageSize, 1, 200);

        var products = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return (products, totalCount);
    }

    public async Task<Product?> GetWithDetailsAsync(Guid id)
    {
        return await _dbSet
            .Include(p => p.Category)
            .Include(p => p.Brand)
            .FirstOrDefaultAsync(p => p.Id == id);
    }
}
