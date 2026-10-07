# Pruebas automatizadas de TechStore (QA02)

Los **140 casos de prueba** del documento QA02 están automatizados. Cada prueba lleva en su título el mismo ID del Excel (`TC-001` … `TC-140`), así que el reporte se compara línea por línea con la matriz.

| Tipo | Herramienta | Casos | Archivo |
|---|---|---|---|
| Interfaz (E2E) y API | Playwright | TC-001 – TC-122 | `specs/01` a `specs/11` |
| Rendimiento | Grafana k6 | TC-123, TC-124 | `k6/*.js` |
| Rendimiento frontend, seguridad, responsive | Playwright | TC-125 – TC-133 | `specs/12-no-funcionales.spec.ts` |
| Accesibilidad | axe-core | TC-134 | `specs/12-no-funcionales.spec.ts` |
| Compatibilidad (Chrome, Firefox, Edge) | Playwright | TC-135 | `@compat` |
| Integridad, disponibilidad, unitarias | Playwright + xUnit | TC-136, TC-137, TC-139 | `specs/12-no-funcionales.spec.ts` |
| Vulnerabilidades | OWASP ZAP (Docker) | TC-131 | `specs/12-no-funcionales.spec.ts` |
| Respaldo y recuperación | Azure CLI | TC-138 | `scripts/azure/test-restore.ps1` |
| Instalación + humo | Azure CLI + Playwright | TC-140 | `scripts/azure/deploy.ps1`, `specs/13-humo.spec.ts` |

---

## 1. Preparar (una sola vez)

```powershell
cd C:\Users\sebas\source\repos\TechStore\tests\e2e
npm install
npx playwright install chromium firefox
```
Edge ya viene instalado en Windows.

**Opcionales** (si no están instalados, esas pruebas aparecen como *skipped* con el motivo):
- **k6** (TC-123, TC-124): `winget install k6 --source winget`
- **Docker Desktop** (TC-131, OWASP ZAP)
- **Azure CLI** (TC-138): `winget install Microsoft.AzureCLI`

## 2. Ejecutar

Necesitas el backend y el frontend corriendo (como siempre):
- Terminal 1: `cd src\TechStore.API` → `dotnet run`
- Terminal 2: `cd techstore-frontend` → `npm run dev`
- Terminal 3:

```powershell
cd C:\Users\sebas\source\repos\TechStore\tests\e2e
npm test              # 140 casos en Chrome (toma ~10-15 min)
npm run test:compat   # TC-135 en Chrome, Firefox y Edge
npm run report        # abre el reporte HTML con capturas de cada caso
```

Ejecutar solo un caso o un módulo:
```powershell
npx playwright test --grep "TC-055"
npx playwright test specs/05-motor-precios.spec.ts
npx playwright test --ui          # modo visual, para ver cada paso
```

> ⚠️ Las pruebas **restablecen la base de datos** al inicio de cada archivo (`POST /api/testing/reset`). Ese endpoint solo existe con `"Testing": { "Enabled": true }` (activado en `appsettings.Development.json`). En producción está apagado.

## 3. Evidencias para QA03

Cada ejecución guarda en `reports/`:
- `html/`: reporte navegable con una **captura de pantalla de cada caso** y video y traza de los que fallan.
- `junit.xml` y `results.json`: resultados para adjuntar o importar.
- `zap-report.html`: reporte de OWASP ZAP (si se ejecutó TC-131).

## 4. En Azure

Contra el ambiente QA (con `Testing__Enabled=true` en la configuración del App Service):
```powershell
$env:BASE_URL="https://techstore-qa.azurewebsites.net"
npm test
```

Prueba de humo contra producción (**no modifica datos**):
```powershell
$env:BASE_URL="https://techstore-cr.azurewebsites.net"
$env:ADMIN_PASSWORD="<contraseña actual del admin>"
npm run test:smoke
```

Despliegue automatizado + humo (TC-140) y respaldo (TC-138):
```powershell
$env:AZURE_RESOURCE_GROUP="rg-techstore"; $env:AZURE_WEBAPP="techstore-cr"
powershell -ExecutionPolicy Bypass -File scripts\azure\deploy.ps1

$env:AZURE_SQL_SERVER="techstore-sql-sr"; $env:AZURE_SQL_DB="TechStoreDb"
npx playwright test --grep "TC-138"
```
