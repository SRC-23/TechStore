using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TechStore.API.DTOs.PricingRules;
using TechStore.Core.Entities;
using TechStore.Core.Enums;
using TechStore.Core.Interfaces;

namespace TechStore.API.Controllers;

/// <summary>
/// Administración de las reglas del motor de precios (HU-14, HU-15, HU-16).
/// </summary>
[ApiController]
[Route("api/pricing-rules")]
[Authorize(Roles = "Admin")]
public class PricingRulesController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public PricingRulesController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PricingRuleDto>>> GetAll()
    {
        var rules = await _unitOfWork.DiscountRules.GetAllWithDetailsAsync();
        return Ok(rules.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<PricingRuleDto>> GetById(Guid id)
    {
        var rule = await _unitOfWork.DiscountRules.GetWithDetailsAsync(id);
        if (rule == null)
            return NotFound(new { message = "Regla no encontrada" });

        return Ok(MapToDto(rule));
    }

    [HttpPost]
    public async Task<ActionResult<PricingRuleDto>> Create([FromBody] CreatePricingRuleRequest request)
    {
        var error = await ValidateAsync(request, null);
        if (error != null)
            return BadRequest(new { message = error });

        var rule = new DiscountRule { Id = Guid.NewGuid(), IsActive = true };
        Apply(rule, request);

        await _unitOfWork.DiscountRules.AddAsync(rule);
        await _unitOfWork.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = rule.Id }, MapToDto(rule));
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<PricingRuleDto>> Update(Guid id, [FromBody] CreatePricingRuleRequest request)
    {
        var rule = await _unitOfWork.DiscountRules.GetWithDetailsAsync(id);
        if (rule == null)
            return NotFound(new { message = "Regla no encontrada" });

        var error = await ValidateAsync(request, id, rule.IsActive);
        if (error != null)
            return BadRequest(new { message = error });

        Apply(rule, request);
        rule.UpdatedAt = DateTime.UtcNow;

        await _unitOfWork.SaveChangesAsync();
        return Ok(MapToDto(rule));
    }

    [HttpPut("{id}/toggle")]
    public async Task<ActionResult> ToggleActive(Guid id)
    {
        var rule = await _unitOfWork.DiscountRules.GetByIdAsync(id);
        if (rule == null)
            return NotFound(new { message = "Regla no encontrada" });

        if (!rule.IsActive)
        {
            var conflict = await FindPriorityConflictAsync(rule.Priority, id);
            if (conflict != null)
                return BadRequest(new { message = $"No se puede activar: la regla activa \"{conflict.Name}\" ya usa la prioridad {rule.Priority}" });
        }

        rule.IsActive = !rule.IsActive;
        rule.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        return Ok(new { isActive = rule.IsActive });
    }

    /// <summary>Borrado lógico: la regla queda inactiva y conserva su historial de usos.</summary>
    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(Guid id)
    {
        var rule = await _unitOfWork.DiscountRules.GetByIdAsync(id);
        if (rule == null)
            return NotFound(new { message = "Regla no encontrada" });

        rule.IsActive = false;
        rule.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        return NoContent();
    }

    private async Task<string?> ValidateAsync(CreatePricingRuleRequest r, Guid? ruleId, bool willBeActive = true)
    {
        if (string.IsNullOrWhiteSpace(r.Name))
            return "El nombre de la regla es requerido";

        if (r.Value <= 0)
            return "El valor del descuento debe ser mayor a 0";

        if (r.IsPercentage && r.Value > 100)
            return "Un descuento porcentual no puede ser mayor a 100 %";

        if (r.Priority < 1)
            return "La prioridad debe ser 1 o mayor";

        if (r.EndDate <= r.StartDate)
            return "La fecha de fin debe ser posterior a la fecha de inicio";

        if ((r.MinimumAmount.HasValue && r.MinimumAmount.Value < 0) ||
            (r.MinimumQuantity.HasValue && r.MinimumQuantity.Value < 1) ||
            (r.MaxUses.HasValue && r.MaxUses.Value < 1))
            return "Las condiciones (monto mínimo, cantidad mínima y máximo de usos) deben ser positivas";

        switch (r.Type)
        {
            case DiscountType.Coupon when string.IsNullOrWhiteSpace(r.CouponCode):
                return "Un cupón requiere un código";
            case DiscountType.Volume when !r.MinimumQuantity.HasValue:
                return "Un descuento por volumen requiere una cantidad mínima";
            case DiscountType.Category when r.CategoryIds.Count == 0:
                return "Selecciona al menos una categoría";
            case DiscountType.Bundle when r.ProductIds.Distinct().Count() < 2:
                return "Un combo requiere al menos 2 productos";
        }

        if (r.Type == DiscountType.Coupon)
        {
            var code = r.CouponCode!.Trim().ToUpperInvariant();
            var rules = await _unitOfWork.DiscountRules.FindAsync(x => x.CouponCode != null && x.Id != ruleId);
            if (rules.Any(x => string.Equals(x.CouponCode, code, StringComparison.OrdinalIgnoreCase)))
                return $"Ya existe un cupón con el código {code}";
        }

        // HU-14: dos reglas activas no pueden compartir prioridad, porque el orden de
        // aplicación del motor quedaría indefinido.
        if (willBeActive)
        {
            var conflict = await FindPriorityConflictAsync(r.Priority, ruleId);
            if (conflict != null)
                return $"La prioridad {r.Priority} ya la usa la regla activa \"{conflict.Name}\". Elige otra prioridad.";
        }

        return null;
    }

    private async Task<DiscountRule?> FindPriorityConflictAsync(int priority, Guid? ruleId)
    {
        var rules = await _unitOfWork.DiscountRules.FindAsync(x => x.IsActive && x.Priority == priority && x.Id != ruleId);
        return rules.FirstOrDefault();
    }

    private static void Apply(DiscountRule rule, CreatePricingRuleRequest r)
    {
        rule.Name = r.Name.Trim();
        rule.Description = string.IsNullOrWhiteSpace(r.Description) ? null : r.Description.Trim();
        rule.Type = r.Type;
        rule.Value = r.Value;
        rule.IsPercentage = r.Type == DiscountType.FixedAmount ? false : r.IsPercentage;
        rule.CouponCode = r.Type == DiscountType.Coupon ? r.CouponCode!.Trim().ToUpperInvariant() : null;
        rule.Priority = r.Priority;
        rule.IsStackable = r.IsStackable;
        rule.StartDate = r.StartDate;
        rule.EndDate = r.EndDate;
        rule.MinimumAmount = r.MinimumAmount;
        rule.MinimumQuantity = r.MinimumQuantity;
        rule.MaxUses = r.Type == DiscountType.Coupon ? r.MaxUses : null;

        // Sincroniza las asociaciones sin volver a agregar las existentes: EF no permite
        // seguir dos instancias con la misma clave compuesta.
        var productIds = r.ProductIds.Distinct().ToHashSet();
        foreach (var link in rule.DiscountRuleProducts.Where(l => !productIds.Contains(l.ProductId)).ToList())
            rule.DiscountRuleProducts.Remove(link);
        foreach (var productId in productIds.Where(id => rule.DiscountRuleProducts.All(l => l.ProductId != id)))
            rule.DiscountRuleProducts.Add(new DiscountRuleProduct { RuleId = rule.Id, ProductId = productId });

        var categoryIds = r.CategoryIds.Distinct().ToHashSet();
        foreach (var link in rule.DiscountRuleCategories.Where(l => !categoryIds.Contains(l.CategoryId)).ToList())
            rule.DiscountRuleCategories.Remove(link);
        foreach (var categoryId in categoryIds.Where(id => rule.DiscountRuleCategories.All(l => l.CategoryId != id)))
            rule.DiscountRuleCategories.Add(new DiscountRuleCategory { RuleId = rule.Id, CategoryId = categoryId });
    }

    private static PricingRuleDto MapToDto(DiscountRule r) => new()
    {
        Id = r.Id,
        Name = r.Name,
        Description = r.Description,
        Type = r.Type,
        Value = r.Value,
        IsPercentage = r.IsPercentage,
        CouponCode = r.CouponCode,
        Priority = r.Priority,
        IsStackable = r.IsStackable,
        StartDate = r.StartDate,
        EndDate = r.EndDate,
        MinimumAmount = r.MinimumAmount,
        MinimumQuantity = r.MinimumQuantity,
        IsActive = r.IsActive,
        TimesUsed = r.TimesUsed,
        MaxUses = r.MaxUses,
        ProductIds = r.DiscountRuleProducts.Select(p => p.ProductId).ToList(),
        CategoryIds = r.DiscountRuleCategories.Select(c => c.CategoryId).ToList()
    };
}
