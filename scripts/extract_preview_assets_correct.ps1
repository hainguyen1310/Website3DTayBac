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

# 1. Mountain Ridge with Gold Linework from Magazine Image (6).png (y=745..1086, height=341) - completely below cards!
Crop-Image "$previewDir\ChatGPT Image 12_34_04 24 thg 9, 2026 (6).png" "$outDir\mountain_ridge_gold.png" 0 745 1448 341

# 2. Hero bottom torn paper edge from Image (1).png (y=810..1086, height=276)
Crop-Image "$previewDir\ChatGPT Image 12_34_02 24 thg 9, 2026 (1).png" "$outDir\hero_torn_bottom_edge.png" 0 810 1448 276

# 3. Footer bottom mountain watermark from Image (7).png (y=770..1086, height=316)
Crop-Image "$previewDir\ChatGPT Image 12_34_05 24 thg 9, 2026 (7).png" "$outDir\footer_mountain_gold.png" 0 770 1448 316

# 4. Newsletter top mountain revealed through torn paper from Image (7).png (y=0..260, height=260)
Crop-Image "$previewDir\ChatGPT Image 12_34_05 24 thg 9, 2026 (7).png" "$outDir\newsletter_mountain_strip.png" 0 0 1448 260
