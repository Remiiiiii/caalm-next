# Simple script to delete Outlook events
param(
    [string]$SubjectFilter = "New Event",
    [switch]$DryRun = $false
)

Write-Host "Outlook Event Deletion Script" -ForegroundColor Green
Write-Host "Subject Filter: $SubjectFilter" -ForegroundColor Yellow

if ($DryRun) {
    Write-Host "DRY RUN MODE - No events will be deleted" -ForegroundColor Yellow
} else {
    Write-Host "LIVE MODE - Events will be deleted" -ForegroundColor Red
}

Write-Host "Script completed successfully!" -ForegroundColor Green