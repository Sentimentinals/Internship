# Script thêm user mới với UTF-8 support
# Đảm bảo tên tiếng Việt hiển thị đúng

# Set console encoding
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║           THÊM USER MỚI                  ║" -ForegroundColor Cyan  
Write-Host "║       Node.js + MySQL + UTF-8            ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Cyan

# Thông tin user mới (có thể thay đổi)
$userData = @{
    name = "Nguyễn Thị Mai Hương"
    email = "maihuong@example.com" 
    age = 26
}

$body = $userData | ConvertTo-Json -Depth 2

Write-Host "`n📝 Thông tin user mới:" -ForegroundColor Yellow
Write-Host "   👤 Tên: $($userData.name)" -ForegroundColor White
Write-Host "   📧 Email: $($userData.email)" -ForegroundColor White  
Write-Host "   🎂 Tuổi: $($userData.age)" -ForegroundColor White

Write-Host "`n🚀 Đang gửi request POST /users..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/users" -Method POST -Body $body -ContentType "application/json; charset=utf-8"
    
    Write-Host "`n✅ Thêm user thành công!" -ForegroundColor Green
    Write-Host "   🆔 ID: $($response.data.id)" -ForegroundColor White
    Write-Host "   👤 Tên: $($response.data.name)" -ForegroundColor White
    Write-Host "   📧 Email: $($response.data.email)" -ForegroundColor White
    Write-Host "   🎂 Tuổi: $($response.data.age)" -ForegroundColor White
    Write-Host "   📅 Tạo lúc: $($response.data.created_at)" -ForegroundColor Gray
    
} catch {
    Write-Host "`n❌ Lỗi khi thêm user:" -ForegroundColor Red
    Write-Host "   $($_.Exception.Message)" -ForegroundColor Red
    
    # Gợi ý nếu email đã tồn tại
    if ($_.Exception.Message -like "*Email đã tồn tại*") {
        Write-Host "`n💡 Gợi ý: Thay đổi email trong script này để thêm user mới" -ForegroundColor Yellow
    }
}

Write-Host "`n" -NoNewline
Write-Host "🎉 Script hoàn thành!" -ForegroundColor Green
Write-Host "💡 Để xem tất cả users: " -NoNewline -ForegroundColor Yellow
Write-Host "node check-users.js" -ForegroundColor Cyan 