using TechStore.Core.Entities;
using TechStore.Core.Services.PricingEngine;

namespace TechStore.Core.Interfaces;

public interface IPricingEngine
{
    Task<PricingResult> CalculateAsync(ShoppingCart cart);
}
