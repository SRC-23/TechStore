# TechStore — E-commerce de Tecnología (PYME)


## 1. Introducción

Cliente: **TechStore (Pyme)** · Propietario: **Alfredo Rodríguez**
Proyecto SC-803 Implantación de Sistemas · Grupo 5 · Universidad Fidélitas

Aplicación web completa con **ASP.NET Core 8 Web API** + **React 18 (TypeScript, Tailwind)** + **SQL Server / Azure SQL**.
El núcleo es un **motor de precios y descuentos** con 7 tipos de reglas, prioridades y acumulabilidad.Catálogo de 71 productos en 12 categorías con precios en colones (IVA incluido).

---

## 2. Credenciales

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador (Alfredo Rodríguez) | `admin@techstore.com` | `Admin123!` |
| Cliente | regístrate en la app | mínimo 8 caracteres, una mayúscula y un número |

En desarrollo la contraseña del admin se restablece en cada arranque. En producción solo se crea la primera vez.

---

## 3. Qué incluye

**Cliente:** catálogo con filtros (categorías, marcas, rango de precio, stock, orden), búsqueda, detalle con especificaciones, badge **OFERTA** y contador regresivo, carrito con descuentos en tiempo real, cupones, checkout con direcciones guardadas, historial y cancelación de pedidos, **Mi perfil** (datos, direcciones, contraseña).

**Administrador:** dashboard con ventas de hoy, semana y mes, **gráfico de 7 días**, pedidos por estado, top 5 y alertas de stock; CRUD de productos, **categorías y subcategorías**, reglas de descuento (con categorías y productos) y gestión de pedidos.

### Promociones precargadas

| Prioridad | Regla | Detalle |
|---|---|---|
| 1 | Cupón **TECH20** | 20 %, compras desde ₡50 000, máximo 50 usos, no acumulable |
| 2 | 10 % en Periféricos | Teclados, mouse y cámaras web |
| 3 | ₡25 000 en compras desde ₡300 000 | Monto fijo |
| 4 | 15 % llevando 3 o más | Por volumen, por producto |
| 5 | Temporada de Laptops | 10 % en Laptops durante 45 días |
| 6 | Combo Gamer | 10 % con G502 HERO + BlackWidow V4 + HyperX Cloud II |
| 7 | Oferta Relámpago | 15 % en JBL Flip 6, Redmi Note 13 Pro, Galaxy Watch6 y Switch OLED (21 días) |

---


## 4. Arquitectura

```
TechStore/
├── src/
│   ├── TechStore.Core/            Entidades, interfaces, motor de vitrina (sin dependencias)
│   ├── TechStore.Infrastructure/  EF Core, repositorios, Unit of Work, motor de precios, datos semilla
│   └── TechStore.API/             Controladores, DTOs, JWT, middleware, wwwroot (web compilada)
├── tests/TechStore.Tests/         Pruebas unitarias (xUnit + Moq)
└── techstore-frontend/            React 18 + TypeScript + Vite + Tailwind + Recharts
```

Patrones: Clean Architecture, Repository, Unit of Work, Strategy (motor de precios), Inyección de dependencias, DTO.
