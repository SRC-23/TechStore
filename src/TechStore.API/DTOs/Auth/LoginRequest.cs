using System.ComponentModel.DataAnnotations;

namespace TechStore.API.DTOs.Auth;

public class LoginRequest
{
    [Required(ErrorMessage = "El email es requerido")]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "La contraseña es requerida")]
    public string Password { get; set; } = string.Empty;
}
