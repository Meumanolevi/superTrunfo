$prefix = 'http://localhost:8000/'
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try {
    $listener.Start()
    Write-Host "Serving HTTP on $prefix (press Ctrl+C to stop)"
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response
        $path = $req.Url.AbsolutePath.TrimStart('/')
        if ([string]::IsNullOrEmpty($path)) { $path = 'game.html' }
        $file = Join-Path (Get-Location) $path
        if (Test-Path $file) {
            $ext = [System.IO.Path]::GetExtension($file).ToLower()
            switch ($ext) {
                '.html' { $res.ContentType = 'text/html' }
                '.css'  { $res.ContentType = 'text/css' }
                '.js'   { $res.ContentType = 'application/javascript' }
                '.json' { $res.ContentType = 'application/json' }
                '.png'  { $res.ContentType = 'image/png' }
                '.jpg'  { $res.ContentType = 'image/jpeg' }
                '.jpeg' { $res.ContentType = 'image/jpeg' }
                '.svg'  { $res.ContentType = 'image/svg+xml' }
                default { $res.ContentType = 'application/octet-stream' }
            }
            try {
                $bytes = [System.IO.File]::ReadAllBytes($file)
                $res.ContentLength64 = $bytes.Length
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
            } catch {
                $res.StatusCode = 500
                $msg = "Internal Server Error"
                $buf = [System.Text.Encoding]::UTF8.GetBytes($msg)
                $res.ContentLength64 = $buf.Length
                $res.OutputStream.Write($buf, 0, $buf.Length)
            }
        } else {
            $res.StatusCode = 404
            $msg = 'Not Found'
            $buf = [System.Text.Encoding]::UTF8.GetBytes($msg)
            $res.ContentLength64 = $buf.Length
            $res.OutputStream.Write($buf, 0, $buf.Length)
        }
        $res.OutputStream.Close()
    }
} finally {
    if ($listener -and $listener.IsListening) { $listener.Stop() }
}
