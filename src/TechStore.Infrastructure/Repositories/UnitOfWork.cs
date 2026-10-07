using TechStore.Core.Entities;
using TechStore.Core.Interfaces;
using TechStore.Infrastructure.Data;

namespace TechStore.Infrastructure.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _context;

    public IProductRepository Products { get; }
    public ICategoryRepository Categories { get; }
    public IBrandRepository Brands { get; }
    public IUserRepository Users { get; }
    public IOrderRepository Orders { get; }
    public ICartRepository Carts { get; }
    public IRepository<CartItem> CartItems { get; }
    public IRepository<Address> Addresses { get; }
    public IDiscountRuleRepository DiscountRules { get; }

    public UnitOfWork(AppDbContext context)
    {
        _context = context;
        Products = new ProductRepository(context);
        Categories = new CategoryRepository(context);
        Brands = new BrandRepository(context);
        Users = new UserRepository(context);
        Orders = new OrderRepository(context);
        Carts = new CartRepository(context);
        CartItems = new Repository<CartItem>(context);
        Addresses = new Repository<Address>(context);
        DiscountRules = new DiscountRuleRepository(context);
    }

    public async Task<int> SaveChangesAsync()
    {
        return await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}
