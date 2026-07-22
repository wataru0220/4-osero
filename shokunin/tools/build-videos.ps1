# =============================================================================
#  大工シェア ネットワーク 紹介動画ビルド（ワンコマンド）
#  使い方:  powershell -ExecutionPolicy Bypass -File shokunin\tools\build-videos.ps1
#  やること: 体験モードのアプリ画面を撮影 → 案内キャラ「匠」＋字幕＋BGM＋
#            ナレーション(VOICEVOX)でスライド動画を生成 → shokunin/ に出力。
#            あわせて、アプリ内ヘルプに載せる画面写真を shokunin/help/ に書き出す。
#  前提ツール(すべて無料): ffmpeg, Google Chrome, VOICEVOX(CPU版), Yu Gothicフォント
#  ※アプリ画面(index.html等)を変更したら、このスクリプトを実行すれば動画とヘルプ画像に反映されます。
# =============================================================================
#  -Only <all|howto|value|caution>：指定した動画だけを書き出す（既定は all）。
#    例) 注意事項だけ作り直す:  powershell -ExecutionPolicy Bypass -File shokunin\tools\build-videos.ps1 -Only caution
param([ValidateSet('all','howto','value','caution')][string]$Only='all')
$ErrorActionPreference = 'Stop'
$root  = Split-Path -Parent $PSScriptRoot        # = shokunin ディレクトリ
$tools = $PSScriptRoot
$work  = Join-Path $env:TEMP ("dsvidbuild_" + [Guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Force $work | Out-Null
$shots = Join-Path $work 'shots'; New-Item -ItemType Directory -Force $shots | Out-Null
$char  = Join-Path $work 'char.png'
$VVU   = 'http://127.0.0.1:50021'
$SPK   = 39   # VOICEVOX 玄野武宏「喜び」（明るい若い男性声・無料/商用可・クレジット表記のみ）

# ---------- ツールの場所を探す ----------
function Find-Under($base,$filter,$match){
  if(-not (Test-Path $base)){ return $null }
  Get-ChildItem $base -Recurse -Filter $filter -ErrorAction SilentlyContinue |
    Where-Object { -not $match -or $_.FullName -match $match } |
    Select-Object -First 1 -ExpandProperty FullName
}
$wingetPkgs = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
$ff = Find-Under $wingetPkgs 'ffmpeg.exe' 'Gyan.FFmpeg'
if(-not $ff){ $ff = (Get-Command ffmpeg -ErrorAction SilentlyContinue).Source }
if(-not $ff){ throw 'ffmpeg が見つかりません。`winget install Gyan.FFmpeg` を実行してください。' }
# ffprobe（ffmpegと同じフォルダにある）。ナレーション音声の長さを測るのに使う。
$ffp = Join-Path (Split-Path $ff -Parent) 'ffprobe.exe'
if(-not (Test-Path $ffp)){ $ffp = (Get-Command ffprobe -ErrorAction SilentlyContinue).Source }
if(-not $ffp){ throw 'ffprobe が見つかりません（ffmpeg と同じ場所にあるはずです）。' }

$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe","${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe","$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if(-not $chrome){ throw 'Google Chrome が見つかりません（アプリ画面の撮影に使用します）。' }

$vvRun = Find-Under $wingetPkgs 'run.exe' 'VOICEVOX'
Write-Host "ffmpeg : $ff"
Write-Host "chrome : $chrome"
Write-Host "voicevox engine : $vvRun"

# ---------- VOICEVOX エンジンを起動して待つ ----------
function Wait-Voicevox($sec){ for($i=0;$i -lt $sec;$i++){ try{ Invoke-RestMethod "$VVU/version" -TimeoutSec 3 | Out-Null; return $true }catch{ Start-Sleep 2 } } return $false }
if(-not (Wait-Voicevox 1)){
  if(-not $vvRun){ throw 'VOICEVOX が見つかりません。`winget install HiroshibaKazuyuki.VOICEVOX.CPU` を実行してください。' }
  Write-Host 'VOICEVOX エンジンを起動中...'
  Start-Process -FilePath $vvRun -ArgumentList '--host','127.0.0.1','--port','50021' -WindowStyle Hidden
  if(-not (Wait-Voicevox 60)){ throw 'VOICEVOX エンジンが起動しませんでした。' }
}
Write-Host 'VOICEVOX OK'

# ---------- ローカル配信サーバ（撮影用） ----------
$port = 8791
$server = Start-Job -ScriptBlock {
  param($root,$port)
  $mime = @{ '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8'; '.png'='image/png'; '.jpg'='image/jpeg'; '.svg'='image/svg+xml'; '.ico'='image/x-icon'; '.mp4'='video/mp4'; '.webmanifest'='application/manifest+json' }
  $l = New-Object System.Net.HttpListener; $l.Prefixes.Add("http://localhost:$port/"); $l.Start()
  while($l.IsListening){
    try{
      $ctx=$l.GetContext(); $p=[System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
      if($p -eq '/'){ $p='/index.html' }
      $file=Join-Path $root ($p.TrimStart('/'))
      if(Test-Path $file -PathType Leaf){
        $ext=[System.IO.Path]::GetExtension($file).ToLower()
        if($mime.ContainsKey($ext)){ $ctx.Response.ContentType=$mime[$ext] }
        $bytes=[System.IO.File]::ReadAllBytes($file); $ctx.Response.OutputStream.Write($bytes,0,$bytes.Length)
      } else { $ctx.Response.StatusCode=404 }
      $ctx.Response.Close()
    }catch{}
  }
} -ArgumentList $root,$port
Start-Sleep 2
Write-Host "server : http://localhost:$port/ (root=$root)"

function Shoot($url,$outPng,$w,$h){
  if(Test-Path $outPng){ Remove-Item $outPng -Force }
  cmd /c "`"$chrome`" --headless --disable-gpu --hide-scrollbars --window-size=$w,$h --force-device-scale-factor=2 --virtual-time-budget=13000 --default-background-color=FFFFFFFF --screenshot=`"$outPng`" `"$url`" 2>nul" | Out-Null
}

try {
  # 案内キャラを透過PNGに
  Shoot "http://localhost:$port/tools/character.html" $char 600 760
  # アプリ各画面を撮影（体験モード）
  $scenes = @('login','find','avail','team','reqform','reqtab','chat','contract','inbox')
  foreach($sc in $scenes){ Shoot "http://localhost:$port/tools/shot.html?scene=$sc" (Join-Path $shots "shot_$sc.png") 390 800 }
  $missing = $scenes | Where-Object { -not (Test-Path (Join-Path $shots "shot_$_.png")) }
  if($missing){ throw ('画面撮影に失敗: ' + ($missing -join ',')) }
  Write-Host 'screenshots OK'

  # アプリ内ヘルプに載せる画面写真も、同じ撮影結果から書き出す（動画とヘルプの画面を常に同じ版に保つ）。
  # 表示は幅300px程度なので、2倍相当の幅600pxに縮小して容量を抑える。
  $helpDir = Join-Path $root 'help'
  New-Item -ItemType Directory -Force $helpDir | Out-Null
  foreach($sc in $scenes){
    $src = Join-Path $shots "shot_$sc.png"
    $dst = Join-Path $helpDir "$sc.png"
    cmd /c "`"$ff`" -y -hide_banner -loglevel error -i `"$src`" -vf scale=600:-1 `"$dst`" 2>nul" | Out-Null
  }
  $helpMissing = $scenes | Where-Object { -not (Test-Path (Join-Path $helpDir "$_.png")) }
  if($helpMissing){ throw ('ヘルプ用画面の書き出しに失敗: ' + ($helpMissing -join ',')) }
  Write-Host 'help screenshots OK'

  # 「派遣」と「請負」のちがいを説明する図解を、段階（stage）ごとに撮影する。
  # 発注者（青）・受注者（橙）・労働者＝職人（緑）の3人で、指揮命令と契約の流れを示す。
  $diaSpecs = @(
    @{k='haken_1'; u='type=haken&stage=1'}, @{k='haken_2'; u='type=haken&stage=2'}, @{k='haken_3'; u='type=haken&stage=3'},
    @{k='ukeoi_1'; u='type=ukeoi&stage=1'}, @{k='ukeoi_2'; u='type=ukeoi&stage=2'}, @{k='ukeoi_3'; u='type=ukeoi&stage=3'}
  )
  foreach($d in $diaSpecs){ Shoot ("http://localhost:$port/tools/haken-ukeoi.html?"+$d.u) (Join-Path $shots ("dia_"+$d.k+".png")) 1200 520 }
  $diaMissing = $diaSpecs | Where-Object { -not (Test-Path (Join-Path $shots ("dia_"+$_.k+".png"))) }
  if($diaMissing){ throw ('図解の撮影に失敗: ' + (($diaMissing|ForEach-Object{$_.k}) -join ',')) }
  Write-Host 'diagram screenshots OK'
} finally {
  Stop-Job $server -ErrorAction SilentlyContinue; Remove-Job $server -Force -ErrorAction SilentlyContinue
}

# ============ スライド描画＋BGM合成（C#） ============
if(-not ([System.Management.Automation.PSTypeName]'SlideMaker2').Type){
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;

public static class SlideMaker2 {
  static Color Accent = Color.FromArgb(234,88,12);
  static Color Dark   = Color.FromArgb(194,65,12);
  static Color Ink    = Color.FromArgb(27,36,48);
  static Color Sub    = Color.FromArgb(93,107,124);

  static GraphicsPath Round(RectangleF r, float rad){
    var p=new GraphicsPath();
    p.AddArc(r.X,r.Y,rad*2,rad*2,180,90);
    p.AddArc(r.Right-rad*2,r.Y,rad*2,rad*2,270,90);
    p.AddArc(r.Right-rad*2,r.Bottom-rad*2,rad*2,rad*2,0,90);
    p.AddArc(r.X,r.Bottom-rad*2,rad*2,rad*2,90,90);
    p.CloseFigure(); return p;
  }

  public static void Cover(string path, string kicker, string title, string[] lines, string charPng, string footer){
    using (var bmp = new Bitmap(1280,720))
    using (var g = Graphics.FromImage(bmp)){
      g.SmoothingMode = SmoothingMode.AntiAlias;
      g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
      g.InterpolationMode = InterpolationMode.HighQualityBicubic;
      g.Clear(Accent);
      using(var b=new SolidBrush(Dark)) g.FillRectangle(b,0,620,1280,100);
      if(File.Exists(charPng)){
        using(var ch=Image.FromFile(charPng)){
          float h=560f, w=h*ch.Width/ch.Height;
          g.DrawImage(ch, 1280-w-30, 720-h-30, w, h);
        }
      }
      using(var fK=new Font("Yu Gothic UI",25,FontStyle.Bold))
      using(var fT=new Font("Yu Gothic UI",43,FontStyle.Bold))
      using(var fS=new Font("Yu Gothic UI",20))
      using(var fF=new Font("Yu Gothic UI",15)){
        float tw=670f;
        g.DrawString(kicker, fK, Brushes.White, new RectangleF(70,150,tw,60));
        using(var p=new Pen(Color.White,4)) g.DrawLine(p,74,140,214,140);
        g.DrawString(title, fT, Brushes.White, new RectangleF(66,220,824,140));
        float y=440;
        foreach(var ln in lines){
          var sz=g.MeasureString(ln, fS, (int)tw);
          g.DrawString(ln, fS, Brushes.White, new RectangleF(70,y,tw,sz.Height+6));
          y += Math.Max(40f, sz.Height+6f);
        }
        // フッターは本文の下端に応じて動的配置（本文が長くて下まで伸びても重ならない）
        if(footer!=null && footer.Length>0){
          float fy = Math.Max(668f, y+10f);
          g.DrawString(footer, fF, Brushes.White, new RectangleF(70,fy,900,40));
        }
      }
      bmp.Save(path, ImageFormat.Png);
    }
  }

  // revealCount: 箇条書きを何個まで表示するか（-1または lines.Length 以上なら全部表示）。
  // ナレーションが該当の項目を話しているタイミングだけ、その箇条書きが画面に出るようにするための引数。
  public static void Content(string path, string kicker, string title, string[] lines, string shotPng, string charPng, int revealCount){
    using (var bmp = new Bitmap(1280,720))
    using (var g = Graphics.FromImage(bmp)){
      g.SmoothingMode = SmoothingMode.AntiAlias;
      g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
      g.InterpolationMode = InterpolationMode.HighQualityBicubic;
      g.Clear(Color.White);
      using(var b=new SolidBrush(Accent)) g.FillRectangle(b,0,0,1280,14);
      bool hasShot = shotPng!=null && File.Exists(shotPng);
      // アプリ画面を読みやすくするため、スマホ画面は幅390px（＝アプリの実寸と同じ1:1）で大きく表示する。
      // その分だけ本文・見出しの幅を狭めて、画面と重ならないようにする。
      float textW = hasShot? 660f : 1060f;
      float titleW = hasShot? 700f : 1120f;
      var sfNoWrap = new StringFormat(StringFormatFlags.NoWrap);
      float bulletBottomY=252f; // 箇条書き欄の最終的な下端（キャラクターとの重なり判定に使う。下で計測する）
      // タイトルは折り返さない設定のため、長いと右が見切れる。スマホ画面を大きくした分だけ
      // 見出しの幅が狭くなっているので、枠に収まるまで文字サイズを自動で少し下げる。
      float tSize = 33f;
      while(tSize > 20f){
        using(var probe = new Font("Yu Gothic UI", tSize, FontStyle.Bold)){
          if(g.MeasureString(title, probe, new SizeF(4000,200), sfNoWrap).Width <= titleW) break;
        }
        tSize -= 1f;
      }
      using(var fK=new Font("Yu Gothic UI",22,FontStyle.Bold))
      using(var fT=new Font("Yu Gothic UI",tSize,FontStyle.Bold))
      using(var fL=new Font("Yu Gothic UI",23))
      using(var fF=new Font("Yu Gothic UI",16))
      using(var bA=new SolidBrush(Accent))
      using(var bI=new SolidBrush(Ink))
      using(var bS=new SolidBrush(Sub)){
        g.DrawString(kicker, fK, bA, new RectangleF(80,58,titleW,44));
        g.DrawString(title, fT, bI, new RectangleF(80,106,titleW,64), sfNoWrap);
        g.FillRectangle(bA,84,196,150,6);
        // 先に全項目（revealCountに関わらず）を計測して、箇条書き欄の最終的な下端を求める。
        // これでキャラクターの位置・大きさを、実際の文章量に合わせて重ならないよう調整できる。
        float measureY=252f;
        foreach(var ln0 in lines){
          var sz0=g.MeasureString(ln0, fL, (int)(textW-46));
          measureY += Math.Max(52f, sz0.Height+16f);
        }
        bulletBottomY=measureY;
        float y=252;
        int shown = (revealCount<0 || revealCount>lines.Length) ? lines.Length : revealCount;
        for(int li=0; li<lines.Length; li++){
          var ln=lines[li];
          var sz=g.MeasureString(ln, fL, (int)(textW-46));
          if(li<shown){
            g.FillEllipse(bA,86,y+16,12,12);
            g.DrawString(ln, fL, bI, new RectangleF(118,y,textW-46,sz.Height+8));
          }
          y += Math.Max(52f, sz.Height+16f);
        }
        g.DrawString("職人シェア", fF, bS, new RectangleF(200,676,400,32));
      }
      if(hasShot){
        using(var sh=Image.FromFile(shotPng)){
          // 幅390＝アプリ実寸と同じ大きさで描き、高さ660の枠でクリップする（画面下部は切れるが、
          // 操作の要点が写る上部を拡大して見せることを優先する）。
          var rect=new RectangleF(818,30,390,660);
          using(var rp=Round(rect,26)){
            var st=g.Save();
            g.SetClip(rp);
            g.DrawImage(sh, rect.X, rect.Y, rect.Width, rect.Width*sh.Height/sh.Width);
            g.Restore(st);
            using(var pen=new Pen(Color.FromArgb(60,70,84),5)) g.DrawPath(pen,rp);
          }
        }
      }
      if(charPng!=null && File.Exists(charPng)){
        using(var ch=Image.FromFile(charPng)){
          // 通常はh=150・y=560固定。箇条書きが長くて下端(bulletBottomY)がその位置に迫る場合は、
          // 重ならない範囲までキャラクターを縮小・下げる（最小60pxまでは許容。それでも足りない
          // 極端なケースでは、文章の下端ぎりぎりまで詰めて重なりを最小限にする）。
          float minCharTop = Math.Max(560f, bulletBottomY+16f);
          float charH = Math.Min(150f, Math.Max(60f, 710f-minCharTop));
          float charY = 720f-charH-10f;
          float w=charH*ch.Width/ch.Height;
          g.DrawImage(ch, 18, charY, w, charH);
        }
      }
      bmp.Save(path, ImageFormat.Png);
    }
  }

  // 図解スライド：上に見出し、下に全幅の図（派遣／請負の関係図）を大きく配置する。
  public static void Diagram(string path, string kicker, string title, string bgPng, string footer){
    using (var bmp = new Bitmap(1280,720))
    using (var g = Graphics.FromImage(bmp)){
      g.SmoothingMode = SmoothingMode.AntiAlias;
      g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
      g.InterpolationMode = InterpolationMode.HighQualityBicubic;
      g.Clear(Color.White);
      using(var bA=new SolidBrush(Accent)) g.FillRectangle(bA,0,0,1280,14);
      var sfNoWrap = new StringFormat(StringFormatFlags.NoWrap);
      float titleW=1120f, tSize=33f;
      while(tSize>20f){
        using(var probe=new Font("Yu Gothic UI",tSize,FontStyle.Bold)){
          if(g.MeasureString(title, probe, new SizeF(4000,200), sfNoWrap).Width <= titleW) break;
        }
        tSize-=1f;
      }
      using(var fK=new Font("Yu Gothic UI",22,FontStyle.Bold))
      using(var fT=new Font("Yu Gothic UI",tSize,FontStyle.Bold))
      using(var fF=new Font("Yu Gothic UI",16))
      using(var bA=new SolidBrush(Accent))
      using(var bI=new SolidBrush(Ink))
      using(var bS=new SolidBrush(Sub)){
        g.DrawString(kicker, fK, bA, new RectangleF(80,52,titleW,44));
        g.DrawString(title, fT, bI, new RectangleF(80,96,titleW,60), sfNoWrap);
        g.FillRectangle(bA,84,182,150,6);
        if(footer!=null && footer.Length>0) g.DrawString(footer, fF, bS, new RectangleF(200,690,400,28));
      }
      if(bgPng!=null && File.Exists(bgPng)){
        using(var im=Image.FromFile(bgPng)){
          float x0=54f, y0=200f, bw=1172f, bh=496f;   // 図を収める枠
          float scale=Math.Min(bw/im.Width, bh/im.Height);
          float w=im.Width*scale, h=im.Height*scale;
          g.DrawImage(im, x0+(bw-w)/2f, y0+(bh-h)/2f, w, h);
        }
      }
      bmp.Save(path, ImageFormat.Png);
    }
  }
}

public static class BgmMaker {
  public static void Make(string path, int loops){
    int sr=44100; double chordDur=2.0;
    double[][] chords = new double[][]{
      new double[]{261.63,329.63,392.00},
      new double[]{196.00,246.94,293.66},
      new double[]{220.00,261.63,329.63},
      new double[]{174.61,220.00,261.63}
    };
    int totalSamples=(int)(sr*chordDur*chords.Length*loops);
    short[] data=new short[totalSamples];
    for(int lp=0; lp<loops; lp++){
      for(int c=0;c<chords.Length;c++){
        int start=(int)(sr*chordDur*(lp*chords.Length+c));
        int n=(int)(sr*chordDur);
        for(int i=0;i<n;i++){
          double t=(double)i/sr;
          double env=Math.Min(1.0,t/0.35)*Math.Min(1.0,(chordDur-t)/0.45);
          double v=0;
          foreach(double f in chords[c]){
            v+=Math.Sin(2*Math.PI*f*t)*0.32;
            v+=Math.Sin(2*Math.PI*f*2*t)*0.05;
          }
          double step=0.5; int idx=(int)(t/step);
          double lt=t-idx*step;
          double bf=chords[c][idx%3]*2.0;
          v+=Math.Sin(2*Math.PI*bf*lt)*Math.Exp(-lt*7.0)*0.22;
          double sVal=v*env*0.30;
          int pos=start+i;
          if(pos<totalSamples) data[pos]=(short)Math.Max(short.MinValue,Math.Min(short.MaxValue,sVal*short.MaxValue));
        }
      }
    }
    using(var fs=new FileStream(path,FileMode.Create))
    using(var bw=new BinaryWriter(fs)){
      int byteCount=data.Length*2;
      bw.Write(System.Text.Encoding.ASCII.GetBytes("RIFF")); bw.Write(36+byteCount);
      bw.Write(System.Text.Encoding.ASCII.GetBytes("WAVEfmt ")); bw.Write(16); bw.Write((short)1); bw.Write((short)1);
      bw.Write(sr); bw.Write(sr*2); bw.Write((short)2); bw.Write((short)16);
      bw.Write(System.Text.Encoding.ASCII.GetBytes("data")); bw.Write(byteCount);
      foreach(short sVal in data) bw.Write(sVal);
    }
  }
}
"@
}

# ---------- VOICEVOX ナレーション ----------
# 声の調整：以前は intonationScale=1.12 / pitchScale=0.02 とやや誇張した設定にしていたが、
# 不自然に聞こえるとの指摘を受け、標準に近い自然な抑揚に調整（pauseLengthScaleで間の取り方を少し余裕を持たせる）。
function New-Voice { param([string]$Text,[string]$Path)
  $q=Invoke-RestMethod -Method Post -Uri ($VVU+'/audio_query?speaker='+$SPK+'&text='+[uri]::EscapeDataString($Text)) -TimeoutSec 60
  $q.speedScale=1.0; $q.pitchScale=0.0; $q.intonationScale=1.05; $q.postPhonemeLength=0.25
  if($q.PSObject.Properties.Name -contains 'pauseLengthScale'){ $q.pauseLengthScale=1.15 }
  $json=($q|ConvertTo-Json -Depth 12 -Compress)
  Invoke-WebRequest -Method Post -Uri ($VVU+'/synthesis?speaker='+$SPK) -Body ([Text.Encoding]::UTF8.GetBytes($json)) -ContentType 'application/json' -OutFile $Path -TimeoutSec 300 | Out-Null
}

# ---------- BGM ----------
$bgm = Join-Path $work 'bgm.wav'
[BgmMaker]::Make($bgm, 40)

# 1枚の静止画＋1本のナレーション音声から、1つの動画セグメント（mp4）を作る共通処理。
# $PadDur: セグメント末尾の無音パディング秒数（スライドの切り替わり間は長め、同一スライド内の
#          箇条書きの出現どうしの間は短めにして、テンポよく・かつ唐突すぎない見せ方にする）。
function New-Segment { param([string]$Png,[string]$Text,[string]$Mp4,[double]$PadDur)
  $wav=[System.IO.Path]::ChangeExtension($Mp4,'.wav')
  New-Voice -Text $Text -Path $wav
  # ナレーション音声の長さを測り、映像と音声を「まったく同じ長さ・コマ境界ぴったり」に揃える。
  # -shortest 任せにすると映像だけ15fpsのコマ単位に丸められ、1本あたり最大1/15秒ずれる。
  # 本編は数十本のセグメントを連結するため、このわずかなズレが積み上がり、
  # 後半ほどナレーションと画面がずれてしまう（そのための固定長化）。
  $ci = [System.Globalization.CultureInfo]::InvariantCulture
  $durRaw = (& $ffp -v error -show_entries format=duration -of csv=p=0 $wav) | Select-Object -First 1
  $dur = [double]::Parse([string]$durRaw, $ci)
  $frames = [math]::Ceiling(($dur + $PadDur) * 15)
  if($frames -lt 1){ $frames = 1 }
  $exact = ([double]$frames / 15).ToString('0.######', $ci)
  cmd /c "`"$ff`" -y -hide_banner -loglevel error -loop 1 -i `"$Png`" -i `"$wav`" -af apad -t $exact -c:v libx264 -tune stillimage -r 15 -c:a aac -ar 44100 -b:a 128k -pix_fmt yuv420p `"$Mp4`" 2>nul" | Out-Null
  if(-not (Test-Path $Mp4)){ throw "segment failed: $Mp4" }
}

function Build-Video {
  param([string]$Name,[array]$Slides,[string]$OutPath)
  $ErrorActionPreference='Continue'
  $segs=@()
  for($i=0;$i -lt $Slides.Count;$i++){
    $s=$Slides[$i]
    if($s.cover -eq $true){
      # 表紙スライド：箇条書きの段階表示はせず、1枚の画に対して1本のナレーションで作る（従来どおり）。
      $png=Join-Path $work ("{0}_{1:d2}.png" -f $Name,$i)
      $mp4=Join-Path $work ("{0}_{1:d2}.mp4" -f $Name,$i)
      [SlideMaker2]::Cover($png,$s.k,$s.t,[string[]]$s.l,$char,[string]$s.f)
      New-Segment -Png $png -Text $s.n -Mp4 $mp4 -PadDur 0.8
      $segs += $mp4
    } elseif($s.diagram -eq $true){
      # 図解スライド：ナレーションの各段に合わせて、図の表示段階（frames）を切り替える。
      $narrs = @($s.n)
      for($j=0;$j -lt $narrs.Count;$j++){
        $fk = $s.frames[[Math]::Min($j, $s.frames.Count-1)]
        $bg = Join-Path $shots ("dia_"+$fk+".png")
        $png=Join-Path $work ("{0}_{1:d2}_{2:d2}.png" -f $Name,$i,$j)
        $mp4=Join-Path $work ("{0}_{1:d2}_{2:d2}.mp4" -f $Name,$i,$j)
        [SlideMaker2]::Diagram($png,[string]$s.k,[string]$s.t,$bg,$null)
        $isLast = ($j -eq ($narrs.Count-1))
        New-Segment -Png $png -Text $narrs[$j] -Mp4 $mp4 -PadDur $(if($isLast){0.8}else{0.2})
        $segs += $mp4
      }
    } else {
      # 本編スライド：箇条書きの数＋1（導入）本のナレーションに分け、ナレーションが各項目に
      # 差しかかったタイミングで、その項目だけを画面に追加表示する（スライドと説明のタイミングを一致させる）。
      $shot = if($s.shot){ Join-Path $shots ('shot_'+$s.shot+'.png') } else { $null }
      $bulletCount = $s.l.Count
      $narrs = @($s.n)
      for($j=0;$j -lt $narrs.Count;$j++){
        $reveal = [Math]::Min($j, $bulletCount)
        $png=Join-Path $work ("{0}_{1:d2}_{2:d2}.png" -f $Name,$i,$j)
        $mp4=Join-Path $work ("{0}_{1:d2}_{2:d2}.mp4" -f $Name,$i,$j)
        [SlideMaker2]::Content($png,$s.k,$s.t,[string[]]$s.l,$shot,$char,$reveal)
        $isLast = ($j -eq ($narrs.Count-1))
        New-Segment -Png $png -Text $narrs[$j] -Mp4 $mp4 -PadDur $(if($isLast){0.8}else{0.15})
        $segs += $mp4
      }
    }
  }
  $list=Join-Path $work ($Name+'_list.txt')
  ($segs | ForEach-Object { "file '" + ($_ -replace "\\","/") + "'" }) | Set-Content -Path $list -Encoding ASCII
  $cat=Join-Path $work ($Name+'_cat.mp4')
  cmd /c "`"$ff`" -y -hide_banner -loglevel error -f concat -safe 0 -i `"$list`" -c copy `"$cat`" 2>nul" | Out-Null
  cmd /c "`"$ff`" -y -hide_banner -loglevel error -i `"$cat`" -stream_loop -1 -i `"$bgm`" -filter_complex `"[1:a]volume=0.16[b];[0:a][b]amix=inputs=2:duration=first:normalize=0[a]`" -map 0:v -map `"[a]`" -c:v copy -c:a aac -b:a 128k `"$OutPath`" 2>nul" | Out-Null
  if(-not (Test-Path $OutPath)){ throw "mix failed: $OutPath" }
}

# ================= 動画① 使い方ガイド =================
# 本編スライドの n は「導入 → 箇条書き1 → 箇条書き2 → 箇条書き3」の順の配列。
# ナレーションがその項目を話し始めたタイミングで、対応する箇条書きが画面に追加表示される。
$howto = @(
  @{ cover=$true; k='かんたん使い方ガイド'; t='大工シェア ネットワーク';
     l=@('こんにちは。案内役の大工「匠（たくみ）」です。','アプリの使い方を、実際の画面でご説明します。');
     n='こんにちは。大工シェアネットワーク、案内役の大工、たくみと申します。工務店どうしで大工をシェアできるこのアプリの使い方を、実際の画面を見ながら、順番にご説明します。' },
  @{ k='ステップ 1'; t='ログインと工務店登録'; shot='login';
     l=@('「自社の大工」タブからメールとパスワードで新規登録','自社の工務店名と、最初の大工を1名登録します','初回ログイン時に利用規約に同意してください');
     n=@('ステップいち、ログインと工務店登録です。',
         'がめんしたの「自社の大工」タブを開き、メールアドレスとパスワードで新規登録します。',
         '続けて、自社の工務店名と、最初の大工をひとり登録してください。',
         '初回ログインの際は、利用規約への同意をお願いします。') },
  @{ k='ステップ 2'; t='空き予定の登録'; shot='avail';
     l=@('大工ごとにカレンダーで空き日をタップ','横にスワイプすると連続でまとめて入力できます','「まとめて見る」で自社全員の空きも確認');
     n=@('ステップに、空き予定の登録です。',
         '大工ごとにカレンダーを開き、空いている日をタップします。',
         '横に指でなぞれば、連続した日をまとめて入力できます。登録した空き日は、他の工務店の検索にすぐ反映されます。',
         '自社全員の空きも、カレンダーでまとめて確認できます。') },
  @{ k='ステップ 3'; t='大工をさがす'; shot='find';
     l=@('名前・得意作業・資格で検索できます','空き予定のみ・お気に入りのみで絞り込みも可能','技術力の★は利用者全員の平均です');
     n=@('ステップさん、大工をさがすです。',
         '検索タブでは、名前や得意作業、資格から他社の大工を探せます。',
         '空きのある大工だけに絞り込むことも可能です。',
         '星の数は利用者全員の平均評価ですので、選ぶ際の目安になります。') },
  @{ k='ステップ 4'; t='応援要請を送る'; shot='reqform';
     l=@('大工カードの「この大工に応援要請」をタップ','工事場所・日程（空き日から選択）・費用負担を入力','相手が承認すると、次のステップに進みます');
     n=@('ステップよん、応援要請です。',
         '依頼したい大工のカードから、応援要請ボタンをタップします。',
         '工事場所と日程、駐車料金や宿泊費などの費用負担を入力して送信します。日程は、その大工の空き日からのみ選べる仕組みです。',
         '相手の工務店が承認すると、条件のやり取りと電子契約の締結に進みます。') },
  @{ k='ステップ 5'; t='条件のやり取り（チャット）'; shot='chat';
     l=@('承認後、当事者だけのチャットで詳細を相談','写真・PDF・地図のURLも送れます','延長・変更依頼や取引の解除もここから');
     n=@('ステップご、条件のやり取りです。',
         '承認されたら、当事者だけが見られるチャットで、詳しい住所や日当、支払い条件を相談してください。',
         '写真やPDF、地図のURLも送れます。',
         '日程の延長や変更の依頼、取引の解除も、この画面から行えます。') },
  @{ k='ステップ 6'; t='電子請負契約の締結'; shot='contract';
     l=@('条件が固まったら、電子請負契約を締結します','請負代金・作業指示者などを確認し、双方が電子署名','双方の署名がそろうと、取引成立となります');
     n=@('ステップろく、電子請負契約の締結です。',
         '条件が固まったら、電子請負契約を締結します。これは、建設業務への労働者派遣が法律で禁止されているためで、本アプリの応援は常に請負契約として行われる仕組みになっています。',
         '請負内容や請負代金、作業指示者などを確認し、発注者と受注者の双方がアプリ上で電子署名します。職人への指揮命令は、職人が所属する工務店が行います。',
         '双方の署名がそろうと、契約が成立し、取引成立となります。') },
  @{ k='ステップ 7'; t='完了後の評価'; shot='reqtab';
     l=@('工期が終わった取引は5段階で評価','大工と相手工務店の両方を評価できます','評価は完了した取引のみ。解除した取引は不可');
     n=@('ステップなな、評価です。',
         '工期が終わった取引は、応援タブから五段階で評価します。',
         '大工と相手の工務店、両方を評価できます。',
         '評価できるのは、仕事が完了した取引だけです。評価は利用者全員の平均として表示され、次のマッチングの信頼につながります。') },
  @{ k='ステップ 8'; t='お知らせ・通知'; shot='inbox';
     l=@('ベルマークに未対応の項目が集まります','「通知をオンにする」で新着を音でもお知らせ','反映が遅いときは「更新」ボタンで最新化');
     n=@('ステップはち、お知らせと通知です。',
         '画面上のベルマークを開くと、届いた応援要請や新着メッセージなど、未対応の項目がまとめて表示されます。',
         '通知をオンにすれば、新着を音でもお知らせします。',
         '反映が遅いと感じたら、更新ボタンで最新の情報に取り直せます。') },
  @{ cover=$true; k='さっそく使ってみましょう'; t='困ったときはヘルプ';
     l=@('使い方はアプリ内の「ヘルプ」からいつでも検索できます。','体験モード（?demo=1）なら、データが24時間で消えるお試し環境で練習できます。');
     f='音声：VOICEVOX 玄野武宏 ／ イラスト・BGM：オリジナル';
     n='困ったときは、画面上のヘルプボタンから、いつでも使い方を検索できます。また、体験モードを使えば、データが24時間で消えるお試し環境で練習できます。それでは、大工シェアネットワークを、ぜひご活用ください。案内役は、大工のたくみでした。' }
)

# ================= 動画② 利用価値 =================
$value = @(
  @{ cover=$true; k='地域の工務店のための'; t='大工シェア ネットワーク';
     l=@('こんにちは。大工の「匠（たくみ）」です。','「人がいない」「仕事がない」という悩みを、','地域の工務店どうしで解決するアプリです。');
     n='こんにちは。大工のたくみです。忙しいときにひとがいない。暇なときに仕事がない。そんな工務店の悩みを、地域の仲間と解決するアプリ、大工シェアネットワークをご紹介します。' },
  @{ k='課題'; t='職人の繁閑の波';
     l=@('繁忙期：人手が足りず、工期に追われる','閑散期：腕のいい大工を遊ばせてしまう','外注探しは電話頼み。空き状況が見えない');
     n=@('工務店には、繁閑の波があります。',
         '繁忙期は人手が足りず、工期に追われます。',
         '一方で閑散期は、腕のいい大工を遊ばせてしまう。',
         '応援を探すにも電話頼みで、誰がいつ空いているのかが見えません。これが現場の実情ではないでしょうか。') },
  @{ k='解決'; t='空き状況をリアルタイム共有'; shot='find';
     l=@('参加工務店の大工の空き日がカレンダーで見える','得意作業・資格・日給・★評価も一覧','スマホのホーム画面からアプリとして使えます');
     n=@('大工シェアネットワークなら、この悩みを解決できます。',
         '参加工務店の大工の空き日が、カレンダーでリアルタイムに確認できます。',
         '得意作業や資格、日給、技術力の評価まで一覧できるため、電話をかけまわす必要はありません。',
         'スマホのホーム画面に追加すれば、アプリとしていつでも使えます。') },
  @{ k='メリット 1'; t='借りる側：すぐに応援を確保'; shot='reqform';
     l=@('空いている大工に、アプリから直接応援要請','★評価と得意作業で、安心して選べる','費用負担も最初に確認できてトラブル防止');
     n=@('借りる側のメリットです。',
         '空いている大工に、アプリから直接応援要請を送れるため、急な工事にもすぐ対応できます。',
         '利用者全員の星評価と得意作業を確認したうえで選べるので安心です。',
         '駐車料金や宿泊費などの条件も最初に確認でき、トラブルを防げます。') },
  @{ k='メリット 2'; t='貸す側：空きを仕事に変える'; shot='team';
     l=@('空き日を登録しておくだけで依頼が届く','閑散期も職人の仕事と収入を確保','いい仕事は★評価になり、次の依頼につながる');
     n=@('貸す側のメリットです。',
         '大工の空き日を登録しておくだけで、他の工務店から依頼が届きます。',
         '閑散期も職人の仕事と収入を確保でき、大切な職人を手放さずにすみます。',
         '誠実な仕事は評価となり、次の依頼につながります。') },
  @{ k='安心の仕組み'; t='当事者間の直接取引'; shot='chat';
     l=@('労働条件・支払いは当事者チャットで直接交渉','評価は完了した取引のみ。自作自演はできません','管理者は取引に関与せず、紹介料もありません');
     n=@('安心の仕組みです。',
         '労働条件や支払いは、当事者だけが見られるチャットで直接交渉します。',
         '評価は仕事が完了した取引に限られるため、自作自演はできません。',
         '管理者は取引に関与せず、紹介料もかかりません。') },
  @{ k='法令順守'; t='応援は、常に請負契約です'; shot='contract';
     l=@('建設業務への労働者派遣は、法律で禁止されています','本アプリの応援は、常に請負（業務委託）契約です','職人への指揮命令は、職人が所属する工務店が行います');
     n=@('法令面についてもご説明します。',
         '建設業務への労働者派遣は、法律で禁止されています。',
         '本アプリを通じた応援は、常に請負契約、つまり業務委託契約として行われ、労働者派遣には該当しません。',
         '職人への作業指示や労務管理は、職人が所属する工務店が自ら行い、依頼先の工務店が直接指示することはありません。承認後は、双方の電子署名による契約締結を必須としています。') },
  @{ cover=$true; k='地域で、仕事と職人を守る'; t='大工シェア ネットワーク';
     l=@('信頼できる工務店ネットワークで、繁閑の波を乗り越えましょう。','体験モード（?demo=1）でお試しいただけます。');
     f='音声：VOICEVOX 玄野武宏 ／ イラスト・BGM：オリジナル';
     n='地域の信頼できる工務店ネットワークで、仕事と職人を守る。大工シェアネットワークで、繁閑の波を乗り越えていきましょう。体験モードでのお試しも可能です。案内役は、大工のたくみでした。' }
)

# ================= 動画③ 依頼の際の注意事項 =================
$caution = @(
  @{ cover=$true; k='応援を依頼する前に'; t='依頼の際の注意事項';
     l=@('こんにちは。案内役の大工「匠（たくみ）」です。','他社の大工さんに応援をお願いするとき、','気をつけていただきたい点をまとめてご説明します。');
     n='こんにちは。大工シェアネットワーク、案内役のたくみです。他社の大工さんに応援をお願いするときに、知っておいていただきたい注意点を、順番にご説明します。' },
  @{ k='注意点 1'; t='依頼できるのは「空き」の日だけ'; shot='reqform';
     l=@('選べる日程は、大工が「空き」に設定した日のみ','「応相談」は確定ではない、条件次第の日です','無理な日程での依頼はできない仕組みです');
     n=@('一つ目です。',
         '応援要請で選べる日程は、その大工が空きに設定した日だけです。',
         '応相談の日は確定ではありませんので、チャットでよくご相談ください。',
         '無理な日程を指定して依頼することはできない仕組みになっています。') },
  @{ k='注意点 2'; t='費用負担は具体的に伝える'; shot='reqform';
     l=@('駐車料金・宿泊費・交通費・有料道路の負担を入力','「要相談」のままにせず、できるだけ具体的に','あとからのトラブル防止につながります');
     n=@('二つ目は、費用負担の確認です。',
         '駐車料金や宿泊費、交通費、有料道路の負担者を、要請の際に入力します。',
         '要相談のままにせず、できるだけ具体的に伝えましょう。',
         'あとからのトラブルを防ぐことにつながります。') },
  @{ k='注意点 3'; t='条件のやり取りで詳細を詰める'; shot='chat';
     l=@('承認後は、当事者だけのチャットで詳細を相談','住所・日当・作業内容は必ず具体的に確認','写真やPDFも送れます');
     n=@('三つ目です。',
         '承認されたら、当事者だけが見られるチャットで詳細を相談してください。',
         '住所や日当、作業内容は、必ず具体的に確認しましょう。',
         '写真やPDFも送れますので、現場の情報共有にご活用ください。') },
  @{ diagram=$true; k='いちばん大切なこと ①'; t='「派遣」は、建設業では禁止';
     frames=@('haken_1','haken_2','haken_3');
     n=@('ここで、この仕組みでいちばん大切な、派遣と請負のちがいをご説明します。まずは、建設業ではやってはいけない、派遣の形です。',
         '派遣とは、応援に来た職人に対して、依頼した発注者の側が現場で直接、指揮命令、つまり作業の指示を出す形のことです。',
         'じつは、この労働者派遣は、建設業では法律ではっきりと禁止されています。ここが、いちばんの注意点です。') },
  @{ diagram=$true; k='いちばん大切なこと ②'; t='本アプリは「請負」だから安心';
     frames=@('ukeoi_1','ukeoi_2','ukeoi_3');
     n=@('では、本アプリはどうするのか。答えは、請負です。登場するのは三者。応援を頼む発注者、応援する受注者、そして受注者の社員である職人です。',
         '発注者は、職人にではなく、受注者の工務店に対して仕事を発注します。これが、請負契約です。',
         'そして職人への指示は、あくまで受注者、つまり職人が所属する工務店が行います。発注者が職人に直接指示することはありません。だから労働者派遣にはあたらず、安心してご利用いただけます。') },
  @{ k='注意点 4（重要）'; t='電子請負契約を必ず締結する'; shot='contract';
     l=@('承認後は、必ず電子請負契約を締結してください','請負代金・作業指示者を確認し、双方が電子署名','職人への指揮命令は、所属する工務店が行います');
     n=@('四つ目、とても大切な点です。',
         'いま図でご説明した請負の形を、契約書としてきちんと残すのが、電子請負契約です。承認後は、必ず締結してください。',
         '請負代金や作業指示者などの内容を確認し、双方が電子署名することで契約が成立します。',
         '職人への作業指示や労務管理は、職人が所属する工務店が行うものとし、依頼した工務店が直接指示することはできません。') },
  @{ k='注意点 5'; t='予約とスケジュール変更のルール'; shot='reqtab';
     l=@('確定した日は「予約済み」となり、他社は選べません','予定変更は「延長・予定変更を依頼」から相手に依頼','取引の解除もこの画面からいつでも可能です');
     n=@('五つ目です。',
         '承認された日は自動的に予約済みとなり、他の工務店が同じ日を重ねて予約することはできません。',
         '日程を変えたいときは、延長・予定変更を依頼のボタンから相手に依頼してください。',
         '条件が合わなくなった場合は、取引の解除もこの画面からいつでも行えます。') },
  @{ k='注意点 6'; t='トラブル対応と契約書の保管';
     l=@('現場での事故・支払い等のトラブルは当事者間で解決','管理者は取引の内容には関与しません','契約書は締結後、必ず保存・印刷して保管してください');
     n=@('最後、六つ目です。',
         '現場での事故や、報酬の支払いなどのトラブルは、当事者どうしで解決していただく仕組みです。',
         '管理者は取引の内容には関与しません。',
         '締結した契約書は、必ずダウンロードまたは印刷して、大切に保管してください。') },
  @{ cover=$true; k='注意点を守って、安心の応援を'; t='大工シェア ネットワーク';
     l=@('これらの点を守っていただくことで、安心して地域の職人をシェアできます。','ご不明な点は、アプリ内のヘルプもご確認ください。');
     f='音声：VOICEVOX 玄野武宏 ／ イラスト・BGM：オリジナル';
     n='以上、応援を依頼するときの注意点でした。これらを守っていただくことで、安心して地域の職人をシェアしていただけます。ご不明な点があれば、アプリ内のヘルプもあわせてご確認ください。案内役は、大工のたくみでした。' }
)

$out1 = Join-Path $root 'guide-howto.mp4'
$out2 = Join-Path $root 'guide-value.mp4'
$out3 = Join-Path $root 'guide-caution.mp4'
if($Only -eq 'all' -or $Only -eq 'howto')  { Build-Video -Name 'howto' -Slides $howto -OutPath $out1 }
if($Only -eq 'all' -or $Only -eq 'value')  { Build-Video -Name 'value' -Slides $value -OutPath $out2 }
if($Only -eq 'all' -or $Only -eq 'caution'){ Build-Video -Name 'caution' -Slides $caution -OutPath $out3 }

$report = @($out1,$out2,$out3) | Where-Object { Test-Path $_ } | ForEach-Object { (Split-Path $_ -Leaf) + " = " + [math]::Round((Get-Item $_).Length/1MB,2) + "MB" }
Write-Host ("DONE  " + ($report -join ' / '))
Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
