namespace TechStore.Core.Entities;

public class Address
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    /// <summary>Nombre corto que el cliente da a la dirección (Casa, Oficina...).</summary>
    public string? Label { get; set; }

    /// <summary>Dirección exacta (otras señas).</summary>
    public string Street { get; set; } = string.Empty;

    /// <summary>Cantón.</summary>
    public string City { get; set; } = string.Empty;

    /// <summary>Provincia.</summary>
    public string State { get; set; } = string.Empty;

    public string ZipCode { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public bool IsDefault { get; set; } = false;

    /// <summary>
    /// Las direcciones archivadas son copias usadas por los pedidos: conservan la
    /// dirección tal como estaba al comprar y no aparecen en la libreta del cliente.
    /// </summary>
    public bool IsArchived { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public User User { get; set; } = null!;
}
