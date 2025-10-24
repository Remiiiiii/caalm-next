# PowerShell script to mass delete Outlook events
# This script uses Microsoft Graph API to delete events

param(
    [string]$SubjectFilter = "New Event",
    [string]$DateFrom = "2025-10-01",
    [string]$DateTo = "2025-10-31",
    [switch]$DryRun = $false
)

Write-Host "Starting Outlook event deletion script..." -ForegroundColor Green
Write-Host "Subject Filter: $SubjectFilter" -ForegroundColor Yellow
Write-Host "Date Range: $DateFrom to $DateTo" -ForegroundColor Yellow

# Load required modules
try {
    Import-Module Microsoft.Graph.Calendar -ErrorAction Stop
    Write-Host "Microsoft.Graph.Calendar module loaded successfully" -ForegroundColor Green
} catch {
    Write-Host "Installing Microsoft.Graph.Calendar module..." -ForegroundColor Yellow
    try {
        Install-Module Microsoft.Graph.Calendar -Force -AllowClobber
        Import-Module Microsoft.Graph.Calendar
        Write-Host "Module installed and loaded successfully" -ForegroundColor Green
    } catch {
        Write-Host "Failed to install Microsoft.Graph.Calendar module" -ForegroundColor Red
        Write-Host "Please run as Administrator or install manually" -ForegroundColor Yellow
        exit 1
    }
}

# Connect to Microsoft Graph
Write-Host "Connecting to Microsoft Graph..." -ForegroundColor Green
try {
    Connect-MgGraph -Scopes "Calendars.ReadWrite"
    Write-Host "Connected successfully!" -ForegroundColor Green
} catch {
    Write-Host "Failed to connect to Microsoft Graph. Please check your credentials." -ForegroundColor Red
    exit 1
}

# Get user's calendar
Write-Host "Getting calendar information..." -ForegroundColor Green
$calendar = Get-MgUserCalendar -UserId (Get-MgContext).Account.Id -Filter "isDefaultCalendar eq true"

if (-not $calendar) {
    Write-Host "No default calendar found!" -ForegroundColor Red
    Disconnect-MgGraph
    exit 1
}

Write-Host "Using calendar: $($calendar.Name)" -ForegroundColor Green

# Build filter for events
$filter = "start/dateTime ge '$DateFrom' and start/dateTime le '$DateTo'"
if ($SubjectFilter) {
    $filter += " and contains(subject,'$SubjectFilter')"
}

Write-Host "Searching for events with filter: $filter" -ForegroundColor Yellow

# Get events
try {
    $events = Get-MgUserEvent -UserId (Get-MgContext).Account.Id -Filter $filter -All
    Write-Host "Found $($events.Count) events matching criteria" -ForegroundColor Green
} catch {
    Write-Host "Error retrieving events: $($_.Exception.Message)" -ForegroundColor Red
    Disconnect-MgGraph
    exit 1
}

if ($events.Count -eq 0) {
    Write-Host "No events found matching the criteria." -ForegroundColor Yellow
    Disconnect-MgGraph
    exit 0
}

# Display events that will be deleted
Write-Host "`nEvents to be deleted:" -ForegroundColor Cyan
foreach ($event in $events) {
    $startDate = [DateTime]::Parse($event.Start.DateTime)
    Write-Host "- $($event.Subject) ($($startDate.ToString('yyyy-MM-dd HH:mm')))" -ForegroundColor White
}

if ($DryRun) {
    Write-Host "`nDRY RUN MODE - No events will be deleted" -ForegroundColor Yellow
    Write-Host "Remove -DryRun parameter to actually delete events" -ForegroundColor Yellow
    Disconnect-MgGraph
    exit 0
}

# Confirm deletion
$confirmation = Read-Host "`nAre you sure you want to delete $($events.Count) events? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "Deletion cancelled." -ForegroundColor Yellow
    Disconnect-MgGraph
    exit 0
}

# Delete events
Write-Host "`nDeleting events..." -ForegroundColor Green
$deletedCount = 0
$errorCount = 0

foreach ($event in $events) {
    try {
        Remove-MgUserEvent -UserId (Get-MgContext).Account.Id -EventId $event.Id
        $deletedCount++
        Write-Host "✓ Deleted: $($event.Subject)" -ForegroundColor Green
    } catch {
        $errorCount++
        Write-Host "✗ Failed to delete: $($event.Subject) - $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nDeletion Summary:" -ForegroundColor Cyan
Write-Host "Successfully deleted: $deletedCount events" -ForegroundColor Green
Write-Host "Failed to delete: $errorCount events" -ForegroundColor Red

# Disconnect
Disconnect-MgGraph
Write-Host "`nDisconnected from Microsoft Graph." -ForegroundColor Green
