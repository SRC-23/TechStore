# TechStore — E-commerce de Tecnología (Costa Rica)

Cliente: **TechStore (Pyme)** · Propietario: **Alfredo Rodríguez**
Proyecto SC-803 Implantación de Sistemas · Grupo 5 · Universidad Fidélitas

Aplicación web completa con **ASP.NET Core 8 Web API** + **React 18 (TypeScript, Tailwind)** + **SQL Server / Azure SQL**.
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

## 4. Despliegue en Azure

La API sirve también la web compilada, así que todo vive en **un solo App Service** con HTTPS y una base **Azure SQL**.

### 4.1 Crear la cuenta
1. Entra a <https://azure.microsoft.com/es-es/free/students> con tu correo de la universidad. Azure for Students da crédito sin tarjeta.

### 4.2 Base de datos (Azure SQL Database)
1. Portal de Azure → **Crear un recurso** → **SQL Database**.
2. Grupo de recursos: **Nuevo** → `rg-techstore`.
3. Nombre de la base: `TechStoreDb`.
4. Servidor: **Crear nuevo** → nombre `techstore-sql-<tus iniciales>`, región la más cercana permitida (p. ej. *East US 2*), autenticación **SQL**, usuario `techstoreadmin` y una contraseña segura (**anótalas**).
5. En *Proceso y almacenamiento*, si aparece la opción **"Aplicar oferta gratuita"**, actívala (serverless gratis).
6. Pestaña **Redes**: conectividad *Punto de conexión público*, **Permitir que los servicios y recursos de Azure accedan a este servidor = Sí** y **Agregar la dirección IP del cliente actual = Sí** (para verla desde SSMS).
7. **Revisar y crear**.
8. Cuando termine: base de datos → **Cadenas de conexión** → copia la de **ADO.NET**. Se ve así:
   ```
   Server=tcp:techstore-sql-xx.database.windows.net,1433;Initial Catalog=TechStoreDb;Persist Security Info=False;User ID=techstoreadmin;Password={tu_contraseña};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;
   ```
   Reemplaza `{tu_contraseña}`.

### 4.3 Aplicación web (App Service)
1. **Crear un recurso** → **Aplicación web**.
2. Grupo de recursos `rg-techstore`; nombre `techstore-cr` (será `https://techstore-cr.azurewebsites.net`).
3. Publicar: **Código** · Pila: **.NET 8 (LTS)** · Sistema operativo: **Linux** · misma región que la base.
4. Plan: **Básico B1** (el gratuito F1 se queda corto para la demo).
5. **Revisar y crear**.
6. En la app creada → **Configuración** (o *Variables de entorno*):
   - Pestaña **Cadenas de conexión** → Agregar: nombre `DefaultConnection`, valor = cadena del paso 4.2, tipo **SQLAzure**.
   - Pestaña **Configuración de la aplicación** → agregar:
     | Nombre | Valor |
     |---|---|
     | `JwtSettings__SecretKey` | una clave larga y aleatoria (32+ caracteres) |
     | `Swagger__Enabled` | `true` (para que el grupo par pruebe la API; ponlo en `false` al terminar) |
   - **Guardar**.
7. **Configuración → General**: **Solo HTTPS = Activado**.

### 4.4 Publicar desde tu computadora
1. Compila el frontend (queda dentro de la API en `wwwroot`):
   ```powershell
   cd C:\Users\sebas\source\repos\TechStore\techstore-frontend
   npm install
   npm run build
   ```
   Si `npm run build` muestra errores de tipos, usa `npm run build:fast` y avísame el error.
2. En Visual Studio: clic derecho en **TechStore.API** → **Publicar** → **Azure** → **Azure App Service (Linux)** → inicia sesión → elige `techstore-cr` → **Finalizar** → **Publicar**.
3. Al terminar se abre `https://techstore-cr.azurewebsites.net`. El primer arranque crea las tablas y carga el catálogo (puede tardar 1–2 minutos si la base estaba pausada).

### 4.5 Verificar
- `https://techstore-cr.azurewebsites.net` → tienda con 71 productos.
- `https://techstore-cr.azurewebsites.net/swagger` → API.
- Inicia sesión como admin, **cambia la contraseña** y revisa el dashboard.
- Si algo falla: App Service → **Secuencia de registro** (Log stream) muestra el error real.

### 4.6 Costos
Azure SQL con oferta gratuita: ₡0. App Service B1: unos USD 13 al mes, descontados del crédito de Azure for Students. Ojo: **detener la app no detiene el cobro del plan**. Para ahorrar crédito cuando no la uses, cambia el plan a **F1 (gratis)** en *Escalar verticalmente* y vuelve a B1 antes de una demo.

---

## 5. Solución de problemas

| Síntoma | Solución |
|---|---|
| `Invalid object name ...` o columnas que no existen | La base es de una versión anterior. Bórrala (Paso 2) y vuelve a ejecutar `dotnet run`. |
| Login de admin falla en local | Reinicia el backend: en desarrollo la contraseña se restablece. |
| `ECONNREFUSED` en el frontend | El backend no está corriendo (terminal 1). |
| La web en Azure muestra 404 en `/` | No se ejecutó `npm run build` antes de publicar. Hazlo y vuelve a publicar. |
| Error 500 en Azure | Revisa *Log stream*. Verifica la cadena `DefaultConnection` y que el firewall del servidor SQL permita servicios de Azure. |
| La primera carga en Azure tarda | La base gratuita se pausa sin uso; la app reintenta automáticamente mientras despierta. |

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
