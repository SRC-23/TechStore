using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TechStore.API.DTOs.Categories;
using TechStore.Core.Entities;
using TechStore.Core.Interfaces;

namespace TechStore.API.Controllers;

/// <summary>
/// Categorías del catálogo con un nivel de subcategorías (HU-21).
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public CategoriesController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    /// <summary>
    /// Devuelve las categorías principales con sus subcategorías. El administrador
    /// puede pedir también las inactivas con ?includeInactive=true.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<CategoryDto>>> GetAll([FromQuery] bool includeInactive = false)
    {
        var showInactive = includeInactive && User.IsInRole("Admin");
        var categories = (await _unitOfWork.Categories.GetAllAsync()).ToList();
        var counts = await GetProductCountsAsync();

        var roots = categories
            .Where(c => c.ParentId == null && (showInactive || c.IsActive))
            .OrderBy(c => c.Name)
            .Select(c => MapToDto(c, categories, counts, showInactive))
            .ToList();

        return Ok(roots);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<CategoryDto>> GetById(Guid id)
    {
        var categories = (await _unitOfWork.Categories.GetAllAsync()).ToList();
        var category = categories.FirstOrDefault(c => c.Id == id);
        if (category == null)
            return NotFound(new { message = "Categoría no encontrada" });

        return Ok(MapToDto(category, categories, await GetProductCountsAsync(), User.IsInRole("Admin")));
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<CategoryDto>> Create([FromBody] CreateCategoryRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var name = request.Name.Trim();
        if (await _unitOfWork.Categories.ExistsAsync(c => c.Name == name))
            return BadRequest(new { message = "Ya existe una categoría con ese nombre" });

        var parentError = await ValidateParentAsync(request.ParentId, null);
        if (parentError != null)
            return BadRequest(new { message = parentError });

        var category = new Category
        {
            Id = Guid.NewGuid(),
            Name = name,
            Description = request.Description?.Trim(),
            ParentId = request.ParentId
        };

        await _unitOfWork.Categories.AddAsync(category);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = category.Id },
            MapToDto(category, new List<Category> { category }, new Dictionary<Guid, int>(), true));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<CategoryDto>> Update(Guid id, [FromBody] CreateCategoryRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var category = await _unitOfWork.Categories.GetByIdAsync(id);
        if (category == null)
            return NotFound(new { message = "Categoría no encontrada" });

        var name = request.Name.Trim();
        if (await _unitOfWork.Categories.ExistsAsync(c => c.Name == name && c.Id != id))
            return BadRequest(new { message = "Ya existe una categoría con ese nombre" });

        var parentError = await ValidateParentAsync(request.ParentId, id);
        if (parentError != null)
            return BadRequest(new { message = parentError });

        category.Name = name;
        category.Description = request.Description?.Trim();
        category.ParentId = request.ParentId;
        if (request.IsActive.HasValue)
            category.IsActive = request.IsActive.Value;

        await _unitOfWork.Categories.UpdateAsync(category);
        await _unitOfWork.SaveChangesAsync();

        var categories = (await _unitOfWork.Categories.GetAllAsync()).ToList();
        return Ok(MapToDto(category, categories, await GetProductCountsAsync(), true));
    }

    /// <summary>
    /// Desactiva la categoría (borrado lógico). No se permite si tiene productos
    /// activos o subcategorías activas.
    /// </summary>
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var category = await _unitOfWork.Categories.GetByIdAsync(id);
        if (category == null)
            return NotFound(new { message = "Categoría no encontrada" });

        if (await _unitOfWork.Categories.HasProductsAsync(id))
            return BadRequest(new { message = "No se puede eliminar una categoría con productos asociados" });

        if (await _unitOfWork.Categories.ExistsAsync(c => c.ParentId == id && c.IsActive))
            return BadRequest(new { message = "No se puede eliminar una categoría con subcategorías activas" });

        category.IsActive = false;
        await _unitOfWork.Categories.UpdateAsync(category);
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>Solo se permite un nivel de jerarquía y una categoría no puede ser su propio padre.</summary>
    private async Task<string?> ValidateParentAsync(Guid? parentId, Guid? categoryId)
    {
        if (!parentId.HasValue)
            return null;

        if (parentId == categoryId)
            return "Una categoría no puede ser su propia categoría padre";

        var parent = await _unitOfWork.Categories.GetByIdAsync(parentId.Value);
        if (parent == null)
            return "La categoría padre no existe";

        if (parent.ParentId.HasValue)
            return "Solo se permite un nivel de subcategorías";

        if (categoryId.HasValue && await _unitOfWork.Categories.ExistsAsync(c => c.ParentId == categoryId))
            return "Una categoría con subcategorías no puede convertirse en subcategoría";

        return null;
    }

    private async Task<Dictionary<Guid, int>> GetProductCountsAsync()
    {
        var products = await _unitOfWork.Products.FindAsync(p => p.IsActive);
        return products.GroupBy(p => p.CategoryId).ToDictionary(g => g.Key, g => g.Count());
    }

    private static CategoryDto MapToDto(Category c, List<Category> all, Dictionary<Guid, int> counts, bool includeInactive) => new()
    {
        Id = c.Id,
        Name = c.Name,
        Description = c.Description,
        ParentId = c.ParentId,
        IsActive = c.IsActive,
        ProductCount = counts.GetValueOrDefault(c.Id),
        SubCategories = all
            .Where(sc => sc.ParentId == c.Id && (includeInactive || sc.IsActive))
            .OrderBy(sc => sc.Name)
            .Select(sc => MapToDto(sc, all, counts, includeInactive))
            .ToList()
    };
}
