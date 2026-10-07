using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TechStore.API.DTOs.Products;
using TechStore.Core.Entities;
using TechStore.Core.Interfaces;
using TechStore.Core.Services.PricingEngine;

namespace TechStore.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public ProductsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    /// <summary>
    /// Catálogo paginado. Las categorías y marcas aceptan varios valores
    /// (?categoryIds=a&amp;categoryIds=b); categoryId/brandId se mantienen por compatibilidad.
    /// Al filtrar por una categoría padre se incluyen sus subcategorías.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ProductsPagedResponse>> GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        [FromQuery] string? search = null,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] Guid? brandId = null,
        [FromQuery] List<Guid>? categoryIds = null,
        [FromQuery] List<Guid>? brandIds = null,
        [FromQuery] decimal? minPrice = null,
        [FromQuery] decimal? maxPrice = null,
        [FromQuery] bool? inStock = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] bool includeInactive = false)
    {
        var categories = new HashSet<Guid>(categoryIds ?? new List<Guid>());
        if (categoryId.HasValue)
            categories.Add(categoryId.Value);

        if (categories.Count > 0)
        {
            var allCategories = await _unitOfWork.Categories.GetAllAsync();
            foreach (var child in allCategories.Where(c => c.ParentId.HasValue && categories.Contains(c.ParentId.Value)).ToList())
                categories.Add(child.Id);
        }

        var brands = new HashSet<Guid>(brandIds ?? new List<Guid>());
        if (brandId.HasValue)
            brands.Add(brandId.Value);

        var query = new ProductQuery
        {
            Page = Math.Max(1, page),
            PageSize = Math.Clamp(pageSize, 1, 200),
            Search = search,
            CategoryIds = categories.ToList(),
            BrandIds = brands.ToList(),
            MinPrice = minPrice,
            MaxPrice = maxPrice,
            InStock = inStock,
            SortBy = sortBy,
            // Solo el administrador puede ver productos desactivados.
            IncludeInactive = includeInactive && User.IsInRole("Admin")
        };

        var (products, totalCount) = await _unitOfWork.Products.GetPagedAsync(query);
        var rules = (await _unitOfWork.DiscountRules.GetActiveRulesAsync()).ToList();

        var response = new ProductsPagedResponse
        {
            Products = products.Select(p => MapToDto(p, rules)).ToList(),
            TotalCount = totalCount,
            Page = query.Page,
            PageSize = query.PageSize
        };

        return Ok(response);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProductDto>> GetById(Guid id)
    {
        var product = await _unitOfWork.Products.GetWithDetailsAsync(id);
        if (product == null || (!product.IsActive && !User.IsInRole("Admin")))
            return NotFound(new { message = "Producto no encontrado" });

        var rules = (await _unitOfWork.DiscountRules.GetActiveRulesAsync()).ToList();
        return Ok(MapToDto(product, rules));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductDto>> Create([FromBody] CreateProductRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var product = new Product
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Description = request.Description,
            Specifications = request.Specifications,
            Price = request.Price,
            Stock = request.Stock,
            CategoryId = request.CategoryId,
            BrandId = request.BrandId,
            ImageUrls = request.ImageUrls
        };

        await _unitOfWork.Products.AddAsync(product);
        await _unitOfWork.SaveChangesAsync();

        var created = await _unitOfWork.Products.GetWithDetailsAsync(product.Id);
        return CreatedAtAction(nameof(GetById), new { id = product.Id }, MapToDto(created!, Array.Empty<DiscountRule>()));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<ProductDto>> Update(Guid id, [FromBody] UpdateProductRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var product = await _unitOfWork.Products.GetByIdAsync(id);
        if (product == null)
            return NotFound(new { message = "Producto no encontrado" });

        product.Name = request.Name;
        product.Description = request.Description;
        product.Specifications = request.Specifications;
        product.Price = request.Price;
        product.Stock = request.Stock;
        product.CategoryId = request.CategoryId;
        product.BrandId = request.BrandId;
        product.ImageUrls = request.ImageUrls;
        product.IsActive = request.IsActive;
        product.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.Products.UpdateAsync(product);
        await _unitOfWork.SaveChangesAsync();

        var updated = await _unitOfWork.Products.GetWithDetailsAsync(product.Id);
        return Ok(MapToDto(updated!, Array.Empty<DiscountRule>()));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var product = await _unitOfWork.Products.GetByIdAsync(id);
        if (product == null)
            return NotFound(new { message = "Producto no encontrado" });

        product.IsActive = false;
        product.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.Products.UpdateAsync(product);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    private static ProductDto MapToDto(Product p, IReadOnlyCollection<DiscountRule> rules)
    {
        var offer = ProductOfferCalculator.Calculate(p, rules, DateTime.UtcNow);
        return new ProductDto
        {
            Id = p.Id,
            Name = p.Name,
            Description = p.Description,
            Specifications = p.Specifications,
            Price = p.Price,
            Stock = p.Stock,
            CategoryId = p.CategoryId,
            CategoryName = p.Category?.Name ?? "",
            BrandId = p.BrandId,
            BrandName = p.Brand?.Name ?? "",
            ImageUrls = p.ImageUrls,
            IsActive = p.IsActive,
            DiscountedPrice = offer?.DiscountedPrice,
            DiscountPercentage = offer?.DiscountPercentage,
            IsOnSale = offer?.IsOnSale ?? false,
            OfferEndsAt = offer?.OfferEndsAt,
            OfferName = offer?.OfferName
        };
    }
}
