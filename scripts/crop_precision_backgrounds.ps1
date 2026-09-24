Add-Type -AssemblyName System.Drawing

function Crop-File($srcPath, $dstPath, $x, $y, $w, $h) {
    $img = [System.Drawing.Bitmap]::FromFile($srcPath)
    $actualW = [Math]::Min($w, $img.Width - $x)
    $actualH = [Math]::Min($h, $img.Height - $y)
    $rect = New-Object System.Drawing.Rectangle($x, $y, $actualW, $actualH)
    $crop = $img.Clone($rect, $img.PixelFormat)
    $crop.Save($dstPath)
    $img.Dispose()
    $crop.Dispose()
    Write-Host "Cropped $dstPath : $actualW x $actualH"
}

$previewDir = "d:\CloneGithub\Website3DTayBac\public\preview"
$outDir = "d:\CloneGithub\Website3DTayBac\public\images"

# 1. Story bottom ridge from Preview 5 (Y: 920 to 1086, height 166)
Crop-File "$previewDir\ChatGPT Image 12_34_04 24 thg 9, 2026 (5).png" "$outDir\story_bottom_ridge.png" 0 920 1448 166

# 2. Magazine bottom ridge from Preview 6 (Y: 790 to 1086, height 296)
Crop-File "$previewDir\ChatGPT Image 12_34_04 24 thg 9, 2026 (6).png" "$outDir\mag_bottom_ridge.png" 0 790 1448 296

# 3. Newsletter top tear from Preview 7 (Y: 0 to 220, height 220)
Crop-File "$previewDir\ChatGPT Image 12_34_05 24 thg 9, 2026 (7).png" "$outDir\newsletter_top_tear.png" 0 0 1448 220

# 4. Footer bottom mountain from Preview 7 (Y: 760 to 1086, height 326)
Crop-File "$previewDir\ChatGPT Image 12_34_05 24 thg 9, 2026 (7).png" "$outDir\footer_bottom_mountain.png" 0 760 1448 326

Write-Host "All precision crops created successfully!"
