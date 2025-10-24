# PowerShell script to EMERGENCY STOP all Microsoft Calendar sync operations
Write-Host "🚨 EMERGENCY STOP - Activating global sync lock..." -ForegroundColor Red

try {
    # Activate global sync lock
    $lockResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/microsoft/global-sync-lock" -Method POST -ContentType "application/json" -Body '{"action": "lock"}'
    
    if ($lockResponse.success) {
        Write-Host "✅ Global sync lock activated!" -ForegroundColor Green
        Write-Host "Message: $($lockResponse.message)" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Failed to activate global sync lock: $($lockResponse.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error activating global sync lock: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure your Next.js server is running on localhost:3000" -ForegroundColor Yellow
}

Write-Host "`n🚨 EMERGENCY STOP COMPLETE" -ForegroundColor Red
Write-Host "All sync operations are now blocked globally." -ForegroundColor Yellow
Write-Host "No new events will be created until the lock is removed." -ForegroundColor Yellow
Write-Host "`nTo unlock sync later, run: unlock-sync.ps1" -ForegroundColor Cyan
