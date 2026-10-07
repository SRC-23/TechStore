using TechStore.Core.Entities;

namespace TechStore.Core.Interfaces;

public interface IUnitOfWork : IDisposable
{
    IProductRepository Products { get; }
    ICategoryRepository Categories { get; }
    IBrandRepository Brands { get; }
    IUserRepository Users { get; }
    IOrderRepository Orders { get; }
    ICartRepository Carts { get; }
    IRepository<CartItem> CartItems { get; }
    IRepository<Address> Addresses { get; }
    IDiscountRuleRepository DiscountRules { get; }
    Task<int> SaveChangesAsync();
}
