using System.ComponentModel.DataAnnotations;

namespace TechStore.API.DTOs.Auth;

public class RegisterRequest
{
    [Required(ErrorMessage = "El nombre es requerido")]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required(ErrorMessage = "El apellido es requerido")]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required(ErrorMessage = "El email es requerido")]
    [EmailAddress(ErrorMessage = "El formato del email no es válido")]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "La contraseña es requerida")]
    [MinLength(8, ErrorMessage = "La contraseña debe tener al menos 8 caracteres")]
    [RegularExpression(PasswordPolicy.Pattern, ErrorMessage = PasswordPolicy.Message)]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "Confirmar contraseña es requerido")]
    [Compare("Password", ErrorMessage = "Las contraseñas no coinciden")]
    public string ConfirmPassword { get; set; } = string.Empty;
}
