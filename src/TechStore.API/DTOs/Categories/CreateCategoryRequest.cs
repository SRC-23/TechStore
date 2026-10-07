using System.ComponentModel.DataAnnotations;

namespace TechStore.API.DTOs.Categories;

public class CreateCategoryRequest
{
    [Required(ErrorMessage = "El nombre es requerido")]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    public Guid? ParentId { get; set; }

    /// <summary>Solo se usa al editar; permite reactivar una categoría desactivada.</summary>
    public bool? IsActive { get; set; }
}
