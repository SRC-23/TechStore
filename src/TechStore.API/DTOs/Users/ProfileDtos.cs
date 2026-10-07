using System.ComponentModel.DataAnnotations;
using TechStore.API.DTOs.Auth;

namespace TechStore.API.DTOs.Users;

public class ProfileDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Role { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

public class UpdateProfileRequest
{
    [Required(ErrorMessage = "El nombre es requerido")]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "El apellido es requerido")]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [MaxLength(20)]
    [RegularExpression(@"^[0-9+\-\s]{8,20}$", ErrorMessage = "El teléfono no tiene un formato válido")]
    public string? Phone { get; set; }
}

public class ChangePasswordRequest
{
    [Required(ErrorMessage = "La contraseña actual es requerida")]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required(ErrorMessage = "La nueva contraseña es requerida")]
    [RegularExpression(PasswordPolicy.Pattern, ErrorMessage = PasswordPolicy.Message)]
    public string NewPassword { get; set; } = string.Empty;
}

public class SavedAddressDto
{
    public Guid Id { get; set; }
    public string? Label { get; set; }
    public string Street { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string ZipCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
}

public class SaveAddressRequest
{
    [MaxLength(50)]
    public string? Label { get; set; }

    [Required(ErrorMessage = "La dirección exacta es requerida")]
    [MaxLength(200)]
    public string Street { get; set; } = string.Empty;

    [Required(ErrorMessage = "El cantón es requerido")]
    [MaxLength(100)]
    public string City { get; set; } = string.Empty;

    [Required(ErrorMessage = "La provincia es requerida")]
    [MaxLength(100)]
    public string State { get; set; } = string.Empty;

    [Required(ErrorMessage = "El código postal es requerido")]
    [MaxLength(20)]
    public string ZipCode { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Country { get; set; } = "Costa Rica";

    public bool IsDefault { get; set; }
}
