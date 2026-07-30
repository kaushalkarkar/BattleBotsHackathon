# Build a narrated PowerPoint deck from the TTS clips and export it to MP4.
$ErrorActionPreference = 'Stop'
$dir   = 'G:\battle\video'
$audio = Join-Path $dir 'audio'
$outMp4 = Join-Path $dir 'BattleBots-demo.mp4'
$outPptx = Join-Path $dir 'BattleBots-demo.pptx'

$T = -1   # msoTrue
$F =  0   # msoFalse

function RGB($r,$g,$b){ [int]$r + ([int]$g -shl 8) + ([int]$b -shl 16) }
$BG=RGB 16 13 11; $PANEL=RGB 20 24 29; $PANEL2=RGB 27 32 39
$TEXT=RGB 232 237 242; $MUTED=RGB 139 151 165
$ACC=RGB 255 92 51; $ACC2=RGB 51 177 255; $WIN=RGB 46 204 113; $DARK=RGB 11 13 16

function Get-WavDuration($path){
  $b=[IO.File]::ReadAllBytes($path)
  $byteRate=[BitConverter]::ToUInt32($b,28)
  $i=12
  while($i -lt $b.Length-8){
    $id=[Text.Encoding]::ASCII.GetString($b,$i,4)
    $sz=[BitConverter]::ToUInt32($b,$i+4)
    if($id -eq 'data'){ return [math]::Round($sz / $byteRate, 2) }
    $i += 8 + $sz + ($sz % 2)
  }
  return 4.0
}

# Close any orphaned PowerPoint instance from a previous run.
Get-Process POWERPNT -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

$pp = New-Object -ComObject PowerPoint.Application
$pp.Visible = $T
$pres = $pp.Presentations.Add($T)
$pres.PageSetup.SlideWidth = 960
$pres.PageSetup.SlideHeight = 540
$W=960; $H=540
$CENTER=2; $LEFT=1; $RIGHT=3

function New-Slide {
  $s = $pres.Slides.Add($pres.Slides.Count+1, 12)  # 12 = blank
  $s.FollowMasterBackground = $F
  $s.Background.Fill.Solid()
  $s.Background.Fill.ForeColor.RGB = $BG
  return $s
}
function Add-Text($s,$t,$l,$tp,$w,$h,$size,$color,$bold,$align){
  $tb=$s.Shapes.AddTextbox(1,$l,$tp,$w,$h)
  $tr=$tb.TextFrame.TextRange
  $tr.Text=$t
  $tr.Font.Size=$size
  $tr.Font.Color.RGB=$color
  $tr.Font.Bold=$(if($bold){-1}else{0})
  $tr.Font.Name='Segoe UI'
  $tr.ParagraphFormat.Alignment=$align
  return $tb
}
function Add-Rect($s,$l,$tp,$w,$h,$color,$rounded){
  $shp=$s.Shapes.AddShape($(if($rounded){5}else{1}),$l,$tp,$w,$h)
  $shp.Fill.ForeColor.RGB=$color
  $shp.Line.Visible=$F
  return $shp
}

$durations=@()

# ---- Slide 1: intro ----
$s=New-Slide
Add-Text $s '#BATTLEBOTSDEV' 0 90 $W 30 16 $ACC $true $CENTER | Out-Null
Add-Text $s ('BattleBots Win Predictor') 0 165 $W 90 46 $TEXT $true $CENTER | Out-Null
Add-Text $s 'Predicts who wins any BattleBots matchup, from web data collected with Bright Data.' 120 285 720 60 20 $MUTED $false $CENTER | Out-Null
$p=Add-Rect $s 380 365 200 46 $BG $true; $p.Line.Visible=$T; $p.Line.ForeColor.RGB=$ACC; $p.Fill.Visible=$F
Add-Text $s '#BattleBotsDev' 380 375 200 26 18 $ACC $true $CENTER | Out-Null

# ---- Slide 2: predictor ----
$s=New-Slide
Add-Text $s 'PREDICT & EXPLAIN' 0 55 $W 30 16 $ACC $true $CENTER | Out-Null
Add-Text $s 'Who wins - and why?' 0 95 $W 60 34 $TEXT $true $CENTER | Out-Null
Add-Rect $s 180 185 600 250 $PANEL $true | Out-Null
Add-Text $s 'Predicted winner: Tombstone' 180 205 600 30 22 $WIN $true $CENTER | Out-Null
Add-Rect $s 210 255 300 40 $ACC $false | Out-Null
Add-Rect $s 510 255 240 40 $ACC2 $false | Out-Null
Add-Text $s '51.8%' 220 263 120 24 18 $DARK $true $LEFT | Out-Null
Add-Text $s '48.2%' 620 263 120 24 18 $DARK $true $RIGHT | Out-Null
Add-Text $s ("Tombstone has the stronger win rate (72% vs 68%).`r`nTombstone finishes fights - 73% of wins are KOs.`r`nHead-to-head: Tombstone 0 - 1 Minotaur.") 215 310 530 110 15 $TEXT $false $LEFT | Out-Null

# ---- Slide 3: signals ----
$s=New-Slide
Add-Text $s 'COMPARE' 0 90 $W 30 16 $ACC $true $CENTER | Out-Null
Add-Text $s 'Every signal, side by side' 0 140 $W 60 34 $TEXT $true $CENTER | Out-Null
$labels=@('Win rate','Finishing (KO)','Weapon edge','Experience'); $lx=110
foreach($lb in $labels){ Add-Rect $s $lx 260 180 60 $PANEL2 $true | Out-Null; Add-Text $s $lb $lx 278 180 24 16 $TEXT $true $CENTER | Out-Null; $lx+=190 }
Add-Text $s 'A radar chart compares both robots across four signals.' 0 360 $W 40 18 $MUTED $false $CENTER | Out-Null

# ---- Slide 4: robot profile ----
$s=New-Slide
Add-Text $s 'ROBOT PROFILES' 0 65 $W 30 16 $ACC $true $CENTER | Out-Null
Add-Text $s 'Full stats & match history' 0 105 $W 50 32 $TEXT $true $CENTER | Out-Null
Add-Rect $s 180 175 600 230 $PANEL $true | Out-Null
Add-Text $s '#1  Bite Force' 210 195 400 34 26 $ACC $true $LEFT | Out-Null
Add-Text $s 'drum spinner - Paul Ventimiglia' 210 239 500 24 16 $MUTED $false $LEFT | Out-Null
$px=210; foreach($pz in @('83.3% win','20-4','45% KO','250 lb')){ Add-Rect $s $px 280 130 38 $PANEL2 $true | Out-Null; Add-Text $s $pz $px 289 130 22 15 $TEXT $true $CENTER | Out-Null; $px+=140 }
Add-Text $s '2024 Loss vs End Game     2019 Win vs Tombstone     2018 Win vs Lock-Jaw' 210 345 560 30 14 $MUTED $false $LEFT | Out-Null

# ---- Slide 5: tournament ----
$s=New-Slide
Add-Text $s 'TOURNAMENT SIMULATOR' 0 100 $W 30 16 $ACC $true $CENTER | Out-Null
Add-Text $s 'Predict the champion' 0 145 $W 55 34 $TEXT $true $CENTER | Out-Null
Add-Rect $s 210 250 170 50 $PANEL2 $true | Out-Null
Add-Text $s 'End Game' 210 263 170 24 18 $ACC $true $CENTER | Out-Null
Add-Text $s "->" 400 258 60 40 26 $ACC $true $CENTER | Out-Null
Add-Rect $s 500 245 250 60 $ACC $true | Out-Null
Add-Text $s 'Champion: End Game' 500 262 250 26 20 $DARK $true $CENTER | Out-Null
Add-Text $s 'A full single-elimination bracket, simulated fight by fight.' 0 350 $W 40 18 $MUTED $false $CENTER | Out-Null

# ---- Slide 6: backtest ----
$s=New-Slide
Add-Text $s 'RIGOR, NOT GUESSING' 0 65 $W 30 16 $ACC $true $CENTER | Out-Null
Add-Text $s 'Backtested on 66 real fights' 0 105 $W 50 30 $TEXT $true $CENTER | Out-Null
Add-Text $s '66.7%' 0 165 $W 120 84 $WIN $true $CENTER | Out-Null
$bx=250; foreach($bz in @('HIGH -> 80%','MEDIUM -> 72%','LOW -> 59%')){ Add-Rect $s $bx 315 150 40 $PANEL2 $true | Out-Null; Add-Text $s $bz $bx 325 150 22 15 $ACC2 $true $CENTER | Out-Null; $bx+=160 }
Add-Text $s 'Accuracy rises with confidence - the model knows when it knows.' 0 395 $W 40 18 $MUTED $false $CENTER | Out-Null

# ---- Slide 7: insights ----
$s=New-Slide
Add-Text $s 'INSIGHTS' 0 60 $W 30 16 $ACC $true $CENTER | Out-Null
Add-Text $s 'Weapon meta & biggest upsets' 0 100 $W 50 30 $TEXT $true $CENTER | Out-Null
$wy=180; $wd=@(@('Vertical spinner',0.60,'60%'),@('Drum spinner',0.54,'54%'),@('Horizontal',0.41,'41%'))
foreach($wm in $wd){ Add-Text $s $wm[0] 150 ($wy-4) 200 26 16 $MUTED $false $RIGHT | Out-Null; Add-Rect $s 370 $wy 340 18 $PANEL2 $true | Out-Null; Add-Rect $s 370 $wy ([int](340*$wm[1])) 18 $ACC $true | Out-Null; Add-Text $s $wm[2] 720 ($wy-4) 60 26 16 $TEXT $true $LEFT | Out-Null; $wy+=44 }
Add-Text $s 'Biggest upset: Gruff beat Jager - favorite was 61.7% to win.' 0 340 $W 40 18 $WIN $false $CENTER | Out-Null

# ---- Slide 8: tech ----
$s=New-Slide
Add-Text $s 'UNDER THE HOOD' 0 130 $W 30 16 $ACC $true $CENTER | Out-Null
Add-Text $s 'Angular  ->  FastAPI  ->  Bright Data' 0 200 $W 60 34 $TEXT $true $CENTER | Out-Null
Add-Text $s 'Web Unlocker scrapes the data; light & dark themes included.' 0 300 $W 40 18 $MUTED $false $CENTER | Out-Null

# ---- Slide 9: close ----
$s=New-Slide
Add-Text $s 'BUILT WITH BRIGHT DATA' 0 130 $W 30 16 $ACC $true $CENTER | Out-Null
Add-Text $s 'Thanks for watching' 0 180 $W 70 44 $TEXT $true $CENTER | Out-Null
Add-Text $s 'battle-bots-hackathon.vercel.app' 0 275 $W 30 20 $ACC2 $false $CENTER | Out-Null
Add-Text $s 'github.com/kaushalkarkar/BattleBotsHackathon' 0 308 $W 30 20 $ACC2 $false $CENTER | Out-Null
$p=Add-Rect $s 380 360 200 46 $BG $true; $p.Line.Visible=$T; $p.Line.ForeColor.RGB=$ACC; $p.Fill.Visible=$F
Add-Text $s '#BattleBotsDev' 380 370 200 26 18 $ACC $true $CENTER | Out-Null

# ---- attach audio + timings to each slide ----
for($n=1; $n -le 9; $n++){
  $slide=$pres.Slides.Item($n)
  $wav=Join-Path $audio ("slide{0}.wav" -f $n)
  $dur=Get-WavDuration $wav
  $durations += $dur
  $media=$slide.Shapes.AddMediaObject2($wav,$F,$T,-80,-80,40,40)  # off-slide (audio only)
  # Explicitly add a "media play" effect that fires with the slide (auto-play),
  # so CreateVideo includes the narration audio.
  $seq=$slide.TimeLine.MainSequence
  $effect=$seq.AddEffect($media, 83, 0, 2)   # 83=msoAnimEffectMediaPlay, trigger 2=withPrevious
  try { $effect.Timing.TriggerType = 2 } catch {}
  try { $effect.EffectInformation.PlaySettings.HideWhileNotPlaying = $T } catch {}
  $slide.SlideShowTransition.AdvanceOnClick = $F
  $slide.SlideShowTransition.AdvanceOnTime = $T
  $slide.SlideShowTransition.AdvanceTime = [single]($dur + 0.4)
}

$pres.SaveAs($outPptx)
"Saved deck. Slide durations: $($durations -join ', ')  (total $([math]::Round(($durations|Measure-Object -Sum).Sum,1))s)"

# ---- export to MP4 ----
if(Test-Path $outMp4){ Remove-Item $outMp4 -Force }
$pres.CreateVideo($outMp4, $true, 3, 720, 30, 85)  # useTimingsAndNarrations, defaultDur, vertRes, fps, quality
"Exporting MP4..."
$deadline=(Get-Date).AddMinutes(8)
do{
  Start-Sleep -Seconds 3
  $st=$pres.CreateVideoStatus   # 1=inprogress 2=queued 3=done 4=failed
} while($st -in 1,2 -and (Get-Date) -lt $deadline)

if($st -eq 3 -and (Test-Path $outMp4)){
  "DONE: {0}  ({1:N1} MB)" -f $outMp4, ((Get-Item $outMp4).Length/1MB)
} else {
  "Export status: $st (3=done,4=failed). File exists: $(Test-Path $outMp4)"
}
$pres.Close()
$pp.Quit()