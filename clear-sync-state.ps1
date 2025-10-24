# PowerShell script to clear stuck sync states and get diagnostics
Write-Host "Clearing Microsoft Calendar Sync State..." -ForegroundColor Yellow

try {
    # Check global sync lock
    Write-Host "`n1. Checking global sync lock..." -ForegroundColor Cyan
    $lockResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/microsoft/global-sync-lock" -Method GET
    if ($lockResponse.locked) {
        Write-Host "   Global sync lock is ACTIVE - clearing it..." -ForegroundColor Red
        $unlockResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/microsoft/global-sync-lock" -Method POST -ContentType "application/json" -Body '{"lock": false}'
        Write-Host "   Global sync lock cleared" -ForegroundColor Green
    } else {
        Write-Host "   Global sync lock is not active" -ForegroundColor Green
    }

    # Check sync status
    Write-Host "`n2. Checking sync status..." -ForegroundColor Cyan
    try {
        $statusResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/microsoft/sync-status" -Method GET
        Write-Host "   Sync Status:" -ForegroundColor White
        Write-Host "      - Connected: $($statusResponse.status)" -ForegroundColor White
        Write-Host "      - Sync Enabled: $($statusResponse.integration.syncEnabled)" -ForegroundColor White
        Write-Host "      - Last Sync: $($statusResponse.integration.lastSync)" -ForegroundColor White
        Write-Host "      - Token Expired: $($statusResponse.integration.isTokenExpired)" -ForegroundColor White
        
        if ($statusResponse.integration.isTokenExpired) {
            Write-Host "   TOKEN EXPIRED - You need to reconnect Microsoft account!" -ForegroundColor Red
        } elseif ($statusResponse.integration.timeUntilExpiry -lt 300000) {
            Write-Host "   Token expires soon (less than 5 minutes)" -ForegroundColor Yellow
        } else {
            Write-Host "   Token is valid" -ForegroundColor Green
        }
    } catch {
        Write-Host "   Could not check sync status: $($_.Exception.Message)" -ForegroundColor Red
    }

    # Test basic connection
    Write-Host "`n3. Testing basic connection..." -ForegroundColor Cyan
    try {
        $testResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/microsoft/simple-sync-test" -Method GET
        Write-Host "   Basic connection test passed" -ForegroundColor Green
        Write-Host "      - CAALM Events: $($testResponse.caalmEvents)" -ForegroundColor White
    } catch {
        Write-Host "   Basic connection test failed: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host "`nRECOMMENDATIONS:" -ForegroundColor Yellow
    Write-Host "1. If token is expired, go to Calendar Settings and reconnect Microsoft" -ForegroundColor White
    Write-Host "2. Try a manual sync from the calendar interface" -ForegroundColor White
    Write-Host "3. Check server logs for detailed error information" -ForegroundColor White

} catch {
    Write-Host "Error running sync diagnostics: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure your Next.js server is running on localhost:3000" -ForegroundColor Yellow
}

Write-Host "`nSync state check completed!" -ForegroundColor Green