# TechStore — E-commerce de Tecnología (Costa Rica)

Cliente: **TechStore (Pyme)** · Propietario: **Alfredo Rodríguez**
Proyecto SC-803 Implantación de Sistemas · Grupo 4 · Universidad Fidélitas

Aplicación web completa con **ASP.NET Core 8 Web API** + **React 18 (TypeScript, Tailwind)** + **SQL Server** (local y Amazon RDS).
El núcleo es un **motor de precios y descuentos** con 7 tipos de reglas, prioridades y acumulabilidad.
Catálogo de 71 productos en 12 categorías con precios en colones (IVA incluido).

---

## 1. Levantar el proyecto en tu computadora

> No necesitas `dotnet ef` ni migraciones: la API crea la base de datos y carga los datos al arrancar.

### Paso 1 — Copiar el proyecto
1. Cierra Visual Studio y las terminales.
2. **Borra por completo** `C:\Users\sebas\source\repos\TechStore`.
3. Extrae el ZIP para que quede `C:\Users\sebas\source\repos\TechStore\TechStore.sln`.

### Paso 2 — Borrar la base de datos anterior (OBLIGATORIO en esta versión)
El catálogo, los precios y la tabla de direcciones cambiaron. En **SSMS** ejecuta:

```sql
USE master;
GO
ALTER DATABASE TechStoreDb SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
GO
DROP DATABASE TechStoreDb;
GO
```

### Paso 3 — Revisar la cadena de conexión
En `src\TechStore.API\appsettings.json`, `Server=SEBAS_LAPTOP` debe coincidir con el nombre de tu servidor en SSMS.

### Paso 4 — Backend (terminal 1)
```powershell
cd C:\Users\sebas\source\repos\TechStore\src\TechStore.API
dotnet run
```
Debe mostrar `Now listening on: http://localhost:5000` y `Base de datos lista. Productos: 71, Usuarios: 1, Reglas: 7`.
Swagger: <http://localhost:5000/swagger>. **No cierres esta terminal.**

### Paso 5 — Frontend (terminal 2, botón `+` del panel Terminal)
```powershell
cd C:\Users\sebas\source\repos\TechStore\techstore-frontend
npm install
npm run dev
```
Abre <http://localhost:5173>.

### Paso 6 — Pruebas unitarias (opcional)
```powershell
cd C:\Users\sebas\source\repos\TechStore
dotnet test
```
28 pruebas (motor de precios y precio de vitrina).

### Paso 7 — Pruebas automatizadas de QA02 (140 casos)
Con el backend y el frontend corriendo, en una tercera terminal:
```powershell
cd C:\Users\sebas\source\repos\TechStore\tests\e2e
npm install
npx playwright install chromium firefox
npm test
npm run report
```
Detalle completo en `tests/e2e/README.md`.

---

## 2. Credenciales

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador (Alfredo Rodríguez) | `admin@techstore.com` | `Admin123!` |
| Cliente | regístrate en la app | mínimo 8 caracteres, una mayúscula y un número |

En desarrollo la contraseña del admin se restablece en cada arranque. En producción solo se crea la primera vez: **cámbiala desde Mi perfil > Seguridad** después de desplegar.

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

## 4. Despliegue en AWS

Se publica en **Amazon Web Services**: RDS for SQL Server Express (base de datos), Elastic Beanstalk (API + web) y CloudFront (HTTPS).
La guía paso a paso está en **[DESPLIEGUE-AWS.md](DESPLIEGUE-AWS.md)**.

---

## 5. Solución de problemas

| Síntoma | Solución |
|---|---|
| `Invalid object name ...` o columnas que no existen | La base es de una versión anterior. Bórrala (Paso 2) y vuelve a ejecutar `dotnet run`. |
| Login de admin falla en local | Reinicia el backend: en desarrollo la contraseña se restablece. |
| `ECONNREFUSED` en el frontend | El backend no está corriendo (terminal 1). |
| La web en AWS muestra 404 en `/` | No se ejecutó `npm run build` antes de `dotnet publish`. Repite la fase 4 de DESPLIEGUE-AWS.md. |
| Ambiente en rojo o error 500 en AWS | Elastic Beanstalk → Registros. Verifica `ConnectionStrings__DefaultConnection` y la regla MSSQL del grupo de seguridad de RDS. |
| Login o carrito devuelven 401 solo por CloudFront | La política de solicitud de origen debe ser AllViewerExceptHostHeader. |

---

## 6. Arquitectura

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
