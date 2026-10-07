using TechStore.Core.Entities;

namespace TechStore.Core.Interfaces;

public interface IJwtService
{
    string GenerateToken(User user);
}
