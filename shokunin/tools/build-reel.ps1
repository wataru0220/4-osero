# =============================================================================
#  職人シェア インスタ リール用 PR動画ビルド（縦型 1080x1920・約60秒）
#  使い方:  powershell -ExecutionPolicy Bypass -File shokunin\tools\build-reel.ps1
#  やること: 体験モードのアプリ画面を撮影＋申込フォームのQRを生成 → 縦型スライドに
#            大きな文字＋ナレーション(VOICEVOX)＋BGMをのせて、shokunin\reel-pr.mp4 を出力。
#  前提ツール(すべて無料): ffmpeg(+ffprobe), Google Chrome, VOICEVOX(CPU版), Yu Gothicフォント
# =============================================================================
$ErrorActionPreference = 'Stop'
$root  = Split-Path -Parent $PSScriptRoot        # = shokunin ディレクトリ
$work  = Join-Path $env:TEMP ("reelbuild_" + [Guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Force $work | Out-Null
$shots = Join-Path $work 'shots'; New-Item -ItemType Directory -Force $shots | Out-Null
$char  = Join-Path $work 'char.png'
$qrpng = Join-Path $work 'qr.png'
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
$ffp = Join-Path (Split-Path $ff -Parent) 'ffprobe.exe'
if(-not (Test-Path $ffp)){ $ffp = (Get-Command ffprobe -ErrorAction SilentlyContinue).Source }
if(-not $ffp){ throw 'ffprobe が見つかりません。' }
$chrome = @("$env:ProgramFiles\Google\Chrome\Application\chrome.exe","${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe","$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if(-not $chrome){ throw 'Google Chrome が見つかりません。' }
$vvRun = Find-Under $wingetPkgs 'run.exe' 'VOICEVOX'
Write-Host "ffmpeg : $ff"; Write-Host "chrome : $chrome"

# ---------- VOICEVOX 起動 ----------
function Wait-Voicevox($sec){ for($i=0;$i -lt $sec;$i++){ try{ Invoke-RestMethod "$VVU/version" -TimeoutSec 3 | Out-Null; return $true }catch{ Start-Sleep 2 } } return $false }
if(-not (Wait-Voicevox 1)){
  if(-not $vvRun){ throw 'VOICEVOX が見つかりません。`winget install HiroshibaKazuyuki.VOICEVOX.CPU` を実行してください。' }
  Write-Host 'VOICEVOX エンジンを起動中...'
  Start-Process -FilePath $vvRun -ArgumentList '--host','127.0.0.1','--port','50021' -WindowStyle Hidden
  if(-not (Wait-Voicevox 60)){ throw 'VOICEVOX エンジンが起動しませんでした。' }
}
Write-Host 'VOICEVOX OK'

# ---------- ローカル配信サーバ（撮影用） ----------
$port = 8792
$server = Start-Job -ScriptBlock {
  param($root,$port)
  $mime = @{ '.html'='text/html; charset=utf-8'; '.js'='application/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.json'='application/json; charset=utf-8'; '.png'='image/png'; '.jpg'='image/jpeg'; '.svg'='image/svg+xml'; '.ico'='image/x-icon' }
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
# 案内キャラは背景を透過で撮る（オレンジ地に白い箱が出ないように）
function ShootTransparent($url,$outPng,$w,$h){
  if(Test-Path $outPng){ Remove-Item $outPng -Force }
  cmd /c "`"$chrome`" --headless --disable-gpu --hide-scrollbars --window-size=$w,$h --force-device-scale-factor=2 --virtual-time-budget=13000 --default-background-color=00000000 --screenshot=`"$outPng`" `"$url`" 2>nul" | Out-Null
}

try {
  ShootTransparent "http://localhost:$port/tools/character.html" $char 600 760
  $scenes = @('find','avail','reqform','reqtab','chat','contract')
  foreach($sc in $scenes){ Shoot "http://localhost:$port/tools/shot.html?scene=$sc" (Join-Path $shots "shot_$sc.png") 390 800 }
  Shoot "http://localhost:$port/tools/qr.html?url=https%3A%2F%2Fws.formzu.net%2Fsfgen%2FS281999641%2F" $qrpng 560 560
  $missing = $scenes | Where-Object { -not (Test-Path (Join-Path $shots "shot_$_.png")) }
  if($missing){ throw ('画面撮影に失敗: ' + ($missing -join ',')) }
  if(-not (Test-Path $qrpng)){ throw 'QRの生成に失敗' }
  Write-Host 'screenshots + QR OK'
} finally {
  Stop-Job $server -ErrorAction SilentlyContinue; Remove-Job $server -Force -ErrorAction SilentlyContinue
}

# ============ 縦型スライド描画（C#・1080x1920） ============
if(-not ([System.Management.Automation.PSTypeName]'ReelMaker').Type){
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System;
using System.IO;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;

public static class ReelMaker {
  const int W=1080, H=1920;
  static Color Accent = Color.FromArgb(234,88,12);
  static Color Dark   = Color.FromArgb(154,52,10);
  static Color Ink    = Color.FromArgb(24,33,44);
  static Color Sub    = Color.FromArgb(96,110,126);
  static Color Pop    = Color.FromArgb(255,214,10);   // 派手なアクセント（黄）

  static GraphicsPath Round(RectangleF r, float rad){
    var p=new GraphicsPath();
    p.AddArc(r.X,r.Y,rad*2,rad*2,180,90);
    p.AddArc(r.Right-rad*2,r.Y,rad*2,rad*2,270,90);
    p.AddArc(r.Right-rad*2,r.Bottom-rad*2,rad*2,rad*2,0,90);
    p.AddArc(r.X,r.Bottom-rad*2,rad*2,rad*2,90,90);
    p.CloseFigure(); return p;
  }
  static Graphics G(Bitmap b){
    var g=Graphics.FromImage(b);
    g.SmoothingMode=SmoothingMode.AntiAlias;
    g.TextRenderingHint=TextRenderingHint.AntiAliasGridFit;
    g.InterpolationMode=InterpolationMode.HighQualityBicubic;
    return g;
  }
  // 中央そろえで複数行を描く（背景色つき用・影なし）。返り値は最終Y。
  static float DrawCenterLines(Graphics g, string[] lines, Font f, Brush b, float y, float lh){
    var sf=new StringFormat(){ Alignment=StringAlignment.Center };
    foreach(var ln in lines){ g.DrawString(ln, f, b, new RectangleF(50, y, W-100, lh+34), sf); y+=lh; }
    return y;
  }
  // 影つきで中央そろえ（オレンジ地に白文字を映えさせ、字切れも防ぐ）
  static float DrawCenterLinesShadow(Graphics g, string[] lines, Font f, Color col, float y, float lh){
    var sf=new StringFormat(){ Alignment=StringAlignment.Center };
    foreach(var ln in lines){
      var r=new RectangleF(40, y, W-80, lh+40);
      using(var sh=new SolidBrush(Color.FromArgb(95,0,0,0))) g.DrawString(ln,f,sh,new RectangleF(r.X+4,r.Y+5,r.Width,r.Height),sf);
      using(var b=new SolidBrush(col)) g.DrawString(ln,f,b,r,sf);
      y+=lh;
    }
    return y;
  }
  // 派手な斜めグラデ背景（明るいオレンジ→赤→マゼンタ）＋上部の光
  static void VividBg(Graphics g){
    using(var lg=new LinearGradientBrush(new Rectangle(0,0,W,H), Color.FromArgb(255,140,20), Color.FromArgb(198,26,74), 58f)){
      var cb=new ColorBlend();
      cb.Colors=new Color[]{ Color.FromArgb(255,152,26), Color.FromArgb(242,74,28), Color.FromArgb(198,26,74) };
      cb.Positions=new float[]{ 0f, 0.55f, 1f };
      lg.InterpolationColors=cb;
      g.FillRectangle(lg,0,0,W,H);
    }
    using(var gp=new GraphicsPath()){
      gp.AddEllipse(-220,-460,W+440,940);
      using(var pgb=new PathGradientBrush(gp)){
        pgb.CenterColor=Color.FromArgb(70,255,255,255);
        pgb.SurroundColors=new Color[]{ Color.FromArgb(0,255,255,255) };
        g.FillPath(pgb,gp);
      }
    }
  }
  // 中心から広がる放射（にぎやかさ）
  static void Sunburst(Graphics g, float cx, float cy){
    using(var b=new SolidBrush(Color.FromArgb(20,255,255,255))){
      for(int k=0;k<24;k+=2){
        double a0=k*Math.PI/12, a1=(k+1)*Math.PI/12, R=1700;
        var pts=new PointF[]{ new PointF(cx,cy),
          new PointF((float)(cx+R*Math.Cos(a0)),(float)(cy+R*Math.Sin(a0))),
          new PointF((float)(cx+R*Math.Cos(a1)),(float)(cy+R*Math.Sin(a1))) };
        g.FillPolygon(b,pts);
      }
    }
  }
  // 紙吹雪（中央の文字を避けて余白だけに散らす）
  static void Confetti(Graphics g){
    Color[] cs={ Color.FromArgb(255,214,10), Color.FromArgb(46,204,168), Color.FromArgb(255,255,255), Color.FromArgb(120,220,255) };
    var rnd=new Random(7);
    int placed=0, guard=0;
    while(placed<30 && guard<400){
      guard++;
      float x=rnd.Next(30,W-30), y=rnd.Next(30,H-30);
      if(!(y<235 || y>1470 || x<150 || x>930)) continue;   // 中央の文字帯は避ける
      float s=rnd.Next(12,30);
      using(var b=new SolidBrush(Color.FromArgb(170,cs[placed%cs.Length]))){
        var st=g.Save(); g.TranslateTransform(x,y); g.RotateTransform(rnd.Next(0,90));
        if(placed%3==0) g.FillEllipse(b,-s/2,-s/2,s,s); else g.FillRectangle(b,-s/2,-s/4,s,s/2);
        g.Restore(st);
      }
      placed++;
    }
  }
  // 四隅の色ブロブ（Showcaseの明るい地をにぎやかに）
  static void CornerBlobs(Graphics g){
    using(var br=new SolidBrush(Color.FromArgb(32,234,88,12))){ g.FillEllipse(br,-130,-130,360,360); g.FillEllipse(br,W-210,H-210,380,380); }
    using(var br=new SolidBrush(Color.FromArgb(30,46,204,168))){ g.FillEllipse(br,W-170,-150,340,340); }
    using(var br=new SolidBrush(Color.FromArgb(34,255,190,10))){ g.FillEllipse(br,-150,H-190,340,340); }
  }
  static void DrawChar(Graphics g, string charPng, float h, float cx, float bottom){
    if(charPng==null || !File.Exists(charPng)) return;
    using(var ch=Image.FromFile(charPng)){ float w=h*ch.Width/ch.Height; g.DrawImage(ch, cx-w/2, bottom-h, w, h); }
  }

  // 表紙・キメ・締め：派手なオレンジ地に大きな白文字（kickerは黄色いバッジ）
  public static void Cover(string path, string kicker, string[] big, string[] sub, string charPng, string footer){
    using(var bmp=new Bitmap(W,H)) using(var g=G(bmp)){
      VividBg(g); Sunburst(g, W/2, 560); Confetti(g);
      using(var fK=new Font("Yu Gothic UI",34,FontStyle.Bold))
      using(var fB=new Font("Yu Gothic UI",72,FontStyle.Bold))
      using(var fS=new Font("Yu Gothic UI",34,FontStyle.Bold)){
        float y=250;
        if(kicker!=null && kicker.Length>0){
          var sf=new StringFormat(){ Alignment=StringAlignment.Center };
          var sz=g.MeasureString(kicker,fK); float pw=sz.Width+68, ph=sz.Height+26;
          using(var rp=Round(new RectangleF((W-pw)/2,y,pw,ph),ph/2)){ using(var b=new SolidBrush(Pop)) g.FillPath(b,rp); }
          g.DrawString(kicker,fK,new SolidBrush(Color.FromArgb(150,44,10)),new RectangleF(0,y+11,W,ph),sf);
          y+=ph+54;
        }
        y=DrawCenterLinesShadow(g, big, fB, Color.White, y, 108);
        using(var bA=new SolidBrush(Pop)) g.FillRectangle(bA,(W-170)/2,y+24,170,11);
        y+=66;
        if(sub!=null) DrawCenterLinesShadow(g, sub, fS, Color.FromArgb(255,255,255), y, 58);
      }
      DrawChar(g, charPng, 460, W/2, H-70);
      if(footer!=null && footer.Length>0){ using(var fF=new Font("Yu Gothic UI",22)){ var sf=new StringFormat(){ Alignment=StringAlignment.Center }; g.DrawString(footer,fF,new SolidBrush(Color.FromArgb(210,255,255,255)),new RectangleF(0,H-52,W,40),sf); } }
      bmp.Save(path, ImageFormat.Png);
    }
  }

  // アプリ紹介：上に見出し、下に大きなスマホ画面（四隅を色ブロブでにぎやかに）
  public static void Showcase(string path, string kicker, string[] head, string shotPng){
    using(var bmp=new Bitmap(W,H)) using(var g=G(bmp)){
      g.Clear(Color.FromArgb(250,247,243));
      CornerBlobs(g);
      using(var lg=new LinearGradientBrush(new Rectangle(0,0,W,22), Accent, Pop, 0f)) g.FillRectangle(lg,0,0,W,22);
      using(var fK=new Font("Yu Gothic UI",30,FontStyle.Bold))
      using(var fH=new Font("Yu Gothic UI",52,FontStyle.Bold)){
        float y=110;
        var sfc=new StringFormat(){ Alignment=StringAlignment.Center };
        if(kicker!=null){
          var sz=g.MeasureString(kicker,fK); float pw=sz.Width+52, ph=sz.Height+18;
          using(var rp=Round(new RectangleF((W-pw)/2,y,pw,ph),ph/2)){ using(var b=new SolidBrush(Accent)) g.FillPath(b,rp); }
          g.DrawString(kicker,fK,Brushes.White,new RectangleF(0,y+7,W,ph),sfc);
          y+=ph+26;
        }
        y=DrawCenterLines(g, head, fH, new SolidBrush(Ink), y, 86);
        using(var bA=new SolidBrush(Accent)) g.FillRectangle(bA,(W-130)/2,y+18,130,9);
      }
      // スマホ画面（下側に大きく・影つき）
      if(shotPng!=null && File.Exists(shotPng)){
        using(var sh=Image.FromFile(shotPng)){
          float pw=660f, ph=1080f, px=(W-pw)/2, py=560f;
          var rect=new RectangleF(px,py,pw,ph);
          using(var shp=Round(new RectangleF(px+10,py+16,pw,ph),40)){ using(var sb=new SolidBrush(Color.FromArgb(55,0,0,0))) g.FillPath(sb,shp); }
          using(var rp=Round(rect,40)){
            var st=g.Save(); g.SetClip(rp);
            g.DrawImage(sh, rect.X, rect.Y, rect.Width, rect.Width*sh.Height/sh.Width);
            g.Restore(st);
            using(var pen=new Pen(Color.FromArgb(60,70,84),6)) g.DrawPath(pen,rp);
          }
        }
      }
      using(var fF=new Font("Yu Gothic UI",24,FontStyle.Bold)){ var sf=new StringFormat(){ Alignment=StringAlignment.Center }; g.DrawString("職人シェア",fF,new SolidBrush(Sub),new RectangleF(0,H-56,W,40),sf); }
      bmp.Save(path, ImageFormat.Png);
    }
  }

  // 申込CTA：派手なオレンジ地・料金大・QR・URL（連絡先はQRとURLのみ／字切れを防ぐ）
  public static void Cta(string path, string[] big, string price, string qrPng, string[] contact){
    using(var bmp=new Bitmap(W,H)) using(var g=G(bmp)){
      VividBg(g); Sunburst(g, W/2, 720); Confetti(g);
      var sfc=new StringFormat(){ Alignment=StringAlignment.Center };
      using(var fB=new Font("Yu Gothic UI",54,FontStyle.Bold))
      using(var fP=new Font("Yu Gothic UI",42,FontStyle.Bold))
      using(var fq=new Font("Yu Gothic UI",27,FontStyle.Bold))
      using(var fC=new Font("Yu Gothic UI",28,FontStyle.Bold)){
        float y=130;
        y=DrawCenterLinesShadow(g, big, fB, Color.White, y, 80);
        y+=30;
        if(price!=null){
          var psz=g.MeasureString(price,fP); float pw=psz.Width+72, ph=psz.Height+30;
          using(var rpo=Round(new RectangleF((W-pw)/2-7,y-7,pw+14,ph+14),24)){ using(var yb=new SolidBrush(Pop)) g.FillPath(yb,rpo); }
          using(var rp=Round(new RectangleF((W-pw)/2,y,pw,ph),20)){ g.FillPath(Brushes.White,rp); }
          g.DrawString(price,fP,new SolidBrush(Accent),new RectangleF(0,y+15,W,ph),sfc);
          y+=ph+40;
        }
        // QR（白カード・黄色い縁）
        if(qrPng!=null && File.Exists(qrPng)){
          using(var qr=Image.FromFile(qrPng)){
            float qs=460f, qx=(W-qs)/2, qy=y+22;
            using(var rpo=Round(new RectangleF(qx-34,qy-34,qs+68,qs+68),34)){ using(var yb=new SolidBrush(Pop)) g.FillPath(yb,rpo); }
            using(var rp=Round(new RectangleF(qx-26,qy-26,qs+52,qs+52),30)){ g.FillPath(Brushes.White,rp); }
            g.DrawImage(qr, qx, qy, qs, qs);
            y=qy+qs+26;  // 白カードの下端
          }
        }
        y+=26;
        using(var sh=new SolidBrush(Color.FromArgb(95,0,0,0))) g.DrawString("↑ QR または URL からお申し込み",fq,sh,new RectangleF(4,y+4,W,44),sfc);
        g.DrawString("↑ QR または URL からお申し込み",fq,Brushes.White,new RectangleF(0,y,W,44),sfc);
        y+=56;
        if(contact!=null) DrawCenterLinesShadow(g, contact, fC, Color.FromArgb(255,255,255), y, 46);
      }
      bmp.Save(path, ImageFormat.Png);
    }
  }
}

public static class ReelBgm {
  // 明るく前向きなアルペジオ（テンポ速め）。動画長ぶんループさせる。
  public static void Make(string path, double seconds){
    int sr=44100; int total=(int)(sr*seconds);
    short[] data=new short[total];
    // 4小節進行（I-V-vi-IV系）。1拍=0.4秒（=BPM150くらいの軽快さ）
    double beat=0.4; double[] bass={130.81,196.00,220.00,174.61};
    double[][] chords={ new double[]{261.63,329.63,392.00}, new double[]{293.66,369.99,440.00}, new double[]{220.00,277.18,329.63}, new double[]{174.61,261.63,349.23} };
    for(int i=0;i<total;i++){
      double t=(double)i/sr;
      int beatIdx=(int)(t/beat);
      int bar=(beatIdx/2)%4;               // 2拍で1コード
      double bt=t-beatIdx*beat;            // 拍内時間
      double env=Math.Exp(-bt*4.5);        // 各拍でポンと鳴る
      // アルペジオ（拍ごとにコード構成音を回す）
      double note=chords[bar][beatIdx%3];
      double v=Math.Sin(2*Math.PI*note*t)*0.18*env;
      v+=Math.Sin(2*Math.PI*note*2*t)*0.05*env;
      // ベース
      double bv=Math.Sin(2*Math.PI*bass[bar]*t)*0.16*Math.Exp(-(t-beatIdx*beat)*2.0);
      double s=(v+bv)*0.6;
      data[i]=(short)Math.Max(short.MinValue,Math.Min(short.MaxValue,s*short.MaxValue));
    }
    using(var fs=new FileStream(path,FileMode.Create)) using(var bw=new BinaryWriter(fs)){
      int bc=data.Length*2;
      bw.Write(System.Text.Encoding.ASCII.GetBytes("RIFF")); bw.Write(36+bc);
      bw.Write(System.Text.Encoding.ASCII.GetBytes("WAVEfmt ")); bw.Write(16); bw.Write((short)1); bw.Write((short)1);
      bw.Write(sr); bw.Write(sr*2); bw.Write((short)2); bw.Write((short)16);
      bw.Write(System.Text.Encoding.ASCII.GetBytes("data")); bw.Write(bc);
      foreach(short sv in data) bw.Write(sv);
    }
  }
}
"@
}

# ---------- VOICEVOX ナレーション（リールは少し元気に） ----------
function New-Voice { param([string]$Text,[string]$Path)
  $q=Invoke-RestMethod -Method Post -Uri ($VVU+'/audio_query?speaker='+$SPK+'&text='+[uri]::EscapeDataString($Text)) -TimeoutSec 60
  $q.speedScale=1.08; $q.pitchScale=0.0; $q.intonationScale=1.15; $q.postPhonemeLength=0.2
  if($q.PSObject.Properties.Name -contains 'pauseLengthScale'){ $q.pauseLengthScale=0.9 }
  $json=($q|ConvertTo-Json -Depth 12 -Compress)
  Invoke-WebRequest -Method Post -Uri ($VVU+'/synthesis?speaker='+$SPK) -Body ([Text.Encoding]::UTF8.GetBytes($json)) -ContentType 'application/json' -OutFile $Path -TimeoutSec 300 | Out-Null
}

# 1枚の静止画＋1本のナレーションから、映像と音声を「コマぴったり同じ長さ」に固定したmp4を作る
function New-Segment { param([string]$Png,[string]$Text,[string]$Mp4,[double]$PadDur)
  $wav=[System.IO.Path]::ChangeExtension($Mp4,'.wav')
  New-Voice -Text $Text -Path $wav
  $ci=[System.Globalization.CultureInfo]::InvariantCulture
  $durRaw=(& $ffp -v error -show_entries format=duration -of csv=p=0 $wav) | Select-Object -First 1
  $dur=[double]::Parse([string]$durRaw,$ci)
  $frames=[math]::Ceiling(($dur+$PadDur)*30)
  if($frames -lt 1){ $frames=1 }
  $exact=([double]$frames/30).ToString('0.######',$ci)
  cmd /c "`"$ff`" -y -hide_banner -loglevel error -loop 1 -i `"$Png`" -i `"$wav`" -af apad -t $exact -c:v libx264 -tune stillimage -r 30 -c:a aac -ar 44100 -b:a 160k -pix_fmt yuv420p `"$Mp4`" 2>nul" | Out-Null
  if(-not (Test-Path $Mp4)){ throw "segment failed: $Mp4" }
}

# ============ リールの構成（縦型スライド） ============
$slides = @(
  @{ t='cover'; kicker='工務店の経営者さんへ'; big=@('来週、大工が','1人足りない…');
     n='来週、大工が一人足りない。そんなとき、どうしていますか？' },
  @{ t='cover'; big=@('電話でアテを探す','時代は、おわり。'); sub=@('繁忙期は人手不足、閑散期は仕事がない。','その悩み、地域で解決できます。');
     n='電話で応援を探し回る時代は、もう終わり。繁忙期の人手不足も、閑散期の手すきも、地域で解決できます。' },
  @{ t='cover'; kicker='一棟司塾 匠と連携'; big=@('職人シェア'); sub=@('地域の工務店どうしで','大工職人をシェアするアプリ');
     n='職人シェア。地域の工務店どうしで、大工職人をシェアするアプリです。' },
  @{ t='showcase'; kicker='空き状況が見える'; head=@('誰がいつ空いてるか','カレンダーで一目'); shot='find';
     n='どの大工さんが、いつ空いているか。カレンダーでひとめでわかります。電話をかけまわす必要はありません。' },
  @{ t='showcase'; kicker='借りる側'; head=@('空いてる大工に','アプリから直接依頼'); shot='reqform';
     n='空いている大工さんに、アプリから直接、応援をお願いできます。星の評価つきだから、安心して選べます。' },
  @{ t='showcase'; kicker='貸す側'; head=@('自社の大工を登録','するだけで依頼が届く'); shot='reqtab';
     n='自社の大工を登録し、空いている日を入れておくだけで、他の工務店から依頼が届きます。閑散期も、仕事と収入を確保できます。' },
  @{ t='showcase'; kicker='安心の電子契約'; head=@('契約もアプリで','カンタン＆確実'); shot='contract';
     n='取引は、電子請負契約でしっかり。当事者だけのやり取りで、管理者は取引に関与せず、紹介料もかかりません。' },
  @{ t='cover'; big=@('派遣じゃない。','ちゃんとした請負。'); sub=@('本アプリの応援は常に請負契約。','法令に沿った、安心の仕組みです。');
     n='本アプリの応援は、常に請負契約。労働者派遣にはあたりません。法令に沿った、安心の仕組みです。' },
  @{ t='cta'; big=@('まずは、','3か月お試しから'); price='10,000円（税込）'; contact=@('お申し込み・ご相談はこちら','ws.formzu.net/sfgen/S281999641/');
     n='まずは3か月お試し、1万円から。お申し込み・ご相談は、画面のQRコード、またはユーアールエルからどうぞ。' },
  @{ t='cover'; kicker='一棟司塾 匠と連携'; big=@('職人シェア'); sub=@('地域で、仕事と職人を守る。'); footer='音声:VOICEVOX 玄野武宏 ／ 制作:オリジナル';
     n='職人シェア。地域で、仕事と職人を守ります。' }
)

# BGMは動画の想定長ぶん先に作る（あとで実尺にループ）
$bgm = Join-Path $work 'bgm.wav'
[ReelBgm]::Make($bgm, 90)

$segs=@()
for($i=0;$i -lt $slides.Count;$i++){
  $s=$slides[$i]
  $png=Join-Path $work ("s{0:d2}.png" -f $i)
  $mp4=Join-Path $work ("s{0:d2}.mp4" -f $i)
  switch($s.t){
    'cover'    { [ReelMaker]::Cover($png,[string]$s.kicker,[string[]]$s.big,[string[]]$s.sub,$char,[string]$s.footer) }
    'showcase' { $shot=Join-Path $shots ('shot_'+$s.shot+'.png'); [ReelMaker]::Showcase($png,[string]$s.kicker,[string[]]$s.head,$shot) }
    'cta'      { [ReelMaker]::Cta($png,[string[]]$s.big,[string]$s.price,$qrpng,[string[]]$s.contact) }
  }
  $isLast = ($i -eq ($slides.Count-1))
  New-Segment -Png $png -Text $s.n -Mp4 $mp4 -PadDur $(if($isLast){0.6}else{0.35})
  $segs += $mp4
  Write-Host ("segment {0}/{1} done" -f ($i+1),$slides.Count)
}

# 連結 → BGMを薄く重ねる
$list=Join-Path $work 'list.txt'
($segs | ForEach-Object { "file '" + ($_ -replace "\\","/") + "'" }) | Set-Content -Path $list -Encoding ASCII
$cat=Join-Path $work 'cat.mp4'
cmd /c "`"$ff`" -y -hide_banner -loglevel error -f concat -safe 0 -i `"$list`" -c copy `"$cat`" 2>nul" | Out-Null
$out = Join-Path $root 'reel-pr.mp4'
cmd /c "`"$ff`" -y -hide_banner -loglevel error -i `"$cat`" -stream_loop -1 -i `"$bgm`" -filter_complex `"[1:a]volume=0.14[b];[0:a][b]amix=inputs=2:duration=first:normalize=0[a]`" -map 0:v -map `"[a]`" -c:v copy -c:a aac -b:a 160k `"$out`" 2>nul" | Out-Null
if(-not (Test-Path $out)){ throw "mix failed: $out" }

$dur=(& $ffp -v error -show_entries format=duration -of csv=p=0 $out) | Select-Object -First 1
Write-Host ("DONE  reel-pr.mp4 = " + [math]::Round((Get-Item $out).Length/1MB,2) + "MB / " + [math]::Round([double]$dur,1) + "秒 / 1080x1920")
Remove-Item $work -Recurse -Force -ErrorAction SilentlyContinue
