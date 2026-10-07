using Microsoft.EntityFrameworkCore;
using TechStore.Core.Entities;

namespace TechStore.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Address> Addresses => Set<Address>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Brand> Brands => Set<Brand>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<ShoppingCart> ShoppingCarts => Set<ShoppingCart>();
    public DbSet<CartItem> CartItems => Set<CartItem>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<DiscountRule> DiscountRules => Set<DiscountRule>();
    public DbSet<DiscountCondition> DiscountConditions => Set<DiscountCondition>();
    public DbSet<DiscountRuleProduct> DiscountRuleProducts => Set<DiscountRuleProduct>();
    public DbSet<DiscountRuleCategory> DiscountRuleCategories => Set<DiscountRuleCategory>();
    public DbSet<AppliedDiscount> AppliedDiscounts => Set<AppliedDiscount>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.FirstName).HasMaxLength(100);
            entity.Property(u => u.LastName).HasMaxLength(100);
            entity.Property(u => u.Email).HasMaxLength(256);
            entity.Property(u => u.Phone).HasMaxLength(20);
        });

        // Address
        modelBuilder.Entity<Address>(entity =>
        {
            entity.Property(a => a.Label).HasMaxLength(50);
            entity.Property(a => a.Street).HasMaxLength(200);
            entity.Property(a => a.City).HasMaxLength(100);
            entity.Property(a => a.State).HasMaxLength(100);
            entity.Property(a => a.ZipCode).HasMaxLength(20);
            entity.Property(a => a.Country).HasMaxLength(100);

            entity.HasOne(a => a.User)
                .WithMany(u => u.Addresses)
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Category (self-referencing)
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasIndex(c => c.Name).IsUnique();
            entity.Property(c => c.Name).HasMaxLength(100);
            entity.Property(c => c.Description).HasMaxLength(500);

            entity.HasOne(c => c.Parent)
                .WithMany(c => c.SubCategories)
                .HasForeignKey(c => c.ParentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Brand
        modelBuilder.Entity<Brand>(entity =>
        {
            entity.Property(b => b.Name).HasMaxLength(100);
        });

        // Product
        modelBuilder.Entity<Product>(entity =>
        {
            entity.Property(p => p.Name).HasMaxLength(200);
            entity.Property(p => p.Description).HasMaxLength(2000);
            entity.Property(p => p.Price).HasPrecision(18, 2);
            entity.HasIndex(p => p.Name);

            entity.HasOne(p => p.Category)
                .WithMany(c => c.Products)
                .HasForeignKey(p => p.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(p => p.Brand)
                .WithMany(b => b.Products)
                .HasForeignKey(p => p.BrandId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // ShoppingCart
        modelBuilder.Entity<ShoppingCart>(entity =>
        {
            entity.HasOne(sc => sc.User)
                .WithOne(u => u.ShoppingCart)
                .HasForeignKey<ShoppingCart>(sc => sc.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // CartItem
        modelBuilder.Entity<CartItem>(entity =>
        {
            entity.HasOne(ci => ci.Cart)
                .WithMany(c => c.Items)
                .HasForeignKey(ci => ci.CartId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ci => ci.Product)
                .WithMany()
                .HasForeignKey(ci => ci.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Order
        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasIndex(o => o.OrderNumber).IsUnique();
            entity.Property(o => o.OrderNumber).HasMaxLength(20);
            entity.Property(o => o.Subtotal).HasPrecision(18, 2);
            entity.Property(o => o.TotalDiscount).HasPrecision(18, 2);
            entity.Property(o => o.Total).HasPrecision(18, 2);

            entity.HasOne(o => o.User)
                .WithMany(u => u.Orders)
                .HasForeignKey(o => o.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(o => o.Address)
                .WithMany()
                .HasForeignKey(o => o.AddressId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // OrderItem
        modelBuilder.Entity<OrderItem>(entity =>
        {
            entity.Property(oi => oi.UnitPrice).HasPrecision(18, 2);
            entity.Property(oi => oi.Discount).HasPrecision(18, 2);
            entity.Property(oi => oi.Total).HasPrecision(18, 2);

            entity.HasOne(oi => oi.Order)
                .WithMany(o => o.Items)
                .HasForeignKey(oi => oi.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(oi => oi.Product)
                .WithMany()
                .HasForeignKey(oi => oi.ProductId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // DiscountRule
        modelBuilder.Entity<DiscountRule>(entity =>
        {
            entity.Property(dr => dr.Name).HasMaxLength(200);
            entity.Property(dr => dr.Description).HasMaxLength(500);
            entity.Property(dr => dr.CouponCode).HasMaxLength(50);
            entity.Property(dr => dr.Value).HasPrecision(18, 2);
            entity.Property(dr => dr.MinimumAmount).HasPrecision(18, 2);

            entity.HasIndex(dr => dr.CouponCode)
                .IsUnique()
                .HasFilter("[CouponCode] IS NOT NULL");
        });

        // DiscountCondition
        modelBuilder.Entity<DiscountCondition>(entity =>
        {
            entity.HasOne(dc => dc.Rule)
                .WithMany(dr => dr.Conditions)
                .HasForeignKey(dc => dc.RuleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // DiscountRuleProduct (M:N)
        modelBuilder.Entity<DiscountRuleProduct>(entity =>
        {
            entity.HasKey(drp => new { drp.RuleId, drp.ProductId });

            entity.HasOne(drp => drp.Rule)
                .WithMany(dr => dr.DiscountRuleProducts)
                .HasForeignKey(drp => drp.RuleId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(drp => drp.Product)
                .WithMany(p => p.DiscountRuleProducts)
                .HasForeignKey(drp => drp.ProductId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // DiscountRuleCategory (M:N)
        modelBuilder.Entity<DiscountRuleCategory>(entity =>
        {
            entity.HasKey(drc => new { drc.RuleId, drc.CategoryId });

            entity.HasOne(drc => drc.Rule)
                .WithMany(dr => dr.DiscountRuleCategories)
                .HasForeignKey(drc => drc.RuleId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(drc => drc.Category)
                .WithMany()
                .HasForeignKey(drc => drc.CategoryId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // AppliedDiscount
        modelBuilder.Entity<AppliedDiscount>(entity =>
        {
            entity.Property(ad => ad.DiscountAmount).HasPrecision(18, 2);
            entity.Property(ad => ad.Description).HasMaxLength(200);

            entity.HasOne(ad => ad.Order)
                .WithMany(o => o.AppliedDiscounts)
                .HasForeignKey(ad => ad.OrderId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ad => ad.Rule)
                .WithMany()
                .HasForeignKey(ad => ad.RuleId)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
