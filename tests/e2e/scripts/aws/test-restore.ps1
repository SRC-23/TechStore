# RNF-16: prueba automatizada de respaldo y recuperación (Amazon RDS, restauración a un punto en el tiempo).
#
# Requisitos: AWS CLI v2 configurado (aws configure) y las variables de entorno:
#   AWS_REGION        (ej. us-east-1)
#   AWS_RDS_INSTANCE  (ej. techstore-db)
#
# Restaura la instancia al último punto disponible en una instancia nueva, espera a
# que quede disponible y la elimina. Criterio: disponible en menos de 60 minutos.
# Costo: la instancia temporal se cobra solo mientras existe (normalmente < 1 hora).
$ErrorActionPreference = 'Stop'

$region = $env:AWS_REGION
$source = $env:AWS_RDS_INSTANCE
if (-not $region -or -not $source) { throw 'Faltan AWS_REGION o AWS_RDS_INSTANCE' }

$target = "$source-restore-test"
$started = Get-Date

Write-Host "Restaurando $source (último punto restaurable) como $target..."
aws rds restore-db-instance-to-point-in-time --region $region `
  --source-db-instance-identifier $source --target-db-instance-identifier $target `
  --use-latest-restorable-time --db-instance-class db.t3.micro --no-publicly-accessible | Out-Null

try {
  aws rds wait db-instance-available --region $region --db-instance-identifier $target
  $status = aws rds describe-db-instances --region $region --db-instance-identifier $target --query 'DBInstances[0].DBInstanceStatus' --output text
  $minutes = ((Get-Date) - $started).TotalMinutes
  Write-Host ("Estado: {0} · Tiempo: {1:N1} min" -f $status, $minutes)

  if ($status -ne 'available') { throw "La instancia restaurada no quedó disponible (estado: $status)" }
  if ($minutes -ge 60) { throw ("La restauración tardó {0:N1} min (criterio: < 60 min)" -f $minutes) }
  Write-Host 'RNF-16 aprobado.'
}
finally {
  Write-Host "Eliminando $target..."
  aws rds delete-db-instance --region $region --db-instance-identifier $target --skip-final-snapshot --delete-automated-backups | Out-Null
}
