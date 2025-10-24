# PowerShell script to immediately stop Microsoft Calendar sync
Write-Host "Stopping Microsoft Calendar sync..." -ForegroundColor Red

try {
    # Call the disable-sync API endpoint
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/microsoft/disable-sync" -Method POST -ContentType "application/json"
    
    if ($response.success) {
        Write-Host "✅ Sync stopped successfully!" -ForegroundColor Green
        Write-Host "Message: $($response.message)" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Failed to stop sync: $($response.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error stopping sync: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure your Next.js server is running on localhost:3000" -ForegroundColor Yellow
}

Write-Host "`nSync has been disabled. No new events will be created." -ForegroundColor Cyan
Write-Host "To re-enable sync, go to Calendar Settings in your app." -ForegroundColor Yellow
