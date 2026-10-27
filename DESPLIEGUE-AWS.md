# Despliegue de TechStore en AWS

| Pieza | Servicio | Detalle |
|---|---|---|
| Base de datos | **Amazon RDS for SQL Server Express** | `db.t3.micro`, bases `TechStoreDb` (producción) y `TechStoreDb_QA` |
| API + web | **AWS Elastic Beanstalk** | .NET 8 en Amazon Linux 2023, instancia única `t3.micro` |
| HTTPS | **Amazon CloudFront** | `https://xxxx.cloudfront.net` delante de Elastic Beanstalk |

Región para todo: **US East (N. Virginia) `us-east-1`**.

Cada fase termina con un **✅ Control**. Si no se cumple, no sigas a la siguiente fase.

---

## Fase 1 — Crear la cuenta

1. Entra a <https://aws.amazon.com/es/> → **Crear una cuenta de AWS**.
2. Correo, nombre de la cuenta (`techstore`) y el código que te llega al correo; luego crea la contraseña del usuario raíz.
3. Si te pregunta el plan, elige **Plan gratuito** (incluye créditos). Si más adelante algún servicio dice que no está disponible en el plan gratuito, cambia a **Plan de pago**: los créditos se siguen usando.
4. Tipo de cuenta **Personal**, tus datos, la **tarjeta** (cargo temporal de verificación de ~USD 1) y la verificación del teléfono por SMS.
5. Plan de soporte: **Básico (gratuito)**.
6. Inicia sesión en la **Consola** → arriba a la derecha:
   - Región: **EE. UU. Este (Norte de Virginia) us-east-1**.
   - Idioma (abajo a la izquierda, ⚙️): **Español** si lo prefieres.

**Seguridad (recomendado):** menú de tu cuenta → **Credenciales de seguridad** → **Asignar dispositivo MFA** → app de autenticación en tu celular nuevo. **Guarda los códigos o una captura en un lugar seguro.**

✅ **Control:** entras a la consola y arriba dice **N. Virginia**.

## Fase 2 — Alerta de gastos

1. Busca **Billing and Cost Management** → **Presupuestos** → **Crear presupuesto**.
2. **Usar una plantilla** → **Presupuesto de costo mensual**.
3. Monto: **10 USD**; correo: el tuyo → **Crear presupuesto**.

✅ **Control:** el presupuesto aparece en la lista. Si algún día el gasto se acerca a USD 10, te llega un correo.

## Fase 3 — Base de datos (RDS SQL Server Express)

1. Busca **RDS** → **Crear base de datos**.
2. **Creación estándar** → motor **Microsoft SQL Server** → edición **SQL Server Express Edition** → versión: la predeterminada.
3. Plantilla: **Capa gratuita** si aparece; si no, **Desarrollo y pruebas**.
4. **Configuración:**
   - Identificador de instancia: `techstore-db`
   - Nombre de usuario maestro: `admin`
   - Administración de credenciales: **Autoadministrado** → escribe una contraseña segura (**sin `;`, `@`, `"` ni `/`**) y anótala.
5. **Configuración de la instancia:** `db.t3.micro`.
6. **Almacenamiento:** 20 GiB `gp3`; desmarca **Habilitar escalado automático del almacenamiento**.
7. **Conectividad:**
   - Recurso de computación: **No conectarse a un recurso de computación EC2**
   - VPC: la predeterminada
   - **Acceso público: Sí**
   - Grupo de seguridad de VPC: **Crear nuevo** → nombre `techstore-db-sg`
   - Puerto: `1433`
8. **Configuración adicional → Copia de seguridad:** retención de **7 días** (RNF-16).
9. **Crear base de datos**. Tarda 10–20 minutos.

Cuando el estado sea **Disponible**, abre `techstore-db` → **Conectividad y seguridad** → copia el **Punto de enlace** (algo como `techstore-db.xxxxxx.us-east-1.rds.amazonaws.com`).

**Cadena de conexión** (en un bloc de notas, no la compartas):
```
Server=PUNTO-DE-ENLACE,1433;Database=TechStoreDb;User Id=admin;Password=TU-CONTRASEÑA;Encrypt=True;TrustServerCertificate=True;MultipleActiveResultSets=true
```
No hace falta crear la base `TechStoreDb`: la aplicación la crea al arrancar.

✅ **Control:** en **SSMS** → Conectar:
- Nombre del servidor: `PUNTO-DE-ENLACE,1433` (con la coma y el puerto)
- Autenticación: **Autenticación de SQL Server** → `admin` + contraseña
- Pestaña *Opciones* o casilla del formulario: **Confiar en el certificado del servidor** ✔

Debe conectar y mostrar solo las bases del sistema.

> Si SSMS no conecta: RDS → `techstore-db` → **Grupos de seguridad de VPC** → `techstore-db-sg` → **Reglas de entrada** → debe haber una regla **MSSQL / 1433** con origen **Mi IP**. Si tu IP cambió, edítala y vuelve a elegir **Mi IP**.

## Fase 4 — Preparar el paquete de la aplicación

En PowerShell:
```powershell
cd C:\Users\sebas\source\repos\TechStore\techstore-frontend
npm install
npm run build

cd ..\src\TechStore.API
dotnet publish -c Release -o ..\..\publish

cd ..\..\publish
Compress-Archive -Path * -DestinationPath ..\techstore-v1.zip -Force
```
Si `npm run build` muestra errores `error TS...`, usa `npm run build:fast` y avísame los errores.

✅ **Control:** existe `C:\Users\sebas\source\repos\TechStore\techstore-v1.zip`, y al abrirlo se ven **directamente** `TechStore.API.dll` y la carpeta `wwwroot` (no una carpeta `publish` adentro).

## Fase 5 — Elastic Beanstalk (producción)

### 5.1 Rol para las instancias (solo la primera vez)
1. Busca **IAM** → **Roles** → **Crear rol**.
2. Entidad de confianza: **Servicio de AWS** → caso de uso **EC2** → Siguiente.
3. Marca las políticas `AWSElasticBeanstalkWebTier`, `AWSElasticBeanstalkWorkerTier` y `AWSElasticBeanstalkMulticontainerDocker`.
4. Nombre del rol: `aws-elasticbeanstalk-ec2-role` → **Crear rol**.

### 5.2 Crear el ambiente
1. Busca **Elastic Beanstalk** → **Crear aplicación**.
2. **Paso 1:**
   - Nivel: **Entorno de servidor web**
   - Nombre de la aplicación: `techstore`
   - Nombre del entorno: `techstore-prod`; dominio: `techstore-prod` → **Comprobar disponibilidad** (si está ocupado, agrégale tus iniciales)
   - Plataforma: **.NET Core on Linux** → rama **.NET 8 running on 64bit Amazon Linux 2023**
   - Código de la aplicación: **Cargar el código** → etiqueta `v1` → **Archivo local** → `techstore-v1.zip`
   - Ajustes preestablecidos: **Instancia única (apta para la capa gratuita)**
3. **Paso 2 (acceso al servicio):**
   - Rol de servicio: **Crear y usar un rol de servicio nuevo**
   - Perfil de instancia de EC2: `aws-elasticbeanstalk-ec2-role`
   - Par de claves: ninguno
4. **Paso 3 (redes):** VPC predeterminada · **Dirección IP pública: Activada** · marca una subred.
5. **Paso 4 (instancias):** deja lo predeterminado; en tipos de instancia deja solo **t3.micro**.
6. **Paso 5 (monitoreo y propiedades):** baja hasta **Propiedades del entorno** → **Agregar propiedad del entorno** para cada una:

   | Nombre | Valor |
   |---|---|
   | `ConnectionStrings__DefaultConnection` | la cadena de la fase 3 |
   | `JwtSettings__SecretKey` | una clave aleatoria (ver abajo) |
   | `Swagger__Enabled` | `true` |
   | `ASPNETCORE_ENVIRONMENT` | `Production` |

   Para generar la clave, en PowerShell:
   ```powershell
   [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
   ```
7. **Revisar** → **Enviar**. Tarda 5–10 minutos.

### 5.3 Permitir que la aplicación llegue a la base de datos
La primera vez el ambiente puede quedar en **rojo**: la instancia todavía no tiene permiso de entrar a RDS.

1. **EC2** → **Grupos de seguridad** → copia el **ID** del grupo cuyo nombre contiene `techstore-prod` y `AWSEBSecurityGroup` (ej. `sg-0abc...`).
2. Abre `techstore-db-sg` → **Editar reglas de entrada** → **Agregar regla**: Tipo **MSSQL**, Origen **Personalizado** → pega el ID del paso anterior → **Guardar reglas**.
3. **Elastic Beanstalk** → `techstore-prod` → **Acciones** → **Reiniciar servidores de aplicaciones**.

✅ **Control** (1–2 minutos después):
- El estado del ambiente es **Ok (verde)**.
- El **Dominio** del ambiente (`http://techstore-prod.us-east-1.elasticbeanstalk.com`) muestra la tienda, y `/swagger` muestra la API.
- En SSMS aparece la base `TechStoreDb` y `SELECT COUNT(*) FROM TechStoreDb.dbo.Products;` devuelve **71**.

> Si sigue en rojo: `techstore-prod` → **Registros** → **Solicitar registros → Últimas 100 líneas** → descarga y mándame lo que diga `web.stdout.log`.

## Fase 6 — CloudFront (HTTPS)

1. Busca **CloudFront** → **Crear distribución**.
2. Si pide elegir plan, elige **Gratis** (o *Pago por uso*; con este tráfico cuesta ~USD 0).
3. **Origen:**
   - Dominio de origen: el dominio de Elastic Beanstalk **sin** `http://` (`techstore-prod.us-east-1.elasticbeanstalk.com`)
   - Protocolo: **Solo HTTP**, puerto **80**
4. **Comportamiento de caché predeterminado:**
   - Política de protocolo del visor: **Redirect HTTP to HTTPS**
   - Métodos HTTP permitidos: **GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE**
   - Política de caché: **CachingDisabled**
   - Política de solicitud de origen: **AllViewerExceptHostHeader**
5. **Firewall de aplicaciones web (WAF):** **No habilitar** (para no generar costo).
6. **Crear distribución**. Tarda 5–15 minutos en quedar *Implementado*.

Copia el **Nombre de dominio de distribución** (`xxxxxxxx.cloudfront.net`).

✅ **Control:**
- `https://xxxxxxxx.cloudfront.net` muestra la tienda con candado 🔒.
- `http://xxxxxxxx.cloudfront.net` redirige a `https://`.
- Inicia sesión y agrega algo al carrito: debe funcionar igual que en tu computadora.

> Si el carrito o el login devuelven **401** solo por CloudFront: revisa que la política de solicitud de origen sea **AllViewerExceptHostHeader** (es la que reenvía el encabezado `X-Auth-Token`).

## Fase 7 — Asegurar el administrador

En producción la contraseña del admin no se restablece sola.
1. `https://xxxxxxxx.cloudfront.net` → inicia sesión con `admin@techstore.com` / `Admin123!`.
2. **Mi perfil → Seguridad** → cambia la contraseña y guárdala.

✅ **Control:** entras con la contraseña nueva.

## Fase 8 — Ambiente QA para el grupo par

Las pruebas automatizadas reinician los datos, así que van contra un ambiente **separado**: misma instancia RDS, otra base y otro ambiente de Elastic Beanstalk.

1. **Elastic Beanstalk** → aplicación `techstore` → **Crear entorno** → servidor web → nombre `techstore-qa` → misma plataforma → **Versión existente** `v1` → **Instancia única**.
2. Mismos pasos de la fase 5.2, con estas propiedades:

   | Nombre | Valor |
   |---|---|
   | `ConnectionStrings__DefaultConnection` | la misma cadena pero con `Database=TechStoreDb_QA` |
   | `JwtSettings__SecretKey` | otra clave aleatoria |
   | `Swagger__Enabled` | `true` |
   | `ASPNETCORE_ENVIRONMENT` | `Production` |
   | `Testing__Enabled` | `true` ← **solo en QA, nunca en producción** |
3. Repite la fase 5.3 con el grupo de seguridad de `techstore-qa`.

✅ **Control:** desde tu computadora:
```powershell
cd C:\Users\sebas\source\repos\TechStore\tests\e2e
$env:BASE_URL="http://techstore-qa.us-east-1.elasticbeanstalk.com"
npx playwright test specs/01-autenticacion.spec.ts
```

## Fase 9 — Nuevas versiones

Cada vez que cambies el código:
1. Repite la **fase 4** con otro nombre (`techstore-v2.zip`).
2. Elastic Beanstalk → `techstore-prod` → **Cargar e implementar** → elige el zip → etiqueta `v2` → **Implementar**.

También puedes usar el script automatizado `tests/e2e/scripts/aws/deploy.ps1`, que además corre la prueba de humo (requiere AWS CLI).

## Costos aproximados

| Recurso | Costo aprox. al mes |
|---|---|
| RDS SQL Server Express `db.t3.micro` + 20 GB | USD 15–20 |
| Elastic Beanstalk `t3.micro` (producción) | USD 7–9 |
| Elastic Beanstalk `t3.micro` (QA, opcional) | USD 7–9 |
| CloudFront | ~USD 0 |

Todo se descuenta de los créditos de la cuenta nueva.

**Para ahorrar:**
- RDS → **Acciones → Detener temporalmente** (hasta 7 días; luego AWS la vuelve a encender).
- Cuando termine el curso: **elimina** los ambientes de Elastic Beanstalk, la instancia RDS y la distribución de CloudFront.
