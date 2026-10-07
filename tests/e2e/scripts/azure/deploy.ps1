# RNF-18: despliegue automatizado a Azure App Service + prueba de humo.
#
# Requisitos: .NET 8 SDK, Node.js, Azure CLI (az login hecho) y las variables:
#   AZURE_RESOURCE_GROUP  (ej. rg-techstore)
#   AZURE_WEBAPP          (ej. techstore-cr)
#
# Uso (desde tests\e2e):  powershell -ExecutionPolicy Bypass -File scripts\azure\deploy.ps1
$ErrorActionPreference = 'Stop'

$rg = $env:AZURE_RESOURCE_GROUP
$app = $env:AZURE_WEBAPP
if (-not $rg -or -not $app) { throw 'Faltan AZURE_RESOURCE_GROUP o AZURE_WEBAPP' }

$root = Resolve-Path "$PSScriptRoot\..\..\..\.."
$started = Get-Date

Write-Host '1/4 Compilando el frontend (wwwroot)...'
Push-Location "$root\techstore-frontend"
npm install
npm run build
Pop-Location

Write-Host '2/4 Publicando la API...'
$out = "$root\publish"
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
dotnet publish "$root\src\TechStore.API\TechStore.API.csproj" -c Release -o $out

Write-Host '3/4 Subiendo a Azure App Service...'
$zip = "$root\publish.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path "$out\*" -DestinationPath $zip
az webapp deploy --resource-group $rg --name $app --src-path $zip --type zip | Out-Null

Write-Host '4/4 Prueba de humo...'
$url = "https://$app.azurewebsites.net"
$env:BASE_URL = $url
Push-Location "$root\tests\e2e"
npx playwright test --project=chromium --grep "@smoke"
$code = $LASTEXITCODE
Pop-Location

$minutes = ((Get-Date) - $started).TotalMinutes
Write-Host ("Despliegue terminado en {0:N1} min · {1}" -f $minutes, $url)
if ($code -ne 0) { throw 'La prueba de humo falló' }
if ($minutes -ge 60) { throw 'El despliegue superó los 60 minutos (criterio RNF-18)' }
