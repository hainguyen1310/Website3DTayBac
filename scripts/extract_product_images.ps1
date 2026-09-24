Add-Type -AssemblyName System.Drawing

function Crop-Image($sourcePath, $destPath, $x, $y, $w, $h) {
    $src = [System.Drawing.Image]::FromFile($sourcePath)
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $rect = New-Object System.Drawing.Rectangle($x, $y, $w, $h)
    $g.DrawImage($src, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $src.Dispose()
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $bmp.Dispose()
    Write-Host "Created: $destPath ($w x $h)"
}

$previewDir = "d:\CloneGithub\Website3DTayBac\public\preview"
$outDir = "d:\CloneGithub\Website3DTayBac\public\images"
$dealImg = "$previewDir\ChatGPT Image 12_34_03 24 thg 9, 2026 (3).png"

# Product 1: Tea canister (x=389, y=288, w=278, h=314)
Crop-Image $dealImg "$outDir\product_tea_canister.jpg" 389 288 278 314

# Product 2: Honey jar (x=689, y=288, w=278, h=314)
Crop-Image $dealImg "$outDir\product_honey_jar.jpg" 689 288 278 314

# Product 3: Spice jar (x=989, y=288, w=278, h=314)
Crop-Image $dealImg "$outDir\product_spice_jar.jpg" 989 288 278 314
