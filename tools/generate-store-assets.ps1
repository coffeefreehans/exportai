Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root "store-assets"
$iconDir = Join-Path $assets "icons"
$promoDir = Join-Path $assets "promo"
$enDir = Join-Path $assets "screenshots/en-US"
$zhDir = Join-Path $assets "screenshots/zh-CN"
$listingDir = Join-Path $assets "listing"
$extensionIconDir = Join-Path $root "icons"
New-Item -ItemType Directory -Force -Path $iconDir, $promoDir, $enDir, $zhDir, $listingDir, $extensionIconDir | Out-Null

function New-Canvas($w, $h) {
  $bitmap = [System.Drawing.Bitmap]::new($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit
  return @($bitmap, $graphics)
}

function Color($hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }
function Brush($hex) { [System.Drawing.SolidBrush]::new((Color $hex)) }
function Pen($hex, $width = 1) { [System.Drawing.Pen]::new((Color $hex), $width) }
function FontObj($size, $style = "Regular") { [System.Drawing.Font]::new("Segoe UI", $size, [System.Drawing.FontStyle]::$style, [System.Drawing.GraphicsUnit]::Pixel) }
function Save-Png($bitmap, $path) { $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png) }

function Fill-RoundRect($g, $brush, $x, $y, $w, $h, $r) {
  $p = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  $g.FillPath($brush, $p)
  $p.Dispose()
}

function Stroke-RoundRect($g, $pen, $x, $y, $w, $h, $r) {
  $p = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  $g.DrawPath($pen, $p)
  $p.Dispose()
}

function Draw-Background($g, $w, $h) {
  $rect = [System.Drawing.Rectangle]::new(0, 0, $w, $h)
  $bg = [System.Drawing.Drawing2D.LinearGradientBrush]::new($rect, (Color "#08111f"), (Color "#141039"), 35)
  $g.FillRectangle($bg, $rect)
  $bg.Dispose()
  $g.FillEllipse([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(42, 47, 109, 246)), $w - 520, -210, 700, 700)
  $g.FillEllipse([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(35, 20, 184, 166)), -260, $h - 410, 620, 620)
}

function Draw-Logo($g, $x, $y, $s, $label = $false) {
  Fill-RoundRect $g ([System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(55, 0, 0, 0))) ($x + $s * 0.06) ($y + $s * 0.08) ($s * 0.9) ($s * 0.86) ($s * 0.22)
  $grad = [System.Drawing.Drawing2D.LinearGradientBrush]::new([System.Drawing.RectangleF]::new($x, $y, $s, $s), (Color "#312e81"), (Color "#f59e0b"), 45)
  Fill-RoundRect $g $grad $x $y $s $s ($s * 0.2)
  $grad.Dispose()

  $sheetShadow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(40, 15, 23, 42))
  Fill-RoundRect $g $sheetShadow ($x + $s * 0.31) ($y + $s * 0.14) ($s * 0.46) ($s * 0.54) ($s * 0.06)
  $sheetShadow.Dispose()

  $sheet1 = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $sheet1.AddPolygon(@(
    [System.Drawing.PointF]::new(($x + $s * 0.25), ($y + $s * 0.2)),
    [System.Drawing.PointF]::new(($x + $s * 0.63), ($y + $s * 0.12)),
    [System.Drawing.PointF]::new(($x + $s * 0.72), ($y + $s * 0.55)),
    [System.Drawing.PointF]::new(($x + $s * 0.34), ($y + $s * 0.63))
  ))
  $g.FillPath((Brush "#f8fafc"), $sheet1)
  $sheet1.Dispose()

  $sheet2 = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $sheet2.AddPolygon(@(
    [System.Drawing.PointF]::new(($x + $s * 0.38), ($y + $s * 0.16)),
    [System.Drawing.PointF]::new(($x + $s * 0.74), ($y + $s * 0.28)),
    [System.Drawing.PointF]::new(($x + $s * 0.62), ($y + $s * 0.67)),
    [System.Drawing.PointF]::new(($x + $s * 0.29), ($y + $s * 0.55))
  ))
  $g.FillPath((Brush "#dbeafe"), $sheet2)
  $sheet2.Dispose()

  Fill-RoundRect $g (Brush "#ffffff") ($x + $s * 0.24) ($y + $s * 0.31) ($s * 0.52) ($s * 0.42) ($s * 0.08)
  Fill-RoundRect $g (Brush "#312e81") ($x + $s * 0.35) ($y + $s * 0.43) ($s * 0.3) ($s * 0.08) ($s * 0.03)
  Fill-RoundRect $g (Brush "#f59e0b") ($x + $s * 0.39) ($y + $s * 0.55) ($s * 0.22) ($s * 0.07) ($s * 0.03)

  $box = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $box.AddPolygon(@(
    [System.Drawing.PointF]::new(($x + $s * 0.18), ($y + $s * 0.61)),
    [System.Drawing.PointF]::new(($x + $s * 0.82), ($y + $s * 0.61)),
    [System.Drawing.PointF]::new(($x + $s * 0.73), ($y + $s * 0.84)),
    [System.Drawing.PointF]::new(($x + $s * 0.27), ($y + $s * 0.84))
  ))
  $g.FillPath((Brush "#0f172a"), $box)
  $box.Dispose()

  $lid = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $lid.AddPolygon(@(
    [System.Drawing.PointF]::new(($x + $s * 0.18), ($y + $s * 0.61)),
    [System.Drawing.PointF]::new(($x + $s * 0.35), ($y + $s * 0.49)),
    [System.Drawing.PointF]::new(($x + $s * 0.5), ($y + $s * 0.61)),
    [System.Drawing.PointF]::new(($x + $s * 0.32), ($y + $s * 0.72))
  ))
  $g.FillPath((Brush "#1e1b4b"), $lid)
  $lid.Dispose()

  $lid2 = [System.Drawing.Drawing2D.GraphicsPath]::new()
  $lid2.AddPolygon(@(
    [System.Drawing.PointF]::new(($x + $s * 0.82), ($y + $s * 0.61)),
    [System.Drawing.PointF]::new(($x + $s * 0.65), ($y + $s * 0.49)),
    [System.Drawing.PointF]::new(($x + $s * 0.5), ($y + $s * 0.61)),
    [System.Drawing.PointF]::new(($x + $s * 0.68), ($y + $s * 0.72))
  ))
  $g.FillPath((Brush "#1e1b4b"), $lid2)
  $lid2.Dispose()

  Fill-RoundRect $g (Brush "#fef3c7") ($x + $s * 0.37) ($y + $s * 0.68) ($s * 0.26) ($s * 0.1) ($s * 0.04)
  $g.DrawString("AI", (FontObj ($s * 0.12) "Bold"), (Brush "#0f172a"), ($x + $s * 0.43), ($y + $s * 0.68))
}

function Generate-Icon($size, $path) {
  $c = New-Canvas $size $size
  $b = $c[0]; $g = $c[1]
  $g.Clear([System.Drawing.Color]::Transparent)
  $pad = [Math]::Round($size * 0.125)
  Draw-Logo $g $pad $pad ($size - $pad * 2) ($size -ge 96)
  Save-Png $b $path
  $g.Dispose(); $b.Dispose()
}

function Draw-Popup($g, $x, $y, $scale) {
  Fill-RoundRect $g (Brush "#eef5ff") $x $y (360 * $scale) (470 * $scale) (18 * $scale)
  Stroke-RoundRect $g (Pen "#c9d8ee" 2) $x $y (360 * $scale) (470 * $scale) (18 * $scale)
  $fg = Brush "#061531"; $muted = Brush "#52647e"; $blue = Brush "#2563eb"; $white = Brush "#ffffff"
  $g.DrawString("ExportAI", (FontObj (24 * $scale) "Bold"), $fg, ($x + 24 * $scale), ($y + 20 * $scale))
  $g.DrawString("123@test.com", (FontObj (12 * $scale)), $muted, ($x + 24 * $scale), ($y + 55 * $scale))
  $g.DrawString("Ready to export", (FontObj (13 * $scale)), $muted, ($x + 24 * $scale), ($y + 92 * $scale))
  Fill-RoundRect $g (Brush "#ffffff") ($x + 18 * $scale) ($y + 124 * $scale) (324 * $scale) (82 * $scale) (12 * $scale)
  $g.DrawString("Platform", (FontObj (13 * $scale) "Bold"), $muted, ($x + 34 * $scale), ($y + 146 * $scale))
  $g.DrawString("Claude", (FontObj (14 * $scale) "Bold"), $fg, ($x + 110 * $scale), ($y + 146 * $scale))
  $g.DrawString("Filename", (FontObj (13 * $scale) "Bold"), $muted, ($x + 34 * $scale), ($y + 176 * $scale))
  $g.DrawString("Market research notes", (FontObj (13 * $scale) "Bold"), $fg, ($x + 110 * $scale), ($y + 176 * $scale))
  Fill-RoundRect $g (Brush "#ffffff") ($x + 18 * $scale) ($y + 222 * $scale) (324 * $scale) (220 * $scale) (12 * $scale)
  $g.DrawString("Choose formats", (FontObj (13 * $scale) "Bold"), $muted, ($x + 34 * $scale), ($y + 242 * $scale))
  $formats = @("TXT", "PDF", "MHT", "HTML", "MD", "DOCX", "XLSX", "PNG")
  for ($i = 0; $i -lt $formats.Length; $i++) {
    $fx = $x + (34 + ($i % 4) * 75) * $scale
    $fy = $y + (274 + [Math]::Floor($i / 4) * 48) * $scale
    Fill-RoundRect $g (Brush "#eff6ff") $fx $fy (64 * $scale) (36 * $scale) (8 * $scale)
    Stroke-RoundRect $g (Pen "#2563eb" (1.5 * $scale)) $fx $fy (64 * $scale) (36 * $scale) (8 * $scale)
    $g.DrawString($formats[$i], (FontObj (12 * $scale) "Bold"), (Brush "#0f3f91"), ($fx + 16 * $scale), ($fy + 10 * $scale))
  }
  Fill-RoundRect $g $blue ($x + 34 * $scale) ($y + 378 * $scale) (292 * $scale) (42 * $scale) (9 * $scale)
  $g.DrawString("Export", (FontObj (15 * $scale) "Bold"), $white, ($x + 155 * $scale), ($y + 389 * $scale))
}

function Draw-Chat($g, $x, $y, $w, $h) {
  Fill-RoundRect $g (Brush "#ffffff") $x $y $w $h 18
  Stroke-RoundRect $g (Pen "#d8e2f2" 2) $x $y $w $h 18
  $fg = Brush "#061531"; $muted = Brush "#52647e"; $blue = Brush "#2563eb"; $orange = Brush "#f59e0b"
  Fill-RoundRect $g (Brush "#fff8ed") ($x + 32) ($y + 36) ($w - 64) 112 14
  Fill-RoundRect $g $orange ($x + 32) ($y + 36) 6 112 3
  $g.DrawString("Human", (FontObj 22 "Bold"), $fg, ($x + 56), ($y + 55))
  $g.DrawString("How do I keep this chat?", (FontObj 20), $fg, ($x + 56), ($y + 93))
  Fill-RoundRect $g (Brush "#eef5ff") ($x + 32) ($y + 176) ($w - 64) 210 14
  Fill-RoundRect $g $blue ($x + 32) ($y + 176) 6 210 3
  $g.DrawString("AI", (FontObj 22 "Bold"), $fg, ($x + 56), ($y + 198))
  $g.DrawString("Export the complete conversation with code, tables, images, and references.", (FontObj 19), $fg, ($x + 56), ($y + 240))
  $g.DrawString("Save as TXT, PDF, HTML, DOCX, XLSX, PNG, and more.", (FontObj 19), $fg, ($x + 56), ($y + 280))
  $g.DrawLine((Pen "#cbd5e1" 1), ($x + 56), ($y + 328), ($x + $w - 56), ($y + 328))
  $g.DrawString("ChatGPT  Claude  Gemini  DeepSeek  Grok  Doubao  Kimi", (FontObj 18), $muted, ($x + 56), ($y + 348))
}

function Screenshot($path, $headline, $subhead, $variant) {
  $c = New-Canvas 1280 800
  $b = $c[0]; $g = $c[1]
  Draw-Background $g 1280 800
  $g.DrawString($headline, (FontObj 58 "Bold"), (Brush "#ffffff"), 70, 72)
  $g.DrawString($subhead, (FontObj 25), (Brush "#bfd0e8"), 74, 155)
  if ($variant -eq 1) {
    Draw-Chat $g 70 250 720 430
    Draw-Popup $g 840 190 1.05
  } elseif ($variant -eq 2) {
    Draw-Popup $g 80 220 1.05
    $formats = @("TXT", "PDF", "MHT", "HTML", "MD", "DOCX", "XLSX", "PNG")
    for ($i = 0; $i -lt $formats.Length; $i++) {
      $x = 520 + (($i % 4) * 165)
      $y = 255 + ([Math]::Floor($i / 4) * 105)
      Fill-RoundRect $g (Brush "#101b33") $x $y 138 74 18
      Stroke-RoundRect $g (Pen "#3b82f6" 2) $x $y 138 74 18
      $g.DrawString($formats[$i], (FontObj 26 "Bold"), (Brush "#ffffff"), ($x + 35), ($y + 22))
    }
  } else {
    Draw-Chat $g 520 210 680 430
    Draw-Logo $g 150 260 220 $true
    $g.DrawString("Floating export panel", (FontObj 36 "Bold"), (Brush "#ffffff"), 110, 510)
    $g.DrawString("Members can export directly from the chat page.", (FontObj 22), (Brush "#bfd0e8"), 112, 565)
  }
  Save-Png $b $path
  $g.Dispose(); $b.Dispose()
}

function Promo($path, $w, $h, $text) {
  $c = New-Canvas $w $h
  $b = $c[0]; $g = $c[1]
  Draw-Background $g $w $h
  if ($text) {
    $g.DrawString("ExportAI", (FontObj ([Math]::Round($h * 0.13)) "Bold"), (Brush "#ffffff"), ($w * 0.08), ($h * 0.2))
    $g.DrawString("Save AI conversations cleanly", (FontObj ([Math]::Round($h * 0.055))), (Brush "#c8d7f0"), ($w * 0.08), ($h * 0.38))
    Draw-Logo $g ($w * 0.68) ($h * 0.2) ($h * 0.56) $true
  } else {
    Draw-Logo $g (($w - $h * 0.55) / 2) ($h * 0.22) ($h * 0.55) $true
  }
  Save-Png $b $path
  $g.Dispose(); $b.Dispose()
}

Generate-Icon 16 (Join-Path $extensionIconDir "icon16.png")
Generate-Icon 48 (Join-Path $extensionIconDir "icon48.png")
Generate-Icon 128 (Join-Path $extensionIconDir "icon128.png")
Generate-Icon 128 (Join-Path $iconDir "chrome-icon-128.png")
Generate-Icon 300 (Join-Path $iconDir "edge-logo-300.png")
Generate-Icon 512 (Join-Path $iconDir "exportai-icon-512.png")

$svg = @'
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs><linearGradient id="g" x1="18" y1="16" x2="110" y2="112"><stop stop-color="#312E81"/><stop offset="1" stop-color="#F59E0B"/></linearGradient></defs>
  <rect x="16" y="16" width="96" height="96" rx="22" fill="url(#g)"/>
  <path d="M40 36 79 28l9 45-39 8Z" fill="#F8FAFC"/>
  <path d="M55 32 92 44 80 84 45 72Z" fill="#DBEAFE"/>
  <rect x="41" y="49" width="52" height="43" rx="9" fill="#FFFFFF"/>
  <rect x="52" y="62" width="31" height="8" rx="4" fill="#312E81"/>
  <rect x="56" y="76" width="23" height="7" rx="3.5" fill="#F59E0B"/>
  <path d="M32 86h64l-9 23H41Z" fill="#0F172A"/>
  <path d="M32 86 49 74l15 12-18 11Z" fill="#1E1B4B"/>
  <path d="M96 86 79 74 64 86l18 11Z" fill="#1E1B4B"/>
  <rect x="51" y="94" width="27" height="12" rx="4" fill="#FEF3C7"/>
  <text x="64" y="105" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="13" font-weight="800" fill="#0F172A">AI</text>
</svg>
'@
Set-Content -Path (Join-Path $extensionIconDir "icon.svg") -Value $svg -Encoding UTF8
Set-Content -Path (Join-Path $iconDir "exportai-icon.svg") -Value $svg -Encoding UTF8

Promo (Join-Path $promoDir "chrome-small-promo-440x280.png") 440 280 $false
Promo (Join-Path $promoDir "edge-small-promo-440x280.png") 440 280 $true
Promo (Join-Path $promoDir "chrome-marquee-1400x560.png") 1400 560 $false
Promo (Join-Path $promoDir "edge-large-promo-1400x560.png") 1400 560 $true

Screenshot (Join-Path $enDir "01-popup-export-1280x800.png") "Export AI conversations" "Clean multi-format exports from the popup" 1
Screenshot (Join-Path $enDir "02-formats-1280x800.png") "TXT and PDF for free" "Members unlock every export format" 2
Screenshot (Join-Path $enDir "03-floating-panel-1280x800.png") "Export without leaving the chat" "A draggable in-page panel for paid members" 3
Screenshot (Join-Path $zhDir "01-popup-export-1280x800.png") "Export AI conversations" "Clean multi-format exports from the popup" 1
Screenshot (Join-Path $zhDir "02-formats-1280x800.png") "TXT and PDF for free" "Members unlock every export format" 2
Screenshot (Join-Path $zhDir "03-floating-panel-1280x800.png") "Export without leaving the chat" "A draggable in-page panel for paid members" 3

$readme = @'
# ExportAI Store Assets

Generated store submission assets for Chrome Web Store and Microsoft Edge Add-ons.

## Folders
- `icons/`: Chrome 128x128 icon, Edge 300x300 logo, and source SVG.
- `promo/`: Chrome/Edge promotional tiles.
- `screenshots/en-US/`: English 1280x800 screenshots.
- `screenshots/zh-CN/`: Chinese listing screenshots.
- `listing/`: English and Chinese store listing copy.

## Required dimensions covered
- Chrome icon: `icons/chrome-icon-128.png`
- Edge logo: `icons/edge-logo-300.png`
- Small promo tile: `promo/chrome-small-promo-440x280.png` or `promo/edge-small-promo-440x280.png`
- Large/marquee promo tile: `promo/chrome-marquee-1400x560.png`, `promo/edge-large-promo-1400x560.png`
- Screenshots: all files under `screenshots/*/*.png` are 1280x800.
'@
Set-Content -Path (Join-Path $assets "README.md") -Value $readme -Encoding UTF8
Write-Host "Generated store assets in $assets"
