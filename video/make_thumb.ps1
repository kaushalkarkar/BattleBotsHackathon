Add-Type -AssemblyName System.Drawing
$W=1280; $H=720
$bmp=New-Object System.Drawing.Bitmap($W,$H)
$g=[System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode='AntiAlias'
$g.TextRenderingHint='ClearTypeGridFit'
$g.InterpolationMode='HighQualityBicubic'

function C($r,$gg,$b){[System.Drawing.Color]::FromArgb($r,$gg,$b)}
$cBg=C 11 13 16; $cBg2=C 22 27 33; $cPanel=C 27 32 39; $cLine=C 45 52 62
$cText=C 232 237 242; $cMuted=C 150 162 176
$cAcc=C 255 92 51; $cAcc2=C 51 177 255; $cWin=C 46 204 113; $cDark=C 11 13 16

# background gradient
$rect=New-Object System.Drawing.Rectangle(0,0,$W,$H)
$grad=New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect,$cBg,$cBg2,90)
$g.FillRectangle($grad,$rect)

# soft accent glow (big translucent circle, top-right)
$glow=New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(38,255,92,51))
$g.FillEllipse($glow,820,-220,700,700)

# left accent bar
$g.FillRectangle((New-Object System.Drawing.SolidBrush($cAcc)),0,0,14,$H)

function RoundRect($x,$y,$w,$h,$r){
  $p=New-Object System.Drawing.Drawing2D.GraphicsPath
  $p.AddArc($x,$y,$r,$r,180,90);$p.AddArc($x+$w-$r,$y,$r,$r,270,90)
  $p.AddArc($x+$w-$r,$y+$h-$r,$r,$r,0,90);$p.AddArc($x,$y+$h-$r,$r,$r,90,90);$p.CloseFigure();$p
}
function Text($t,$x,$y,$size,$color,$style='Bold',$font='Segoe UI'){
  $f=New-Object System.Drawing.Font($font,$size,[System.Drawing.FontStyle]::$style)
  $b=New-Object System.Drawing.SolidBrush($color)
  $g.DrawString($t,$f,$b,[single]$x,[single]$y)
  $sz=$g.MeasureString($t,$f); return $sz
}

# kicker
Text 'BRIGHT DATA  |  #BattleBotsDev' 66 58 22 $cAcc 'Bold' | Out-Null

# title
Text 'BattleBots' 60 120 82 $cText 'Bold' | Out-Null
Text 'Win Predictor' 60 232 82 $cAcc 'Bold' | Out-Null

# subtitle
Text 'Who wins? The model predicts,' 66 372 32 $cText 'Regular' | Out-Null
Text 'and explains exactly why.' 66 416 32 $cMuted 'Regular' | Out-Null

# probability bar (signature visual)
$bx=66;$by=500;$bw=760;$bh=70;$split=[int]($bw*0.518)
$g.FillPath((New-Object System.Drawing.SolidBrush($cAcc)),(RoundRect $bx $by $split $bh 14))
$g.FillPath((New-Object System.Drawing.SolidBrush($cAcc2)),(RoundRect ($bx+$split) $by ($bw-$split) $bh 14))
Text 'TOMBSTONE  51.8%' ($bx+22) ($by+20) 24 $cDark 'Bold' | Out-Null
$f2=New-Object System.Drawing.Font('Segoe UI',24,[System.Drawing.FontStyle]::Bold)
$t2='48.2%  MINOTAUR'; $m2=$g.MeasureString($t2,$f2)
$g.DrawString($t2,$f2,(New-Object System.Drawing.SolidBrush($cDark)),[single]($bx+$bw-$m2.Width-22),[single]($by+20))

# accuracy badge (top-right panel)
$px=880;$py=150;$pw=330;$ph=210
$g.FillPath((New-Object System.Drawing.SolidBrush($cPanel)),(RoundRect $px $py $pw $ph 20))
$pen=New-Object System.Drawing.Pen($cWin,3); $g.DrawPath($pen,(RoundRect $px $py $pw $ph 20))
$fbig=New-Object System.Drawing.Font('Segoe UI',66,[System.Drawing.FontStyle]::Bold)
$tb='66.7%'; $mb=$g.MeasureString($tb,$fbig)
$g.DrawString($tb,$fbig,(New-Object System.Drawing.SolidBrush($cWin)),[single]($px+($pw-$mb.Width)/2),[single]($py+40))
$fl=New-Object System.Drawing.Font('Segoe UI',20,[System.Drawing.FontStyle]::Bold)
$tl='MODEL ACCURACY'; $ml=$g.MeasureString($tl,$fl)
$g.DrawString($tl,$fl,(New-Object System.Drawing.SolidBrush($cMuted)),[single]($px+($pw-$ml.Width)/2),[single]($py+140))
$fl2=New-Object System.Drawing.Font('Segoe UI',15,[System.Drawing.FontStyle]::Regular)
$tl2='backtested on 66 real fights'; $ml2=$g.MeasureString($tl2,$fl2)
$g.DrawString($tl2,$fl2,(New-Object System.Drawing.SolidBrush($cMuted)),[single]($px+($pw-$ml2.Width)/2),[single]($py+172))

# feature pills bottom-right
$pills=@('Tournament sim','Weapon meta','Radar compare')
$qx=880;$qy=430
foreach($p in $pills){
  $fp=New-Object System.Drawing.Font('Segoe UI',18,[System.Drawing.FontStyle]::Bold)
  $mp=$g.MeasureString($p,$fp); $wp=[int]$mp.Width+36
  $g.FillPath((New-Object System.Drawing.SolidBrush($cPanel)),(RoundRect $qx $qy $wp 46 12))
  $g.DrawString($p,$fp,(New-Object System.Drawing.SolidBrush($cText)),[single]($qx+18),[single]($qy+9))
  $qy+=58
}

# bottom hashtag pill
$hx=66;$hy=630
$fh=New-Object System.Drawing.Font('Segoe UI',26,[System.Drawing.FontStyle]::Bold)
$th='#BattleBotsDev'; $mh=$g.MeasureString($th,$fh); $hw=[int]$mh.Width+50
$penA=New-Object System.Drawing.Pen($cAcc,3); $g.DrawPath($penA,(RoundRect $hx $hy $hw 52 26))
$g.DrawString($th,$fh,(New-Object System.Drawing.SolidBrush($cAcc)),[single]($hx+25),[single]($hy+8))
Text 'Angular  |  FastAPI  |  Bright Data' ($hx+$hw+30) ($hy+12) 20 $cMuted 'Regular' | Out-Null

$out='G:\battle\video\thumbnail.png'
$bmp.Save($out,[System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose();$bmp.Dispose()
"Saved $out ({0:N0} KB)" -f ((Get-Item $out).Length/1KB)