using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TechStore.API.DTOs.Users;
using TechStore.Core.Entities;
using TechStore.Core.Interfaces;

namespace TechStore.API.Controllers;

/// <summary>
/// Perfil del usuario autenticado y su libreta de direcciones (HU-03).
/// </summary>
[ApiController]
[Route("api/users/me")]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public UsersController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue("sub")
                    ?? User.FindFirstValue("nameid");

        if (!Guid.TryParse(claim, out var userId))
            throw new InvalidOperationException("El token no contiene un identificador de usuario válido. Cierra sesión y vuelve a iniciarla.");

        return userId;
    }

    [HttpGet]
    public async Task<ActionResult<ProfileDto>> GetProfile()
    {
        var user = await _unitOfWork.Users.GetByIdAsync(GetUserId());
        if (user == null)
            return NotFound(new { message = "Usuario no encontrado" });

        return Ok(MapProfile(user));
    }

    [HttpPut]
    public async Task<ActionResult<ProfileDto>> UpdateProfile([FromBody] UpdateProfileRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await _unitOfWork.Users.GetByIdAsync(GetUserId());
        if (user == null)
            return NotFound(new { message = "Usuario no encontrado" });

        // El email no se modifica: es el identificador del usuario.
        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        user.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();
        return Ok(MapProfile(user));
    }

    [HttpPut("password")]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await _unitOfWork.Users.GetByIdAsync(GetUserId());
        if (user == null)
            return NotFound(new { message = "Usuario no encontrado" });

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "La contraseña actual es incorrecta" });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        user.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { message = "Contraseña actualizada" });
    }

    // ---------------- Direcciones ----------------

    [HttpGet("addresses")]
    public async Task<ActionResult<IEnumerable<SavedAddressDto>>> GetAddresses()
    {
        var addresses = await GetSavedAddressesAsync(GetUserId());
        return Ok(addresses.Select(MapAddress));
    }

    [HttpPost("addresses")]
    public async Task<ActionResult<SavedAddressDto>> AddAddress([FromBody] SaveAddressRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var userId = GetUserId();
        var existing = await GetSavedAddressesAsync(userId);

        var address = new Address { Id = Guid.NewGuid(), UserId = userId };
        Apply(address, request);

        // La primera dirección siempre queda como principal.
        if (existing.Count == 0)
            address.IsDefault = true;

        if (address.IsDefault)
            existing.ForEach(a => a.IsDefault = false);

        await _unitOfWork.Addresses.AddAsync(address);
        await _unitOfWork.SaveChangesAsync();

        return Ok(MapAddress(address));
    }

    [HttpPut("addresses/{id}")]
    public async Task<ActionResult<SavedAddressDto>> UpdateAddress(Guid id, [FromBody] SaveAddressRequest request)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var addresses = await GetSavedAddressesAsync(GetUserId());
        var address = addresses.FirstOrDefault(a => a.Id == id);
        if (address == null)
            return NotFound(new { message = "Dirección no encontrada" });

        var wasDefault = address.IsDefault;
        Apply(address, request);

        if (address.IsDefault)
            addresses.Where(a => a.Id != id).ToList().ForEach(a => a.IsDefault = false);
        else if (wasDefault)
            address.IsDefault = true; // siempre debe existir una principal

        await _unitOfWork.SaveChangesAsync();
        return Ok(MapAddress(address));
    }

    [HttpDelete("addresses/{id}")]
    public async Task<ActionResult> DeleteAddress(Guid id)
    {
        var addresses = await GetSavedAddressesAsync(GetUserId());
        var address = addresses.FirstOrDefault(a => a.Id == id);
        if (address == null)
            return NotFound(new { message = "Dirección no encontrada" });

        // Los pedidos usan copias archivadas, por lo que la dirección se puede eliminar.
        await _unitOfWork.Addresses.DeleteAsync(address);

        if (address.IsDefault)
        {
            var next = addresses.FirstOrDefault(a => a.Id != id);
            if (next != null)
                next.IsDefault = true;
        }

        await _unitOfWork.SaveChangesAsync();
        return NoContent();
    }

    private async Task<List<Address>> GetSavedAddressesAsync(Guid userId)
    {
        var addresses = await _unitOfWork.Addresses.FindAsync(a => a.UserId == userId && !a.IsArchived);
        return addresses.OrderByDescending(a => a.IsDefault).ThenBy(a => a.CreatedAt).ToList();
    }

    private static void Apply(Address address, SaveAddressRequest request)
    {
        address.Label = string.IsNullOrWhiteSpace(request.Label) ? null : request.Label.Trim();
        address.Street = request.Street.Trim();
        address.City = request.City.Trim();
        address.State = request.State.Trim();
        address.ZipCode = request.ZipCode.Trim();
        address.Country = string.IsNullOrWhiteSpace(request.Country) ? "Costa Rica" : request.Country.Trim();
        address.IsDefault = request.IsDefault;
    }

    private static ProfileDto MapProfile(User u) => new()
    {
        Id = u.Id,
        FirstName = u.FirstName,
        LastName = u.LastName,
        Email = u.Email,
        Phone = u.Phone,
        Role = u.Role.ToString(),
        CreatedAt = u.CreatedAt
    };

    private static SavedAddressDto MapAddress(Address a) => new()
    {
        Id = a.Id,
        Label = a.Label,
        Street = a.Street,
        City = a.City,
        State = a.State,
        ZipCode = a.ZipCode,
        Country = a.Country,
        IsDefault = a.IsDefault
    };
}
