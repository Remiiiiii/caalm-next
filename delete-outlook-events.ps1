# PowerShell script to mass delete Outlook events
# Enhanced version with better filtering, progress tracking, and error handling
# This script uses Microsoft Graph API to delete events

param(
    [string]$SubjectFilter = "",
    [string]$DateFrom = "",
    [string]$DateTo = "",
    [string]$CategoryFilter = "",
    [string]$OrganizerFilter = "",
    [int]$DaysBack = 0,
    [int]$DaysForward = 0,
    [switch]$DryRun = $false,
    [switch]$ExportCSV = $false,
    [string]$OutputPath = ".",
    [int]$BatchSize = 10,
    [int]$RetryCount = 3,
    [int]$DelayBetweenBatches = 1000
)

# Function to parse relative dates
function ParseRelativeDate {
    param([string]$DateInput, [bool]$IsPast = $true)
    
    if ([string]::IsNullOrWhiteSpace($DateInput)) {
        if ($IsPast) {
            return (Get-Date).AddDays(-$DaysBack).ToString("yyyy-MM-dd")
        } else {
            return (Get-Date).AddDays($DaysForward).ToString("yyyy-MM-dd")
        }
    }
    
    # Try to parse as relative date (e.g., "30 days ago", "1 week ago")
    if ($DateInput -match "(\d+)\s*(day|week|month|year)s?\s*(ago|from now)") {
        $value = [int]$Matches[1]
        $unit = $Matches[2]
        $direction = $Matches[3]
        
        $date = Get-Date
        switch ($unit) {
            "day" { $offset = $value }
            "week" { $offset = $value * 7 }
            "month" { $offset = $value * 30 }
            "year" { $offset = $value * 365 }
        }
        
        if ($direction -eq "ago") {
            $date = $date.AddDays(-$offset)
        } else {
            $date = $date.AddDays($offset)
        }
        
        return $date.ToString("yyyy-MM-dd")
    }
    
    # Try to parse as absolute date
    try {
        $parsed = [DateTime]::Parse($DateInput)
        return $parsed.ToString("yyyy-MM-dd")
    } catch {
        Write-Host "Warning: Could not parse date '$DateInput', using today" -ForegroundColor Yellow
        return (Get-Date).ToString("yyyy-MM-dd")
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Enhanced Outlook Event Deletion Script" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Parse dates
$parsedDateFrom = ParseRelativeDate -DateInput $DateFrom -IsPast $true
$parsedDateTo = ParseRelativeDate -DateInput $DateTo -IsPast $false

Write-Host "Configuration:" -ForegroundColor Green
Write-Host "  Subject Filter: $(if ($SubjectFilter) { $SubjectFilter } else { 'None' })" -ForegroundColor Yellow
Write-Host "  Date Range: $parsedDateFrom to $parsedDateTo" -ForegroundColor Yellow
Write-Host "  Category Filter: $(if ($CategoryFilter) { $CategoryFilter } else { 'None' })" -ForegroundColor Yellow
Write-Host "  Organizer Filter: $(if ($OrganizerFilter) { $OrganizerFilter } else { 'None' })" -ForegroundColor Yellow
Write-Host "  Batch Size: $BatchSize" -ForegroundColor Yellow
Write-Host "  Retry Count: $RetryCount" -ForegroundColor Yellow
Write-Host "  Dry Run: $DryRun`n" -ForegroundColor Yellow

# Load required modules
try {
    # Try to load Microsoft.Graph (core module with authentication support)
    Import-Module Microsoft.Graph.Authentication -ErrorAction Stop
    Write-Host "[OK] Microsoft.Graph.Authentication module loaded successfully" -ForegroundColor Green
} catch {
    Write-Host "Installing Microsoft.Graph module..." -ForegroundColor Yellow
    try {
        # Install the main Graph module which includes authentication
        Install-Module Microsoft.Graph -Force -AllowClobber -Scope CurrentUser
        Import-Module Microsoft.Graph.Authentication
        Write-Host "[OK] Module installed and loaded successfully" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Failed to install Microsoft.Graph module" -ForegroundColor Red
        Write-Host "Please run as Administrator or install manually:" -ForegroundColor Yellow
        Write-Host "  Install-Module Microsoft.Graph -Scope CurrentUser" -ForegroundColor Gray
        exit 1
    }
}

# Connect to Microsoft Graph
Write-Host "`nConnecting to Microsoft Graph..." -ForegroundColor Green
try {
    $context = Get-MgContext
    if (-not $context -or $context.Scopes -notcontains "Calendars.ReadWrite") {
        Write-Host "Authenticating to Microsoft Graph..." -ForegroundColor Yellow
        Write-Host "A browser window will open for authentication." -ForegroundColor Yellow
        
        # Disconnect any existing session first to ensure clean auth
        try { Disconnect-MgGraph -ErrorAction SilentlyContinue } catch { }
        
        # Use interactive browser authentication (most reliable)
        Connect-MgGraph -Scopes "Calendars.ReadWrite" -NoWelcome -ErrorAction Stop
    } else {
        Write-Host "[OK] Already connected to Microsoft Graph" -ForegroundColor Green
    }
    
    # Verify we have a valid context
    $context = Get-MgContext
    if (-not $context) {
        throw "Authentication failed - no context available"
    }
    
    Write-Host "[OK] Connected successfully!" -ForegroundColor Green
    Write-Host "Account: $($context.Account)" -ForegroundColor Gray
} catch {
    Write-Host "[ERROR] Failed to connect to Microsoft Graph: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Please check your credentials and try again." -ForegroundColor Yellow
    exit 1
}

# Get user's calendar using Invoke-MgGraphRequest
Write-Host "`nGetting calendar information..." -ForegroundColor Green
try {
    # Check authentication
    $context = Get-MgContext
    if (-not $context) {
        Write-Host "[ERROR] Not authenticated. Please connect first." -ForegroundColor Red
        exit 1
    }
    
    # Get calendars using Invoke-MgGraphRequest (handles auth automatically)
    $calendarsResponse = Invoke-MgGraphRequest -Method GET -Uri "https://graph.microsoft.com/v1.0/me/calendars" -ErrorAction Stop
    $calendars = $calendarsResponse.value
    
    if (-not $calendars -or $calendars.Count -eq 0) {
        Write-Host "[ERROR] No calendars found!" -ForegroundColor Red
        Disconnect-MgGraph
        exit 1
    }
    
    # Find the default calendar, or use the first one
    $calendar = $calendars | Where-Object { $_.isDefaultCalendar -eq $true } | Select-Object -First 1
    if (-not $calendar) {
        $calendar = $calendars[0]
        Write-Host "[WARN] No default calendar found, using first calendar: $($calendar.name)" -ForegroundColor Yellow
    } else {
        Write-Host "[OK] Using calendar: $($calendar.name)" -ForegroundColor Green
    }
    
    # Store calendar ID for later use
    $script:calendarId = $calendar.id
} catch {
    Write-Host "[ERROR] Error getting calendar: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Gray
    }
    Disconnect-MgGraph
    exit 1
}

# Build filter for events
$dateFromEscaped = $parsedDateFrom.Replace("'", "''")
$dateToEscaped = $parsedDateTo.Replace("'", "''")
$filter = "start/dateTime ge '$dateFromEscaped' and start/dateTime le '$dateToEscaped'"
if (-not [string]::IsNullOrWhiteSpace($SubjectFilter)) {
    $subjectEscaped = $SubjectFilter.Replace("'", "''")
    $filter += " and contains(subject,'$subjectEscaped')"
}
if (-not [string]::IsNullOrWhiteSpace($CategoryFilter)) {
    $categoryEscaped = $CategoryFilter.Replace("'", "''")
    $filter += " and categories/any(c: c eq '$categoryEscaped')"
}

Write-Host "`nSearching for events with filter: $filter" -ForegroundColor Yellow

# Get events with pagination support using Invoke-MgGraphRequest
try {
    $allEvents = @()
    
    # Build calendarView URL for date range query
    $startDateTime = [DateTime]::Parse($parsedDateFrom).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $endDateTime = [DateTime]::Parse($parsedDateTo).AddDays(1).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    
    $url = "https://graph.microsoft.com/v1.0/me/calendars/$calendarId/calendarView?startDateTime=$startDateTime&endDateTime=$endDateTime&`$orderby=start/dateTime"
    
    # Add subject filter if specified
    if (-not [string]::IsNullOrWhiteSpace($SubjectFilter)) {
        $url += "&`$filter=contains(subject,'$($SubjectFilter.Replace("'", "''"))')"
    }
    
    Write-Host "  Fetching events from Graph API..." -ForegroundColor Gray
    
    # Handle pagination
    $nextLink = $url
    while ($nextLink) {
        $response = Invoke-MgGraphRequest -Method GET -Uri $nextLink -ErrorAction Stop
        if ($response.value) {
            $allEvents += $response.value
            Write-Host "  Fetched $($allEvents.Count) events so far..." -ForegroundColor Gray
        }
        $nextLink = $response.'@odata.nextLink'
    }
    
    Write-Host "  Total events fetched: $($allEvents.Count)" -ForegroundColor Gray
    
    # Apply additional filters that can't be done in Graph API query
    if (-not [string]::IsNullOrWhiteSpace($OrganizerFilter)) {
        $allEvents = $allEvents | Where-Object { 
            ($_.organizer -and $_.organizer.emailAddress -and ($_.organizer.emailAddress.address -like "*$OrganizerFilter*" -or $_.organizer.emailAddress.name -like "*$OrganizerFilter*"))
        }
    }
    
    # Filter by category if specified
    if (-not [string]::IsNullOrWhiteSpace($CategoryFilter)) {
        $allEvents = $allEvents | Where-Object {
            $_.categories -and $_.categories -contains $CategoryFilter
        }
    }
    
    Write-Host "[OK] Found $($allEvents.Count) events matching criteria" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Error retrieving events: $($_.Exception.Message)" -ForegroundColor Red
    Disconnect-MgGraph
    exit 1
}

if ($allEvents.Count -eq 0) {
    Write-Host "`nNo events found matching the criteria." -ForegroundColor Yellow
    Disconnect-MgGraph
    exit 0
}

# Display events that will be deleted
Write-Host "`nEvents to be deleted ($($allEvents.Count) total):" -ForegroundColor Cyan
$eventDetails = @()
foreach ($event in $allEvents) {
    $startDate = [DateTime]::Parse($event.start.dateTime)
    $organizer = if ($event.organizer) { $event.organizer.emailAddress.address } else { "N/A" }
    $categories = if ($event.categories) { $event.categories -join ", " } else { "None" }
    
    $eventDetails += [PSCustomObject]@{
        Id = $event.id
        Subject = $event.subject
        StartDate = $startDate.ToString("yyyy-MM-dd HH:mm")
        Organizer = $organizer
        Categories = $categories
        Location = if ($event.location) { $event.location.displayName } else { "N/A" }
    }
    
    Write-Host "  - $($event.subject) ($($startDate.ToString('yyyy-MM-dd HH:mm')))" -ForegroundColor White
}

# Export to CSV if requested
if ($ExportCSV) {
    $csvPath = Join-Path $OutputPath "outlook-events-to-delete-$(Get-Date -Format 'yyyyMMdd-HHmmss').csv"
    $eventDetails | Export-Csv -Path $csvPath -NoTypeInformation
    Write-Host "`n[OK] Events exported to CSV: $csvPath" -ForegroundColor Green
}

if ($DryRun) {
    Write-Host "`n════════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "  DRY RUN MODE - No events will be deleted" -ForegroundColor Yellow
    Write-Host "════════════════════════════════════════`n" -ForegroundColor Yellow
    Write-Host "Remove -DryRun parameter to actually delete events" -ForegroundColor Yellow
    Disconnect-MgGraph
    exit 0
}

# Confirm deletion
Write-Host "`n════════════════════════════════════════" -ForegroundColor Red
$confirmation = Read-Host "Are you sure you want to delete $($allEvents.Count) events? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "Deletion cancelled." -ForegroundColor Yellow
    Disconnect-MgGraph
    exit 0
}

# Delete events in batches with progress tracking
Write-Host "`nDeleting events in batches of $BatchSize..." -ForegroundColor Green
$deletedCount = 0
$errorCount = 0
$failedEvents = @()
$batches = @()

# Create batches
for ($i = 0; $i -lt $allEvents.Count; $i += $BatchSize) {
    $endIndex = [Math]::Min($i + $BatchSize - 1, $allEvents.Count - 1)
    $batch = $allEvents[$i..$endIndex]
    $batches += ,$batch
}

$totalBatches = $batches.Count
$currentBatch = 0

foreach ($batch in $batches) {
    $currentBatch++
    Write-Host "`nProcessing batch $currentBatch of $totalBatches..." -ForegroundColor Cyan
    
    foreach ($event in $batch) {
        $retryAttempt = 0
        $deleted = $false
        
        while ($retryAttempt -lt $RetryCount -and -not $deleted) {
            try {
                # Delete using Invoke-MgGraphRequest (handles auth automatically)
                $deleteUrl = "https://graph.microsoft.com/v1.0/me/calendars/$calendarId/events/$($event.id)"
                Invoke-MgGraphRequest -Method DELETE -Uri $deleteUrl -ErrorAction Stop
                
                $deletedCount++
                $deleted = $true
                Write-Host "  [OK] [$deletedCount/$($allEvents.Count)] Deleted: $($event.subject)" -ForegroundColor Green
            } catch {
                $retryAttempt++
                if ($retryAttempt -ge $RetryCount) {
                    $errorCount++
                    $failedEvents += [PSCustomObject]@{
                        Subject = $event.subject
                        Id = $event.id
                        Error = $_.Exception.Message
                    }
                    Write-Host "  [ERROR] Failed after $RetryCount attempts: $($event.subject) - $($_.Exception.Message)" -ForegroundColor Red
                } else {
                    Write-Host "  [WARN] Retry $retryAttempt/$RetryCount for: $($event.subject)" -ForegroundColor Yellow
                    Start-Sleep -Milliseconds 500
                }
            }
        }
    }
    
    # Delay between batches to avoid rate limiting
    if ($currentBatch -lt $totalBatches) {
        Write-Host "  Waiting $($DelayBetweenBatches)ms before next batch..." -ForegroundColor Gray
        Start-Sleep -Milliseconds $DelayBetweenBatches
    }
}

# Final summary
Write-Host "`n════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Deletion Summary" -ForegroundColor Cyan
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Total events processed: $($allEvents.Count)" -ForegroundColor White
Write-Host "Successfully deleted: $deletedCount events" -ForegroundColor Green
Write-Host "Failed to delete: $errorCount events" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })

if ($failedEvents.Count -gt 0) {
    Write-Host "`nFailed events:" -ForegroundColor Red
    foreach ($failed in $failedEvents) {
        Write-Host "  - $($failed.Subject): $($failed.Error)" -ForegroundColor Red
    }
    
    # Export failed events to CSV
    $failedCsvPath = Join-Path $OutputPath "failed-deletions-$(Get-Date -Format 'yyyyMMdd-HHmmss').csv"
    $failedEvents | Export-Csv -Path $failedCsvPath -NoTypeInformation
    Write-Host "`n[OK] Failed events exported to: $failedCsvPath" -ForegroundColor Yellow
}

# Disconnect
Disconnect-MgGraph
Write-Host "`n[OK] Disconnected from Microsoft Graph." -ForegroundColor Green
Write-Host "`nScript completed!`n" -ForegroundColor Green
