# Outlook Event Deletion using Direct REST API calls
# Works around SDK authentication issues
#
# USAGE:
#   Preview events (dry-run):
#     .\delete-outlook-events-rest.ps1 -DateFrom "2025-07-01" -DateTo "2025-10-31" -DryRun
#
#   Delete events:
#     .\delete-outlook-events-rest.ps1 -DateFrom "2025-07-01" -DateTo "2025-10-31"
#
# PARAMETERS:
#   -DateFrom    Start date (YYYY-MM-DD format)
#   -DateTo      End date (YYYY-MM-DD format)
#   -DryRun      Preview only, don't delete (optional)
#
# EXAMPLE:
#   .\delete-outlook-events-rest.ps1 -DateFrom "2025-07-01" -DateTo "2025-10-31" -DryRun

param(
    [string]$DateFrom = "2025-07-01",
    [string]$DateTo = "2025-10-31",
    [switch]$DryRun = $false
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Outlook Event Deletion (REST API)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "Date Range: $DateFrom to $DateTo" -ForegroundColor Yellow
Write-Host "Dry Run: $DryRun`n" -ForegroundColor Yellow

# Manual authentication using Azure AD app
$clientId = process.env.MICROSOFT_CLIENT_ID  # Microsoft Graph Command Line Tools
$tenantId = process.env.MICROSOFT_TENANT_ID  # Your tenant
$scope = "https://graph.microsoft.com/.default"

Write-Host "Getting access token..." -ForegroundColor Green
Write-Host "You'll need to authenticate via device code" -ForegroundColor Yellow

# Device code flow
$deviceCodeUrl = "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/devicecode"
$tokenUrl = "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token"

$deviceCodeBody = @{
    client_id = $clientId
    scope = $scope
}

try {
    # Request device code
    $deviceCodeResponse = Invoke-RestMethod -Uri $deviceCodeUrl -Method POST -Body $deviceCodeBody
    
    Write-Host "`nTo sign in, use a web browser to open:" -ForegroundColor Yellow
    Write-Host $deviceCodeResponse.verification_uri -ForegroundColor Cyan
    Write-Host "`nAnd enter the code:" -ForegroundColor Yellow
    Write-Host $deviceCodeResponse.user_code -ForegroundColor Cyan -BackgroundColor Black
    Write-Host "`nWaiting for authentication..." -ForegroundColor Yellow
    
    # Poll for token
    $tokenBody = @{
        grant_type = "urn:ietf:params:oauth:grant-type:device_code"
        client_id = $clientId
        device_code = $deviceCodeResponse.device_code
    }
    
    $interval = $deviceCodeResponse.interval
    $expiresIn = $deviceCodeResponse.expires_in
    $startTime = Get-Date
    
    $token = $null
    while (-not $token) {
        Start-Sleep -Seconds $interval
        
        try {
            $tokenResponse = Invoke-RestMethod -Uri $tokenUrl -Method POST -Body $tokenBody -ErrorAction Stop
            $token = $tokenResponse.access_token
            Write-Host "[OK] Authentication successful!" -ForegroundColor Green
        } catch {
            $errorResponse = $_.ErrorDetails.Message | ConvertFrom-Json
            if ($errorResponse.error -eq "authorization_pending") {
                # Still waiting
                if (((Get-Date) - $startTime).TotalSeconds -gt $expiresIn) {
                    throw "Device code expired. Please run the script again."
                }
            } elseif ($errorResponse.error -eq "authorization_declined") {
                throw "Authentication was declined by user"
            } else {
                throw $errorResponse.error_description
            }
        }
    }
    
    # Now use the token to make API calls
    $headers = @{
        "Authorization" = "Bearer $token"
        "Content-Type" = "application/json"
    }
    
    Write-Host "`nFetching events..." -ForegroundColor Green
    
    # Format dates for Graph API
    $startDate = Get-Date $DateFrom
    $endDate = Get-Date $DateTo
    $startISO = $startDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $endISO = $endDate.AddDays(1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    
    $url = "https://graph.microsoft.com/v1.0/me/calendar/calendarView?startDateTime=$startISO&endDateTime=$endISO&`$orderby=start/dateTime"
    
    # Get all events (handle pagination)
    $allEvents = @()
    $nextUrl = $url
    
    while ($nextUrl) {
        $response = Invoke-RestMethod -Uri $nextUrl -Headers $headers -Method GET
        if ($response.value) {
            $allEvents += $response.value
            Write-Host "  Fetched $($allEvents.Count) events..." -ForegroundColor Gray
        }
        $nextUrl = $response.'@odata.nextLink'
    }
    
    Write-Host "[OK] Found $($allEvents.Count) events" -ForegroundColor Green
    
    if ($allEvents.Count -eq 0) {
        Write-Host "`nNo events found in the specified date range." -ForegroundColor Yellow
        exit 0
    }
    
    # Display events
    Write-Host "`nEvents that will be deleted:" -ForegroundColor Cyan
    $eventList = @()
    foreach ($outlookEvent in $allEvents) {
        $startTime = [DateTime]::Parse($outlookEvent.start.dateTime)
        $eventInfo = "$($outlookEvent.subject) ($($startTime.ToString('yyyy-MM-dd HH:mm')))"
        Write-Host "  - $eventInfo" -ForegroundColor White
        $eventList += [PSCustomObject]@{
            Subject = $outlookEvent.subject
            Start = $startTime.ToString('yyyy-MM-dd HH:mm')
            Id = $outlookEvent.id
        }
    }
    
    # Export to CSV
    $csvPath = "outlook-events-$($DateFrom)-to-$($DateTo).csv"
    $eventList | Export-Csv -Path $csvPath -NoTypeInformation
    Write-Host "`n[OK] Events exported to: $csvPath" -ForegroundColor Green
    
    if ($DryRun) {
        Write-Host "`n========================================" -ForegroundColor Yellow
        Write-Host "  DRY RUN - No events deleted" -ForegroundColor Yellow
        Write-Host "========================================" -ForegroundColor Yellow
        Write-Host "`nWould delete $($allEvents.Count) events" -ForegroundColor Yellow
        Write-Host "Run without -DryRun to actually delete them" -ForegroundColor Yellow
        exit 0
    }
    
    # Confirm deletion
    Write-Host "`n========================================" -ForegroundColor Red
    $confirm = Read-Host "Delete $($allEvents.Count) events? Type 'yes' to confirm"
    if ($confirm -ne 'yes') {
        Write-Host "Cancelled" -ForegroundColor Yellow
        exit 0
    }
    
    # Delete events
    Write-Host "`nDeleting events..." -ForegroundColor Green
    $deleted = 0
    $failed = 0
    
    foreach ($outlookEvent in $allEvents) {
        try {
            $deleteUrl = "https://graph.microsoft.com/v1.0/me/events/$($outlookEvent.id)"
            Invoke-RestMethod -Uri $deleteUrl -Headers $headers -Method DELETE -ErrorAction Stop
            $deleted++
            Write-Host "  [OK] [$deleted/$($allEvents.Count)] Deleted: $($outlookEvent.subject)" -ForegroundColor Green
        } catch {
            $failed++
            Write-Host "  [ERROR] Failed: $($outlookEvent.subject) - $($_.Exception.Message)" -ForegroundColor Red
        }
        
        # Small delay to avoid rate limiting
        Start-Sleep -Milliseconds 100
    }
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "  Deletion Complete" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Total events: $($allEvents.Count)" -ForegroundColor White
    Write-Host "Successfully deleted: $deleted" -ForegroundColor Green
    Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
    Write-Host "`nCompleted!`n" -ForegroundColor Green
    
} catch {
    Write-Host "`n[ERROR] $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

