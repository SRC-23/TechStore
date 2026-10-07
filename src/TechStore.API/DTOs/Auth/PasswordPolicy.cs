namespace TechStore.API.DTOs.Auth;

/// <summary>
/// Política de contraseñas (HU-01): mínimo 8 caracteres, al menos una mayúscula y un número.
/// </summary>
public static class PasswordPolicy
{
    public const string Pattern = @"^(?=.*[A-Z])(?=.*\d).{8,}$";
    public const string Message = "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número";
}
