# RNF-18: despliegue automatizado a AWS Elastic Beanstalk + prueba de humo.
#
# Requisitos: .NET 8 SDK, Node.js, AWS CLI v2 configurado (aws configure) y las variables:
#   AWS_REGION     (ej. us-east-1)
#   AWS_EB_APP     (ej. techstore)
#   AWS_EB_ENV     (ej. techstore-prod)
#   BASE_URL       (URL https de CloudFront, para la prueba de humo)
#
# Uso (desde tests\e2e):  powershell -ExecutionPolicy Bypass -File scripts\aws\deploy.ps1
$ErrorActionPreference = 'Stop'

foreach ($v in 'AWS_REGION', 'AWS_EB_APP', 'AWS_EB_ENV', 'BASE_URL') {
  if (-not (Get-Item "env:$v" -ErrorAction SilentlyContinue)) { throw "Falta la variable de entorno $v" }
}
$region = $env:AWS_REGION; $app = $env:AWS_EB_APP; $envName = $env:AWS_EB_ENV
$root = Resolve-Path "$PSScriptRoot\..\..\..\.."
$started = Get-Date
$label = "v" + (Get-Date -Format 'yyyyMMdd-HHmmss')

Write-Host '1/5 Compilando el frontend (wwwroot)...'
Push-Location "$root\techstore-frontend"
npm install
npm run build
Pop-Location

Write-Host '2/5 Publicando la API...'
$out = "$root\publish"
if (Test-Path $out) { Remove-Item $out -Recurse -Force }
dotnet publish "$root\src\TechStore.API\TechStore.API.csproj" -c Release -o $out
$zip = "$root\techstore-$label.zip"
Compress-Archive -Path "$out\*" -DestinationPath $zip -Force

Write-Host '3/5 Subiendo el paquete a S3...'
$bucket = aws elasticbeanstalk create-storage-location --region $region --query S3Bucket --output text
aws s3 cp $zip "s3://$bucket/$app/techstore-$label.zip" --region $region | Out-Null
aws elasticbeanstalk create-application-version --region $region --application-name $app --version-label $label `
  --source-bundle "S3Bucket=$bucket,S3Key=$app/techstore-$label.zip" | Out-Null

Write-Host "4/5 Desplegando la versión $label en $envName..."
aws elasticbeanstalk update-environment --region $region --environment-name $envName --version-label $label | Out-Null
aws elasticbeanstalk wait environment-updated --region $region --environment-names $envName
$health = aws elasticbeanstalk describe-environments --region $region --environment-names $envName --query 'Environments[0].Health' --output text
Write-Host "Salud del ambiente: $health"

Write-Host '5/5 Prueba de humo...'
Push-Location "$root\tests\e2e"
npx playwright test --project=chromium --grep "@smoke"
$code = $LASTEXITCODE
Pop-Location
Remove-Item $zip -Force

$minutes = ((Get-Date) - $started).TotalMinutes
Write-Host ("Despliegue terminado en {0:N1} min · {1}" -f $minutes, $env:BASE_URL)
if ($health -ne 'Green') { throw "El ambiente quedó en estado $health" }
if ($code -ne 0) { throw 'La prueba de humo falló' }
if ($minutes -ge 60) { throw 'El despliegue superó los 60 minutos (criterio RNF-18)' }
