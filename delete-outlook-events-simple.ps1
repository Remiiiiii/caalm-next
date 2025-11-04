# Simple Outlook Event Deletion Script using Device Code Authentication
# This version handles authentication issues better

param(
    [string]$DateFrom = "2025-07-01",
    [string]$DateTo = "2025-10-31",
    [switch]$DryRun = $false
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Outlook Event Deletion (Simple)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan
Write-Host "Date Range: $DateFrom to $DateTo" -ForegroundColor Yellow
Write-Host "Dry Run: $DryRun`n" -ForegroundColor Yellow

# Load module
try {
    Import-Module Microsoft.Graph.Authentication -ErrorAction Stop
    Write-Host "[OK] Module loaded" -ForegroundColor Green
} catch {
    Write-Host "Installing Microsoft.Graph..." -ForegroundColor Yellow
    Install-Module Microsoft.Graph -Scope CurrentUser -Force
    Import-Module Microsoft.Graph.Authentication
}

# Connect using device code
Write-Host "`nConnecting to Microsoft Graph..." -ForegroundColor Green
Write-Host "You'll receive a code to enter at https://microsoft.com/devicelogin" -ForegroundColor Yellow

try {
    Connect-MgGraph -Scopes "Calendars.ReadWrite" -UseDeviceCode -NoWelcome
    Write-Host "[OK] Connected!" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Connection failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Get calendar and events
Write-Host "`nFetching events..." -ForegroundColor Green

$startDate = Get-Date $DateFrom
$endDate = Get-Date $DateTo
$startISO = $startDate.ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$endISO = $endDate.AddDays(1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")

$url = "https://graph.microsoft.com/v1.0/me/calendar/calendarView?startDateTime=$startISO&endDateTime=$endISO"

try {
    $allEvents = @()
    $nextUrl = $url
    
    while ($nextUrl) {
        $response = Invoke-MgGraphRequest -Method GET -Uri $nextUrl
        if ($response.value) {
            $allEvents += $response.value
        }
        $nextUrl = $response.'@odata.nextLink'
    }
    
    Write-Host "[OK] Found $($allEvents.Count) events" -ForegroundColor Green
    
    if ($allEvents.Count -eq 0) {
        Write-Host "`nNo events found in the specified date range." -ForegroundColor Yellow
        Disconnect-MgGraph
        exit 0
    }
    
    # Display events
    Write-Host "`nEvents found:" -ForegroundColor Cyan
    foreach ($event in $allEvents) {
        $startTime = [DateTime]::Parse($event.start.dateTime)
        Write-Host "  - $($event.subject) ($($startTime.ToString('yyyy-MM-dd HH:mm')))" -ForegroundColor White
    }
    
    if ($DryRun) {
        Write-Host "`n[DRY RUN] Would delete $($allEvents.Count) events" -ForegroundColor Yellow
        Write-Host "Run without -DryRun to actually delete them" -ForegroundColor Yellow
        Disconnect-MgGraph
        exit 0
    }
    
    # Confirm deletion
    $confirm = Read-Host "`nDelete $($allEvents.Count) events? (yes/no)"
    if ($confirm -ne 'yes') {
        Write-Host "Cancelled" -ForegroundColor Yellow
        Disconnect-MgGraph
        exit 0
    }
    
    # Delete events
    Write-Host "`nDeleting events..." -ForegroundColor Green
    $deleted = 0
    $failed = 0
    
    foreach ($event in $allEvents) {
        try {
            Invoke-MgGraphRequest -Method DELETE -Uri "https://graph.microsoft.com/v1.0/me/events/$($event.id)"
            $deleted++
            Write-Host "  [OK] Deleted: $($event.subject)" -ForegroundColor Green
        } catch {
            $failed++
            Write-Host "  [ERROR] Failed: $($event.subject)" -ForegroundColor Red
        }
    }
    
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Deleted: $deleted" -ForegroundColor Green
    Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
    Write-Host "========================================`n" -ForegroundColor Cyan
    
} catch {
    Write-Host "[ERROR] $($_.Exception.Message)" -ForegroundColor Red
} finally {
    Disconnect-MgGraph
    Write-Host "Disconnected" -ForegroundColor Green
}

