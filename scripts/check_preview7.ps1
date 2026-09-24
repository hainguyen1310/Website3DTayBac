Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile('d:\CloneGithub\Website3DTayBac\public\preview\ChatGPT Image 12_34_05 24 thg 9, 2026 (7).png')
Write-Host "Image 7 size: $($img.Width) x $($img.Height)"
$img.Dispose()
