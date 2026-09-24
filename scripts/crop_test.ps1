Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile('d:\CloneGithub\Website3DTayBac\public\preview\ChatGPT Image 12_34_04 24 thg 9, 2026 (5).png')
Write-Host "Image 5 size: $($img.Width) x $($img.Height)"
$rect = New-Object System.Drawing.Rectangle(0, ($img.Height - 200), $img.Width, 200)
$crop = $img.Clone($rect, $img.PixelFormat)
$crop.Save('d:\CloneGithub\Website3DTayBac\public\images\test_story_bottom.png')
$img.Dispose()
$crop.Dispose()
Write-Host "Done"
