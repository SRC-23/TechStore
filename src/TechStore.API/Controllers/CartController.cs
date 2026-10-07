using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TechStore.API.DTOs.Cart;
using TechStore.Core.Entities;
using TechStore.Core.Interfaces;

namespace TechStore.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CartController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPricingEngine _pricingEngine;

    public CartController(IUnitOfWork unitOfWork, IPricingEngine pricingEngine)
    {
        _unitOfWork = unitOfWork;
        _pricingEngine = pricingEngine;
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

    /// <summary>
    /// Devuelve el carrito del usuario, creándolo si aún no existe.
    /// </summary>
    private async Task<ShoppingCart> GetOrCreateCartAsync(Guid userId)
    {
        var cart = await _unitOfWork.Carts.GetByUserIdWithItemsAsync(userId);
        if (cart != null)
            return cart;

        cart = new ShoppingCart { Id = Guid.NewGuid(), UserId = userId };
        await _unitOfWork.Carts.AddAsync(cart);
        await _unitOfWork.SaveChangesAsync();

        return await _unitOfWork.Carts.GetByUserIdWithItemsAsync(userId) ?? cart;
    }

    [HttpGet]
    public async Task<ActionResult<CartDto>> GetCart()
    {
        var userId = GetUserId();
        var cart = await GetOrCreateCartAsync(userId);
        return Ok(await BuildCartDto(cart));
    }

    [HttpPost("items")]
    public async Task<ActionResult<CartDto>> AddItem([FromBody] AddToCartRequest request)
    {
        if (request.Quantity <= 0)
            return BadRequest(new { message = "La cantidad debe ser mayor a 0" });

        var userId = GetUserId();
        var product = await _unitOfWork.Products.GetByIdAsync(request.ProductId);

        if (product == null)
            return NotFound(new { message = "Producto no encontrado" });

        var cart = await GetOrCreateCartAsync(userId);

        var existingItem = cart.Items.FirstOrDefault(i => i.ProductId == request.ProductId);
        var newQuantity = (existingItem?.Quantity ?? 0) + request.Quantity;

        if (newQuantity > product.Stock)
            return BadRequest(new { message = $"Stock insuficiente. Disponible: {product.Stock}" });

        if (existingItem != null)
        {
            existingItem.Quantity = newQuantity;
        }
        else
        {
            var newItem = new CartItem
            {
                Id = Guid.NewGuid(),
                CartId = cart.Id,
                ProductId = request.ProductId,
                Quantity = request.Quantity,
                Product = product   // se asigna para que nunca quede null
            };
            cart.Items.Add(newItem);
            await _unitOfWork.CartItems.AddAsync(newItem);
        }

        cart.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        var refreshed = await _unitOfWork.Carts.GetByUserIdWithItemsAsync(userId);
        return Ok(await BuildCartDto(refreshed ?? cart));
    }

    [HttpPut("items/{itemId}")]
    public async Task<ActionResult<CartDto>> UpdateItem(Guid itemId, [FromBody] UpdateCartItemRequest request)
    {
        var userId = GetUserId();
        var cart = await _unitOfWork.Carts.GetByUserIdWithItemsAsync(userId);

        if (cart == null)
            return NotFound(new { message = "Carrito no encontrado" });

        var item = cart.Items.FirstOrDefault(i => i.Id == itemId);
        if (item == null)
            return NotFound(new { message = "Item no encontrado" });

        if (request.Quantity <= 0)
        {
            cart.Items.Remove(item);
            await _unitOfWork.CartItems.DeleteAsync(item);
        }
        else
        {
            var stock = item.Product?.Stock ?? 0;
            if (request.Quantity > stock)
                return BadRequest(new { message = $"Stock insuficiente. Disponible: {stock}" });

            item.Quantity = request.Quantity;
        }

        cart.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        var refreshed = await _unitOfWork.Carts.GetByUserIdWithItemsAsync(userId);
        return Ok(await BuildCartDto(refreshed ?? cart));
    }

    [HttpDelete("items/{itemId}")]
    public async Task<ActionResult<CartDto>> RemoveItem(Guid itemId)
    {
        var userId = GetUserId();
        var cart = await _unitOfWork.Carts.GetByUserIdWithItemsAsync(userId);

        if (cart == null)
            return NotFound(new { message = "Carrito no encontrado" });

        var item = cart.Items.FirstOrDefault(i => i.Id == itemId);
        if (item == null)
            return NotFound(new { message = "Item no encontrado" });

        cart.Items.Remove(item);
        await _unitOfWork.CartItems.DeleteAsync(item);

        cart.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        var refreshed = await _unitOfWork.Carts.GetByUserIdWithItemsAsync(userId);
        return Ok(await BuildCartDto(refreshed ?? cart));
    }

    [HttpPost("apply-coupon")]
    public async Task<ActionResult<CartDto>> ApplyCoupon([FromBody] ApplyCouponRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.CouponCode))
            return BadRequest(new { message = "Ingresa un código de cupón" });

        var userId = GetUserId();
        var cart = await GetOrCreateCartAsync(userId);

        var code = request.CouponCode.Trim().ToUpperInvariant();
        var rule = await _unitOfWork.DiscountRules.GetByCouponCodeAsync(code);

        if (rule == null)
            return BadRequest(new { message = "Cupón inválido o expirado" });

        if (rule.StartDate > DateTime.UtcNow)
            return BadRequest(new { message = "Este cupón aún no está vigente" });

        if (rule.EndDate < DateTime.UtcNow)
            return BadRequest(new { message = "Este cupón ha expirado" });

        if (rule.MaxUses.HasValue && rule.TimesUsed >= rule.MaxUses.Value)
            return BadRequest(new { message = "Este cupón ya alcanzó su límite de usos" });

        cart.CouponCode = code;
        cart.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        var refreshed = await _unitOfWork.Carts.GetByUserIdWithItemsAsync(userId);
        return Ok(await BuildCartDto(refreshed ?? cart));
    }

    [HttpDelete("remove-coupon")]
    public async Task<ActionResult<CartDto>> RemoveCoupon()
    {
        var userId = GetUserId();
        var cart = await _unitOfWork.Carts.GetByUserIdWithItemsAsync(userId);

        if (cart == null)
            return NotFound(new { message = "Carrito no encontrado" });

        cart.CouponCode = null;
        cart.UpdatedAt = DateTime.UtcNow;
        await _unitOfWork.SaveChangesAsync();

        var refreshed = await _unitOfWork.Carts.GetByUserIdWithItemsAsync(userId);
        return Ok(await BuildCartDto(refreshed ?? cart));
    }

    /// <summary>ImageUrls guarda una o varias URLs separadas por saltos de línea o comas.</summary>
    private static string? FirstImage(string? imageUrls) =>
        imageUrls?
            .Split(new[] { '\n', '\r', ',' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .FirstOrDefault();

    private async Task<CartDto> BuildCartDto(ShoppingCart cart)
    {
        // Se descartan items cuyo producto ya no exista para evitar null en los cálculos.
        var items = cart.Items.Where(i => i.Product != null).ToList();

        var subtotal = items.Sum(i => i.Product.Price * i.Quantity);
        var pricingResult = await _pricingEngine.CalculateAsync(cart);

        return new CartDto
        {
            Id = cart.Id,
            CouponCode = cart.CouponCode,
            Subtotal = decimal.Round(subtotal, 2),
            TotalDiscount = decimal.Round(pricingResult.TotalDiscount, 2),
            Total = decimal.Round(subtotal - pricingResult.TotalDiscount, 2),
            Items = items.Select(i => new CartItemDto
            {
                Id = i.Id,
                ProductId = i.ProductId,
                ProductName = i.Product.Name,
                ProductImage = FirstImage(i.Product.ImageUrls),
                CategoryName = i.Product.Category?.Name ?? "",
                BrandName = i.Product.Brand?.Name ?? "",
                Stock = i.Product.Stock,
                UnitPrice = decimal.Round(i.Product.Price, 2),
                Quantity = i.Quantity,
                Subtotal = decimal.Round(i.Product.Price * i.Quantity, 2)
            }).ToList(),
            AppliedDiscounts = pricingResult.AppliedDiscounts.Select(d => new AppliedDiscountDto
            {
                RuleName = d.RuleName,
                Description = d.Description,
                DiscountAmount = decimal.Round(d.DiscountAmount, 2)
            }).ToList()
        };
    }
}
