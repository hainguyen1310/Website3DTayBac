Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Bitmap]::FromFile('d:\CloneGithub\Website3DTayBac\public\preview\ChatGPT Image 12_34_05 24 thg 9, 2026 (7).png')
# Crop mountains without any column text: Y=810 to 1020 (height = 210)
$rect = New-Object System.Drawing.Rectangle(0, 810, $img.Width, 210)
$crop = $img.Clone($rect, $img.PixelFormat)
$crop.Save('d:\CloneGithub\Website3DTayBac\public\images\footer_clean_mountain.png')
$img.Dispose()
$crop.Dispose()
Write-Host "Cropped footer_clean_mountain.png"
