# SAM.gov API Integration Guide

This document outlines the implementation of SAM.gov contract opportunities integration in the CAALM application.

## Overview

The SAM.gov integration allows users to search and view government contract opportunities directly within the CAALM dashboard. This feature provides executives and administrators with access to real-time contract data from the official U.S. government contracting portal.

## Features Implemented

### 1. Core API Integration

- **SAM.gov API Service** (`src/lib/sam-api.ts`)
- **Configuration & Types** (`src/lib/sam-config.ts`)
- **API Routes** (`src/app/api/contracts/route.ts`)
- **SWR Hooks** (`src/hooks/useContracts.ts`)

### 2. User Interface Components

- **Advanced Resources Page** (`src/app/(root)/contracts/advanced-resources/page.tsx`)
- **Contracts Display Component** (`src/components/ContractsDisplay.tsx`)
- **Dashboard Widget** (`src/components/ContractOpportunitiesWidget.tsx`)

### 3. Navigation Integration

- Added "Advanced Resources" link to Contracts section in sidebar
- Available to Executive and Admin roles

## Setup Instructions

### 1. API Key Registration

1. Visit [SAM.gov](https://sam.gov/) and create an account
2. Navigate to your profile's "Account Details" section
3. Request an API key from the API Key section
4. Copy your SAM.gov API key (this is different from api.data.gov keys)

### 2. Environment Configuration

Add the following to your `.env.local` file:

```env
GOV_API_KEY=your_api_key_here
```

### 3. Verification

1. Restart your development server
2. Navigate to `/contracts/advanced-resources`
3. Use the "Test API Connection" button to verify setup

## API Endpoints Used

### Primary Endpoint

- **Production** (Default): `https://api.sam.gov/opportunities/v2/search`
- **Alpha/Testing**: `https://api-alpha.sam.gov/opportunities/v2/search`

### Critical Requirements

- **API Key**: Must be obtained from SAM.gov (not api.data.gov)
- **Date Parameters**: Required `postedFrom` and `postedTo` in MM/dd/yyyy format
- **Date Range**: Maximum 1 year between from and to dates
- **Rate Limits**: 1,000 requests per hour for public API access
- **Result Limits**: Maximum 1,000 results per request

## Data Structure

### Contract Information Includes:

- Notice ID and Title
- Solicitation Number
- Department/Agency Information
- Posted Date and Response Deadline
- Contract Type and Set-Aside Information
- NAICS Code and Description
- Place of Performance
- Award Information (if applicable)
- Links to SAM.gov details

### Supported Notice Types:

- **o**: Solicitation
- **p**: Presolicitation
- **k**: Combined Synopsis/Solicitation
- **r**: Sources Sought
- **g**: Sale of Surplus Property
- **s**: Special Notice
- **i**: Consolidate/(Substantially) Bundle
- **a**: Award Notice
- **u**: Justification and Authorization

### Set-Aside Types:

- Small Business Set-Aside (SBA)
- 8(a) Business Development
- HUBZone Set-Aside
- Service-Disabled Veteran-Owned Small Business (SDVOSB)
- Women-Owned Small Business (WOSB)
- And more...

## Usage Examples

### Basic Search

```typescript
import { useContractSearch } from '@/hooks/useContracts';

const { searchContracts, contracts, loading } = useContractSearch();

await searchContracts({
  keyword: 'technology',
  noticeType: 'o', // Solicitations only
  limit: 25,
});
```

### Advanced Filtering

```typescript
await searchContracts({
  keyword: 'software development',
  noticeType: 'o',
  setAside: 'SBA',
  state: 'FL',
  dept: 'Defense',
  limit: 50,
});
```

### Dashboard Widget Usage

```typescript
import ContractOpportunitiesWidget from '@/components/ContractOpportunitiesWidget';

<ContractOpportunitiesWidget
  maxItems={5}
  autoRefresh={true}
  searchKeywords={['technology', 'consulting', 'software']}
/>;
```

## Component Architecture

### 1. Service Layer (`sam-api.ts`)

- Handles all API communication
- Error handling and response transformation
- Connection testing utilities

### 2. Configuration (`sam-config.ts`)

- Type definitions and interfaces
- Constants for notice types and set-asides
- Utility functions for formatting

### 3. Data Layer (`useContracts.ts`)

- SWR-powered data fetching
- Caching and revalidation
- Optimistic updates

### 4. UI Components

- **ContractsDisplay**: Full search and results interface
- **ContractOpportunitiesWidget**: Compact dashboard widget

## Error Handling

### Common Issues:

1. **Invalid API Key**: Verify key is correct and active
2. **Rate Limiting**: Implement exponential backoff
3. **Network Errors**: Graceful fallbacks and retry logic
4. **Empty Results**: Clear messaging and search suggestions

### Error Messages:

- API connection failures
- Rate limit exceeded warnings
- Invalid search parameters
- Network connectivity issues

## Performance Considerations

### Caching Strategy:

- **SWR caching** for search results (1 minute)
- **Deduplication** of identical requests
- **Background revalidation** for fresh data

### Optimization:

- Pagination for large result sets
- Debounced search inputs
- Lazy loading of additional results
- Minimal API calls through smart caching

## Security

### API Key Protection:

- Stored in environment variables only
- Never exposed to client-side code
- Validated before use

### Data Handling:

- No sensitive data stored locally
- Direct links to official SAM.gov pages
- Read-only access to public contract data

## Testing

### API Connection Test:

```typescript
import { createSAMApiService } from '@/lib/sam-api';

const samService = createSAMApiService();
const result = await samService.testConnection();
console.log(result.success, result.message);
```

### Component Testing:

- Unit tests for utility functions
- Integration tests for API service
- UI component testing with mock data

## Future Enhancements

### Phase 2 Features:

1. **Saved Searches**: Store frequently used search criteria
2. **Notifications**: Alert users to new matching opportunities
3. **Analytics**: Track opportunity trends and statistics
4. **Export**: Download results as CSV/PDF
5. **Entity Search**: Find vendor/contractor information

### Advanced Features:

1. **Machine Learning**: Recommend relevant opportunities
2. **Calendar Integration**: Track important deadlines
3. **Collaboration**: Share opportunities with team members
4. **Workflow**: Track opportunity status and responses

## Support and Documentation

### Official Resources:

- [SAM.gov API Documentation](https://open.gsa.gov/api/opportunities-api/)
- [API.data.gov Registration](https://api.data.gov/signup/)
- [GSA Open Data Portal](https://open.gsa.gov/)

### Technical Support:

- Check API status at [status.sam.gov](https://status.sam.gov)
- Review rate limits and usage guidelines
- Contact GSA for API-specific issues

## Troubleshooting

### Common Solutions:

1. **No results found**: Try broader search terms
2. **API errors**: Check network connection and API key
3. **Slow responses**: Reduce result set size
4. **Rate limiting**: Implement request delays

### Debug Mode:

Enable detailed logging by setting:

```env
DEBUG_SAM_API=true
```

## Changelog

### Version 1.0.0 (Initial Release)

- Basic contract search functionality
- Dashboard widget integration
- Sidebar navigation added
- API testing tools
- Comprehensive error handling

---

For additional support or feature requests, please contact the development team or create an issue in the project repository.
