# PowerShell script to test the sync fixes
Write-Host "Testing Microsoft Calendar Sync Fixes..." -ForegroundColor Yellow

try {
    # Test the sync with better error reporting
    Write-Host "`n1. Testing sync with enhanced error reporting..." -ForegroundColor Cyan
    
    $syncResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/microsoft/calendar/sync" -Method POST -ContentType "application/json" -Body '{"userId": "test"}'
    
    if ($syncResponse.success) {
        Write-Host "   ✅ Sync completed successfully!" -ForegroundColor Green
        Write-Host "      - Events synchronized: $($syncResponse.result.syncedEvents)" -ForegroundColor White
        Write-Host "      - Conflicts: $($syncResponse.result.conflicts.Count)" -ForegroundColor White
        Write-Host "      - Errors: $($syncResponse.result.errors.Count)" -ForegroundColor White
        
        if ($syncResponse.result.errors.Count -gt 0) {
            Write-Host "`n   🚨 ERRORS DETECTED:" -ForegroundColor Red
            foreach ($error in $syncResponse.result.errors) {
                Write-Host "      - Event ID: $($error.eventId)" -ForegroundColor Red
                Write-Host "        Operation: $($error.operation)" -ForegroundColor Red
                Write-Host "        Error: $($error.error)" -ForegroundColor Red
                Write-Host "        Event Title: $($error.eventTitle)" -ForegroundColor Red
                Write-Host "        Event Date: $($error.eventDate)" -ForegroundColor Red
                Write-Host ""
            }
        }
        
        if ($syncResponse.result.conflicts.Count -gt 0) {
            Write-Host "`n   ⚠️ CONFLICTS DETECTED:" -ForegroundColor Yellow
            foreach ($conflict in $syncResponse.result.conflicts) {
                Write-Host "      - Type: $($conflict.type)" -ForegroundColor Yellow
                Write-Host "        CAALM Event: $($conflict.caalmEvent)" -ForegroundColor Yellow
                Write-Host "        Outlook Event: $($conflict.outlookEvent)" -ForegroundColor Yellow
                Write-Host "        Field: $($conflict.field)" -ForegroundColor Yellow
                Write-Host ""
            }
        }
    } else {
        Write-Host "   ❌ Sync failed: $($syncResponse.message)" -ForegroundColor Red
        if ($syncResponse.error) {
            Write-Host "      Error: $($syncResponse.error)" -ForegroundColor Red
        }
        if ($syncResponse.requiresReauth) {
            Write-Host "      ⚠️  REQUIRES RE-AUTHENTICATION" -ForegroundColor Red
        }
    }

    Write-Host "`n🎯 SYNC ANALYSIS COMPLETE!" -ForegroundColor Green
    Write-Host "Check the detailed error information above to identify the specific issue." -ForegroundColor White

} catch {
    Write-Host "❌ Error testing sync: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure your Next.js server is running on localhost:3000" -ForegroundColor Yellow
}

Write-Host "`nSync test completed!" -ForegroundColor Green

