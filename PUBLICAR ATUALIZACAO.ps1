param([string]$Source=(Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'MKTZAP\MKT ORGANIZER'))
$ErrorActionPreference='Stop'
Set-Location -LiteralPath $PSScriptRoot
$git=Get-Command git -ErrorAction Stop
& $git.Source diff --quiet
if($LASTEXITCODE -ne 0){throw 'O repositório já tem alterações. Revise-as antes de copiar outra versão.'}
& $git.Source diff --cached --quiet
if($LASTEXITCODE -ne 0){throw 'Há alterações preparadas para commit. Revise-as antes de publicar.'}
$old=(Get-Content -LiteralPath extension/manifest.json -Raw | ConvertFrom-Json).version
$new=(Get-Content -LiteralPath (Join-Path $Source 'manifest.json') -Raw | ConvertFrom-Json).version
if([version]$new -le [version]$old){throw "A versão $new precisa ser maior do que $old."}
$rootFiles=@('background.js','content.js','early.js','LEIA-ME.md','manifest.json','office-preview.js','offscreen.html','offscreen.js','page-bridge.js','theme.css','local-update.js','update-state.json')
foreach($name in $rootFiles){Copy-Item -LiteralPath (Join-Path $Source $name) -Destination (Join-Path $PSScriptRoot ('extension\'+$name)) -Force}
foreach($name in @('assets','icons','vendor')){Copy-Item -LiteralPath (Join-Path $Source $name) -Destination (Join-Path $PSScriptRoot extension) -Recurse -Force}
$state=Get-Content -LiteralPath extension/update-state.json -Raw | ConvertFrom-Json
if($state.version -ne $new -or !$state.ready){throw 'Atualize update-state.json para a mesma versão do manifesto.'}
foreach($name in @('background.js','content.js','local-update.js')){& node --check (Join-Path $PSScriptRoot ('extension\'+$name));if($LASTEXITCODE -ne 0){throw "JavaScript inválido: $name"}}
& $git.Source add -- extension
& $git.Source commit -m "Publica MKT ORGANIZER $new"
if($LASTEXITCODE -ne 0){throw 'Não foi possível criar o commit'}
& $git.Source push origin main
if($LASTEXITCODE -ne 0){throw 'O envio falhou. O commit ficou salvo localmente; autentique o Git e tente git push origin main.'}
Write-Host "Versão $new enviada. Acompanhe a compilação em https://github.com/andresauloparacopias-blip/mktOrganizer/actions"
