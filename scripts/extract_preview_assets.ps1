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
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created: $destPath ($w x $h)"
}

$previewDir = "d:\CloneGithub\Website3DTayBac\public\preview"
$outDir = "d:\CloneGithub\Website3DTayBac\public\images"

# 1. Mountain Ridge Bottom from Magazine (Width=1448, y=700..1086 -> height=386)
Crop-Image "$previewDir\ChatGPT Image 12_34_03 24 thg 9, 2026 (3).png" "$outDir\mountain_ridge_bottom.png" 0 710 1448 376

# 2. Hero bottom torn paper edge (y=840..1086 -> height=246)
Crop-Image "$previewDir\ChatGPT Image 12_34_04 24 thg 9, 2026 (5).png" "$outDir\hero_bottom_tear_full.png" 0 840 1448 246

# 3. Footer bottom mountain watermark (y=750..1086 -> height=336)
Crop-Image "$previewDir\ChatGPT Image 12_34_02 24 thg 9, 2026 (1).png" "$outDir\footer_mountain_bottom.png" 0 750 1448 336

# 4. Gift Panoramic Mountain Center Strip (y=210..880 -> height=670)
Crop-Image "$previewDir\ChatGPT Image 12_34_03 24 thg 9, 2026 (4).png" "$outDir\gift_mountain_panoramic.png" 0 210 1448 670

# 5. Newsletter top mountain revealed through torn paper (y=0..290 -> height=290)
Crop-Image "$previewDir\ChatGPT Image 12_34_02 24 thg 9, 2026 (1).png" "$outDir\newsletter_mountain_top.png" 0 0 1448 290
