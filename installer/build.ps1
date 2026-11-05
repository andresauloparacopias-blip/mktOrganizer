param(
 [string]$Source=(Join-Path $PSScriptRoot '..\extension'),
 [string]$Output=(Join-Path $PSScriptRoot '..\dist')
)
$ErrorActionPreference='Stop'
$sourcePath=(Resolve-Path -LiteralPath $Source).Path
$outputPath=[IO.Path]::GetFullPath($Output)
$temp=Join-Path $outputPath ('build-'+[guid]::NewGuid().ToString('N'))
$payload=Join-Path $temp 'payload'
New-Item -ItemType Directory -Path $payload,$outputPath -Force | Out-Null
$names=@('background.js','content.js','early.js','LEIA-ME.md','manifest.json','office-preview.js','offscreen.html','offscreen.js','page-bridge.js','theme.css','local-update.js','update-state.json')
foreach($name in $names){Copy-Item -LiteralPath (Join-Path $sourcePath $name) -Destination (Join-Path $payload $name)}
foreach($name in @('assets','icons','vendor')){Copy-Item -LiteralPath (Join-Path $sourcePath $name) -Destination $payload -Recurse}
$version=(Get-Content -LiteralPath (Join-Path $payload 'manifest.json') -Raw | ConvertFrom-Json).version
if($version -notmatch '^\d+(\.\d+){0,3}$'){throw 'Versão inválida'}
$state=Get-Content -LiteralPath (Join-Path $payload 'update-state.json') -Raw | ConvertFrom-Json
if($state.version -ne $version -or !$state.ready){throw 'O estado do pacote precisa corresponder à versão do manifesto.'}
$utf8=[Text.UTF8Encoding]::new($false)
Add-Type -AssemblyName System.IO.Compression,System.IO.Compression.FileSystem,System.Drawing
$zipPath=Join-Path $outputPath 'extension.zip'
if(Test-Path -LiteralPath $zipPath){Remove-Item -LiteralPath $zipPath}
$index=[Collections.Generic.List[string]]::new()
$zip=[IO.Compression.ZipFile]::Open($zipPath,[IO.Compression.ZipArchiveMode]::Create)
try{foreach($file in (Get-ChildItem -LiteralPath $payload -File -Recurse | Sort-Object FullName)){
 $relative=$file.FullName.Substring($payload.Length+1).Replace('\','/')
 [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip,$file.FullName,$relative,[IO.Compression.CompressionLevel]::Optimal) | Out-Null
 $index.Add((Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()+"`t"+$relative)
}}finally{$zip.Dispose()}
[IO.File]::WriteAllLines((Join-Path $temp 'files.sha256'),$index,$utf8)
$image=[Drawing.Bitmap]::new((Join-Path $payload 'icons\icon128.png'))
$icon=[Drawing.Icon]::FromHandle($image.GetHicon());$stream=[IO.File]::Create((Join-Path $temp 'app.ico'))
try{$icon.Save($stream)}finally{$stream.Dispose();$icon.Dispose();$image.Dispose()}
foreach($name in @('Installer.cs','Updater.cs','app.manifest')){
 [IO.File]::WriteAllText((Join-Path $temp $name),[IO.File]::ReadAllText((Join-Path $PSScriptRoot $name)).Replace('3.3.48',$version),$utf8)
}
$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if(!(Test-Path -LiteralPath $compiler)){$compiler=Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'}
$references=@('/reference:System.Windows.Forms.dll','/reference:System.Drawing.dll','/reference:System.Core.dll','/reference:System.IO.Compression.dll','/reference:System.IO.Compression.FileSystem.dll','/reference:System.Net.Http.dll','/reference:System.Web.Extensions.dll','/reference:Microsoft.CSharp.dll','/reference:System.Xml.dll')
$updater=Join-Path $outputPath 'Atualizador.exe'
& $compiler /nologo /target:winexe /main:UpdaterProgram /platform:anycpu /optimize+ "/out:$updater" "/win32manifest:$(Join-Path $temp 'app.manifest')" "/win32icon:$(Join-Path $temp 'app.ico')" @references (Join-Path $temp 'Installer.cs') (Join-Path $temp 'Updater.cs')
if($LASTEXITCODE -ne 0){throw 'Falha ao compilar o atualizador'}
$exe=Join-Path $outputPath 'Instalar MKT ORGANIZER.exe'
& $compiler /nologo /target:winexe /main:Program /platform:anycpu /optimize+ "/out:$exe" "/win32manifest:$(Join-Path $temp 'app.manifest')" "/win32icon:$(Join-Path $temp 'app.ico')" @references "/resource:$zipPath,extension.zip" "/resource:$(Join-Path $temp 'files.sha256'),files.sha256" "/resource:$(Join-Path $temp 'app.ico'),app.ico" "/resource:$(Join-Path $payload 'icons\icon128.png'),icon128.png" "/resource:$updater,updater.exe" (Join-Path $temp 'Installer.cs') (Join-Path $temp 'Updater.cs')
if($LASTEXITCODE -ne 0){throw 'Falha ao compilar o instalador'}
$metadata=@{version=$version;archiveUrl="https://github.com/andresauloparacopias-blip/mktOrganizer/releases/download/v$version/extension.zip";sha256=(Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()}
[IO.File]::WriteAllText((Join-Path $outputPath 'update.json'),($metadata | ConvertTo-Json)+"`n",$utf8)
Get-Item -LiteralPath $exe,$updater,$zipPath | Select-Object Name,Length
