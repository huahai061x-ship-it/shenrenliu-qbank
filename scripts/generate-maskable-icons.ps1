# All icon resources now share the vector master (including maskable).
$ErrorActionPreference='Stop'
node (Join-Path $PSScriptRoot 'generate-icons.cjs')
if($LASTEXITCODE -ne 0){throw 'Vector icon generation failed'}
