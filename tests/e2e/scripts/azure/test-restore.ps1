# RNF-16: prueba automatizada de respaldo y recuperación (Azure SQL, restauración a un punto en el tiempo).
#
# Requisitos: Azure CLI (az login hecho) y las variables de entorno:
#   AZURE_RESOURCE_GROUP  (ej. rg-techstore)
#   AZURE_SQL_SERVER      (ej. techstore-sql-sr, sin .database.windows.net)
#   AZURE_SQL_DB          (ej. TechStoreDb)
#
# Criterio: la base restaurada queda disponible en menos de 30 minutos y luego se elimina.
$ErrorActionPreference = 'Stop'

$rg = $env:AZURE_RESOURCE_GROUP
$server = $env:AZURE_SQL_SERVER
$db = $env:AZURE_SQL_DB
if (-not $rg -or -not $server -or -not $db) { throw 'Faltan AZURE_RESOURCE_GROUP, AZURE_SQL_SERVER o AZURE_SQL_DB' }

$restoreName = "$db-restore-test"
$pointInTime = (Get-Date).ToUniversalTime().AddMinutes(-15).ToString('yyyy-MM-ddTHH:mm:ss')
$started = Get-Date

Write-Host "Restaurando $db al punto $pointInTime UTC como $restoreName..."
az sql db restore --resource-group $rg --server $server --name $db --dest-name $restoreName --time $pointInTime --edition GeneralPurpose --compute-model Serverless --family Gen5 --capacity 1 | Out-Null

$state = az sql db show --resource-group $rg --server $server --name $restoreName --query status -o tsv
$minutes = ((Get-Date) - $started).TotalMinutes
Write-Host ("Estado: {0} · Tiempo: {1:N1} min" -f $state, $minutes)

try {
  if ($state -ne 'Online') { throw "La base restaurada no quedó Online (estado: $state)" }
  if ($minutes -ge 30) { throw ("La restauración tardó {0:N1} min (criterio: < 30 min)" -f $minutes) }
  Write-Host 'RNF-16 aprobado.'
}
finally {
  Write-Host "Eliminando $restoreName..."
  az sql db delete --resource-group $rg --server $server --name $restoreName --yes | Out-Null
}
