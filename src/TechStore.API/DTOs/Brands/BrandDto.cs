namespace TechStore.API.DTOs.Brands;

public class BrandDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class CreateBrandRequest
{
    public string Name { get; set; } = string.Empty;
}
