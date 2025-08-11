# Contract Expiration Notification System

## Overview

This system automatically sends notifications to executives, managers, and HR personnel when contracts are approaching their expiration dates. The notifications are department-aware, meaning managers only receive notifications for contracts in their department.

## Features

1. **Department-based Notifications**:

   - Executives and HR receive notifications for all contracts
   - Managers only receive notifications for contracts in their department

2. **Expiration Thresholds**: Notifications are sent when contracts are:

   - 30 days from expiration
   - 15 days from expiration
   - 10 days from expiration
   - 5 days from expiration
   - 1 day from expiration

3. **Notification Badge**: The bell icon in the header shows a badge with the count of unread notifications

4. **Department Assignment**: Contracts can be assigned to departments through the Assign action in the file dropdown

## Database Setup

### Contracts Collection

Ensure your contracts collection has the following attributes:

- `department` (enum): 'childwelfare', 'behavioralhealth', 'finance', 'operations'
- `contractExpiryDate` (datetime): The expiration date of the contract
- `status` (enum): Contract status
- `contractName` (string): Name of the contract
- `assignedManagers` (array): Array of manager account IDs

### Notifications Collection

Ensure your notifications collection has the following attributes:

- `userId` (string): The user who should receive the notification
- `title` (string): Notification title
- `message` (string): Notification message
- `type` (string): Type of notification (e.g., 'contract-expiry')
- `read` (boolean): Whether the notification has been read

## Environment Variables

Add the following environment variable for the cron job:

```
CRON_SECRET_TOKEN=your-secret-token-here
```

## Cron Job Setup

To automatically check for contract expirations, set up a cron job to call the API endpoint:

```bash
# Check every day at 9 AM
0 9 * * * curl -H "Authorization: Bearer your-secret-token-here" https://your-domain.com/api/cron/check-contracts
```

Or use a service like:

- **Vercel Cron**: Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-contracts",
      "schedule": "0 9 * * *"
    }
  ]
}
```

- **GitHub Actions**: Create `.github/workflows/check-contracts.yml`:

```yaml
name: Check Contract Expirations
on:
  schedule:
    - cron: '0 9 * * *'

jobs:
  check-contracts:
    runs-on: ubuntu-latest
    steps:
      - name: Check Contract Expirations
        run: |
          curl -H "Authorization: Bearer ${{ secrets.CRON_SECRET_TOKEN }}" \
               https://your-domain.com/api/cron/check-contracts
```

## Manual Testing

You can manually trigger the contract expiration check by calling:

```bash
curl -X POST https://your-domain.com/api/contracts/check-expirations
```

## Department Assignment

To assign a department to a contract:

1. Open the file dropdown menu on a contract file
2. Click "Assign"
3. Select a department from the radio buttons
4. Select one or more managers
5. Click "Assign Contract"

## Notification Display

Notifications appear in the notification center (bell icon) and show:

- Contract name
- Department
- Days until expiration
- Expiration date

The notification badge shows the count of unread notifications and updates in real-time.

## Troubleshooting

1. **No notifications appearing**: Check that contracts have valid `contractExpiryDate` values
2. **Managers not receiving notifications**: Ensure contracts have a `department` assigned
3. **Cron job not working**: Verify the `CRON_SECRET_TOKEN` environment variable is set correctly
4. **Database errors**: Check that all required collections and attributes exist in your Appwrite database
