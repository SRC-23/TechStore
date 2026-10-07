using System.ComponentModel.DataAnnotations;

namespace TechStore.API.DTOs.Products;

public class CreateProductRequest
{
    [Required(ErrorMessage = "El nombre es requerido")]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "La descripción es requerida")]
    [MaxLength(2000)]
    public string Description { get; set; } = string.Empty;

    public string? Specifications { get; set; }

    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "El precio debe ser mayor a 0")]
    public decimal Price { get; set; }

    [Required]
    [Range(0, int.MaxValue, ErrorMessage = "El stock no puede ser negativo")]
    public int Stock { get; set; }

    [Required(ErrorMessage = "La categoría es requerida")]
    public Guid CategoryId { get; set; }

    [Required(ErrorMessage = "La marca es requerida")]
    public Guid BrandId { get; set; }

    public string? ImageUrls { get; set; }
}
