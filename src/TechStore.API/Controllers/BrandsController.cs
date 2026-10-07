using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TechStore.API.DTOs.Brands;
using TechStore.Core.Entities;
using TechStore.Core.Interfaces;

namespace TechStore.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BrandsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public BrandsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<BrandDto>>> GetAll()
    {
        var brands = await _unitOfWork.Brands.GetAllAsync();
        var dtos = brands.Select(b => new BrandDto
        {
            Id = b.Id,
            Name = b.Name,
            IsActive = b.IsActive
        });
        return Ok(dtos);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<BrandDto>> Create([FromBody] CreateBrandRequest request)
    {
        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = request.Name
        };

        await _unitOfWork.Brands.AddAsync(brand);
        await _unitOfWork.SaveChangesAsync();

        return Ok(new BrandDto { Id = brand.Id, Name = brand.Name, IsActive = brand.IsActive });
    }
}
