param([switch]$OpenBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$loginUrl = 'http://127.0.0.1:4321/admin/login/'

function Test-Amela {
    try {
        $response = Invoke-WebRequest -Uri $loginUrl -UseBasicParsing -TimeoutSec 3
        return $response.StatusCode -eq 200 -and $response.Content.Contains('id="admin-login"')
    } catch { return $false }
}

try {
    if (-not (Test-Amela)) {
        $nodePath = (Get-Command node.exe -ErrorAction Stop).Source
        $logDirectory = Join-Path $projectRoot 'test-results'
        New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
        $serverScript = Join-Path $PSScriptRoot 'local-server.mjs'
        $serverProcess = Start-Process -FilePath $nodePath -ArgumentList @('"' + $serverScript + '"') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory 'local-server.log') -RedirectStandardError (Join-Path $logDirectory 'local-server-error.log') -PassThru
        $ready = $false
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            if (Test-Amela) { $ready = $true; break }
            $serverProcess.Refresh()
            if ($serverProcess.HasExited) { break }
            Start-Sleep -Milliseconds 500
        }
        if (-not $ready) { throw "No se pudo iniciar AMELA. Revisa test-results/local-server-error.log; el puerto 4321 puede estar ocupado." }
    }
    Write-Output 'AMELA esta disponible: http://127.0.0.1:4321/'
    Write-Output "Administracion: $loginUrl"
    if ($OpenBrowser) { Start-Process $loginUrl }
} catch {
    Write-Error $_
    exit 1
}
