Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Bitmap]::FromFile('d:\CloneGithub\Website3DTayBac\public\preview\ChatGPT Image 12_34_05 24 thg 9, 2026 (7).png')

function Save-Zone($name, $y, $h) {
    $rect = New-Object System.Drawing.Rectangle(0, $y, $img.Width, $h)
    $crop = $img.Clone($rect, $img.PixelFormat)
    $crop.Save("d:\CloneGithub\Website3DTayBac\public\images\$name")
    $crop.Dispose()
}

Save-Zone "zone1_top.png" 0 300
Save-Zone "zone2_newsletter.png" 250 300
Save-Zone "zone3_footer.png" 520 300
Save-Zone "zone4_bottom.png" 786 300

$img.Dispose()
Write-Host "Done slicing preview 7"
