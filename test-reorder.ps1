# Test Auto Reorder IDs
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "======================================" -ForegroundColor Magenta
Write-Host "       TEST AUTO REORDER IDs          " -ForegroundColor Magenta  
Write-Host "   Dam bao IDs luon lien tuc          " -ForegroundColor Magenta
Write-Host "======================================" -ForegroundColor Magenta

# Ham hien thi users
function Show-Users {
    Write-Host "`nDanh sach users hien tai:" -ForegroundColor Yellow
    try {
        $users = Invoke-RestMethod -Uri "http://localhost:3001/users" -Method GET
        if ($users.data.Count -eq 0) {
            Write-Host "   (Trong)" -ForegroundColor Gray
        } else {
            foreach($user in $users.data) {
                Write-Host "   $($user.id). $($user.name) - $($user.email)" -ForegroundColor Cyan
            }
        }
    } catch {
        Write-Host "   Loi lay users: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Hien thi users ban dau
Show-Users

# Test 1: Them user moi (auto reorder)
Write-Host "`nTEST 1: Them user moi (auto reorder)" -ForegroundColor Green
$newUser = @{
    name = "Test User Reorder"
    email = "testreorder@example.com"
    age = 99
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/users" -Method POST -Body $newUser -ContentType "application/json; charset=utf-8"
    Write-Host "Them thanh cong: ID $($response.data.id)" -ForegroundColor Green
} catch {
    Write-Host "Loi them user: $($_.Exception.Message)" -ForegroundColor Red
}

Show-Users

# Test 2: Xoa user giua (auto reorder)
Write-Host "`nTEST 2: Xoa user ID 3 (auto reorder)" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/users/3" -Method DELETE
    Write-Host "Xoa thanh cong: $($response.message)" -ForegroundColor Green
} catch {
    Write-Host "Loi xoa user: $($_.Exception.Message)" -ForegroundColor Red
}

Show-Users

# Test 3: Reorder thu cong
Write-Host "`nTEST 3: Reorder thu cong tat ca IDs" -ForegroundColor Green
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/users/reorder" -Method POST
    Write-Host "Reorder thanh cong: $($response.message)" -ForegroundColor Green
    Write-Host "Tong users: $($response.newCount)" -ForegroundColor Green
} catch {
    Write-Host "Loi reorder: $($_.Exception.Message)" -ForegroundColor Red
}

Show-Users

# Test 4: Them user sau reorder
Write-Host "`nTEST 4: Them user sau reorder" -ForegroundColor Green
$anotherUser = @{
    name = "User Sau Reorder"
    email = "saureorder@example.com"
    age = 88
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/users" -Method POST -Body $anotherUser -ContentType "application/json; charset=utf-8"
    Write-Host "Them thanh cong: ID $($response.data.id)" -ForegroundColor Green
} catch {
    Write-Host "Loi them user: $($_.Exception.Message)" -ForegroundColor Red
}

Show-Users

Write-Host "`nTest hoan thanh!" -ForegroundColor Green
Write-Host "Kiem tra: IDs co lien tuc khong?" -ForegroundColor Yellow 