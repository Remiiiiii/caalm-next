# PowerShell script to unlock Microsoft Calendar sync operations
Write-Host "Unlocking Microsoft Calendar sync..." -ForegroundColor Green

try {
    # Deactivate global sync lock
    $unlockResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/microsoft/global-sync-lock" -Method POST -ContentType "application/json" -Body '{"action": "unlock"}'
    
    if ($unlockResponse.success) {
        Write-Host "✅ Global sync lock deactivated!" -ForegroundColor Green
        Write-Host "Message: $($unlockResponse.message)" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Failed to deactivate global sync lock: $($unlockResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error deactivating global sync lock: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure your Next.js server is running on localhost:3000" -ForegroundColor Yellow
}

Write-Host "`n✅ Sync operations can now resume." -ForegroundColor Green
