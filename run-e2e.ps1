# run-e2e.ps1
# Lấy Keycloak token mới rồi chạy Playwright E2E tests.
#
# Cách dùng:
#   .\run-e2e.ps1                              # toàn bộ E2E
#   .\run-e2e.ps1 -module invoice              # chỉ module invoice
#   .\run-e2e.ps1 -module invoice -headed      # có browser
#   .\run-e2e.ps1 -module invoice -ui          # Playwright UI mode
#   .\run-e2e.ps1 -grep "full payment" -headed -workers 1
#   .\run-e2e.ps1 -debug                       # step-by-step debug

param(
    [string]$module   = "",          # tên module: invoice, building, room, ...
    [string]$grep     = "",          # lọc theo tên test
    [switch]$headed,                 # hiện browser
    [switch]$ui,                     # Playwright UI mode
    [switch]$debug,                  # debug mode (dừng từng bước)
    [int]   $workers  = 0,           # số tab song song (0 = mặc định)
    [int]   $slowMo   = 0,           # độ trễ mỗi action (ms)
    [string]$username = "demo-owner@elysstay.com",
    [string]$password = "Demo@123"
)

# ── Map tên module → file spec ─────────────────────────────────────────────
$moduleMap = @{
    "invoice"    = "tests/e2e/invoice-generation.spec.ts"
    "invoices"   = "tests/e2e/invoice-generation.spec.ts"
    "visual"     = "tests/e2e/invoice-generation.visual.spec.ts"
}

# ── 1. Lấy token từ Keycloak ───────────────────────────────────────────────
Write-Host ""
Write-Host "Đang lấy Keycloak token cho $username ..." -ForegroundColor Cyan

$body = @{
    grant_type = "password"
    client_id  = "elysstay-fe"
    username   = $username
    password   = $password
    scope      = "openid"
}

try {
    $resp = Invoke-RestMethod `
        "http://localhost:8080/realms/elysstay/protocol/openid-connect/token" `
        -Method POST -Body $body -ContentType "application/x-www-form-urlencoded"
} catch {
    Write-Host "Lấy token thất bại: $_" -ForegroundColor Red
    Write-Host "→ Kiểm tra Keycloak đang chạy tại http://localhost:8080" -ForegroundColor Yellow
    exit 1
}

$env:E2E_OWNER_TOKEN = $resp.access_token
$env:E2E_OWNER_EMAIL = $username
Write-Host "Token OK  ($($resp.access_token.Length) chars, hết hạn sau $($resp.expires_in)s)" -ForegroundColor Green
Write-Host ""

# ── 2. Build playwright args ───────────────────────────────────────────────
$playwrightArgs = @()

# Xác định file/thư mục test
if ($module -ne "" -and $moduleMap.ContainsKey($module.ToLower())) {
    $playwrightArgs += $moduleMap[$module.ToLower()]
    Write-Host "Module : $module → $($moduleMap[$module.ToLower()])" -ForegroundColor DarkCyan
} elseif ($module -ne "") {
    # Thử tìm file khớp tên module
    $found = Get-ChildItem "tests/e2e" -Filter "*$module*" -Recurse -File |
             Where-Object { $_.Name -notmatch "visual" } |
             Select-Object -First 1
    if ($found) {
        $playwrightArgs += $found.FullName
        Write-Host "Module : $module → $($found.Name)" -ForegroundColor DarkCyan
    } else {
        Write-Host "Không tìm thấy file spec cho module '$module'" -ForegroundColor Yellow
        Write-Host "Chạy toàn bộ tests/e2e/" -ForegroundColor Yellow
        $playwrightArgs += "tests/e2e"
    }
} else {
    $playwrightArgs += "tests/e2e"
    Write-Host "Module : tất cả (tests/e2e/)" -ForegroundColor DarkCyan
}

if ($ui) {
    $playwrightArgs += "--ui"
    Write-Host "Chế độ: UI (Playwright interactive)" -ForegroundColor DarkCyan
} elseif ($debug) {
    $playwrightArgs += "--debug"
    Write-Host "Chế độ: debug (step-by-step)" -ForegroundColor DarkCyan
} else {
    if ($headed)             { $playwrightArgs += "--headed" }
    if ($workers -gt 0)      { $playwrightArgs += "--workers=$workers" }
    if ($slowMo -gt 0)       { $playwrightArgs += "--slow-mo=$slowMo" }
    if ($grep -ne "")        { $playwrightArgs += "--grep"; $playwrightArgs += $grep }

    $mode = if ($headed) { "headed" } else { "headless" }
    Write-Host "Chế độ: $mode" -ForegroundColor DarkCyan
}

Write-Host ""
Write-Host "npx playwright test $($playwrightArgs -join ' ')" -ForegroundColor Gray
Write-Host ""

# ── 3. Chạy ───────────────────────────────────────────────────────────────
npx playwright test @playwrightArgs
