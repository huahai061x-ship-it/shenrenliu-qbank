# Deterministic asset generation; existing any icons remain byte-for-byte untouched.
# At 72% scale the entire blue brand mark fits inside the centered 80% safe circle.
Add-Type -AssemblyName System.Drawing
$iconRoot=Split-Path -Parent $PSScriptRoot
foreach($size in @(192,512)){
  $source=[Drawing.Image]::FromFile((Join-Path $iconRoot "icon-$size.png"))
  $bitmap=[Drawing.Bitmap]::new($size,$size)
  $graphics=[Drawing.Graphics]::FromImage($bitmap)
  try{
    $graphics.Clear([Drawing.Color]::White)
    $graphics.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $side=[int][Math]::Floor($size*0.72)
    $offset=[int][Math]::Floor(($size-$side)/2)
    $graphics.DrawImage($source,$offset,$offset,$side,$side)
    $bitmap.Save((Join-Path $iconRoot "icon-$size-maskable.png"),[Drawing.Imaging.ImageFormat]::Png)
  }finally{$graphics.Dispose();$bitmap.Dispose();$source.Dispose()}
}
