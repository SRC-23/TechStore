using TechStore.Core.Entities;

namespace TechStore.Core.Interfaces;

public interface ICategoryRepository : IRepository<Category>
{
    Task<IEnumerable<Category>> GetWithSubCategoriesAsync();
    Task<bool> HasProductsAsync(Guid categoryId);
}
