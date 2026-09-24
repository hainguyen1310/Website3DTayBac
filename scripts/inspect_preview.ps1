Add-Type -AssemblyName System.Drawing

$previewDir = "d:\CloneGithub\Website3DTayBac\public\preview"
$images = Get-ChildItem "$previewDir\*.png"

foreach ($file in $images) {
    $img = [System.Drawing.Image]::FromFile($file.FullName)
    Write-Host "$($file.Name): Width=$($img.Width), Height=$($img.Height)"
    $img.Dispose()
}
