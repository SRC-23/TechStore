using Microsoft.EntityFrameworkCore;
using TechStore.Core.Entities;
using TechStore.Core.Interfaces;
using TechStore.Infrastructure.Data;

namespace TechStore.Infrastructure.Repositories;

public class CategoryRepository : Repository<Category>, ICategoryRepository
{
    public CategoryRepository(AppDbContext context) : base(context) { }

    public async Task<IEnumerable<Category>> GetWithSubCategoriesAsync()
    {
        return await _dbSet
            .Include(c => c.SubCategories)
            .Where(c => c.ParentId == null && c.IsActive)
            .ToListAsync();
    }

    public async Task<bool> HasProductsAsync(Guid categoryId)
    {
        return await _context.Products.AnyAsync(p => p.CategoryId == categoryId && p.IsActive);
    }
}
