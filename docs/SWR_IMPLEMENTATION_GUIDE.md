# SWR Implementation Guide for CAALM

## Overview

This guide provides a comprehensive implementation plan for replacing manual state management with SWR (Stale-While-Revalidate) in the CAALM application. SWR will provide automatic caching, background updates, and optimistic UI updates.

## Components Requiring SWR Implementation

### 1. NotificationCenter ✅

**Current Issues:**

- Manual `useState`/`useEffect` fetch calls
- No real-time updates
- Basic state management

**SWR Solution:**

- **Hook:** `useNotifications`
- **Features:**
  - Real-time notification updates (30s refresh)
  - Optimistic UI for read/unread actions
  - Automatic revalidation on focus/reconnect
  - Notification statistics caching

**Usage:**

```typescript
const { notifications, stats, markAsRead, markAllAsRead, deleteNotification } =
  useNotifications();
```

### 2. ExecutiveDashboard ✅

**Current Issues:**

- Complex manual caching logic
- Multiple loading states
- No real-time updates

**SWR Solution:**

- **Hook:** `useDashboardData`
- **Features:**
  - Simplified data fetching
  - Real-time updates for invitations, users, files
  - Optimistic updates for invitations
  - Granular refresh intervals

**Usage:**

```typescript
const {
  stats,
  files,
  invitations,
  authUsers,
  createInvitation,
  revokeInvitation,
} = useDashboardData(orgId);
```

### 3. DocumentViewer ✅

**Current Issues:**

- Multiple redundant fetch calls
- No caching for expensive operations

**SWR Solution:**

- **Hook:** `useDocumentViewer`
- **Features:**
  - Cache file content (5min deduping)
  - Cache AI analysis results (10min deduping)
  - Optimize PDF processing
  - Background revalidation

**Usage:**

```typescript
const { fileContent, aiAnalysis, pdfMetadata, extractText, analyzeWithAI } =
  useDocumentViewer(fileId);
```

### 4. Search ✅

**Current Issues:**

- Basic state management
- No search caching

**SWR Solution:**

- **Hook:** `useSearch`
- **Features:**
  - Debounced search queries (300ms)
  - Search result caching (1min deduping)
  - Search suggestions (5min cache)
  - Search history management

**Usage:**

```typescript
const { results, suggestions, recentSearches, performSearch, saveSearch } =
  useSearch();
```

### 5. FileUploader ✅

**Current Issues:**

- Primitive state management
- No upload status tracking

**SWR Solution:**

- **Hook:** `useFileUploader`
- **Features:**
  - Cache file list (30s refresh)
  - Upload status tracking (5s refresh)
  - Storage usage monitoring (1min refresh)
  - Optimistic file operations

**Usage:**

```typescript
const { files, uploadQueue, storageUsage, addToUploadQueue, deleteFile } =
  useFileUploader(department);
```

### 6. ActionDropdown ✅

**Current Issues:**

- Static email lists
- No dynamic updates

**SWR Solution:**

- **Hook:** `useActionDropdown`
- **Features:**
  - Cache user emails (2min refresh)
  - File action history (30s refresh)
  - User permissions caching
  - Optimistic action updates

**Usage:**

```typescript
const { userEmails, fileActions, userPermissions, assignFile, shareFile } =
  useActionDropdown(fileId);
```

### 7. TwoFactorModal ✅

**Current Issues:**

- Unoptimized status checks

**SWR Solution:**

- **Hook:** `useTwoFactor`
- **Features:**
  - Cache 2FA status (30s refresh)
  - Streamline setup flow
  - Optimistic 2FA operations
  - Background revalidation

**Usage:**

```typescript
const { status, setup, setupTwoFactor, verifyTwoFactor, disableTwoFactor } =
  useTwoFactor();
```

### 8. ReportsPage ✅

**Current Issues:**

- Manual department data handling

**SWR Solution:**

- **Hook:** `useReports`
- **Features:**
  - Cache department info (5min refresh)
  - Live report updates (1min refresh)
  - Report templates caching (10min refresh)
  - Optimistic report generation

**Usage:**

```typescript
const {
  departments,
  recentReports,
  reportTemplates,
  generateReport,
  exportReport,
} = useReports();
```

## Implementation Steps

### Step 1: Update SWR Configuration

```typescript
// src/lib/swr-config.ts
export const swrConfig = {
  fetcher: (url: string) => fetch(url).then((res) => res.json()),
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 2000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
};
```

### Step 2: Create API Endpoints

Each hook requires corresponding API endpoints:

```typescript
// Example: /api/notifications/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  // Fetch notifications from Appwrite
  const notifications = await getNotifications(userId);

  return NextResponse.json({ data: notifications });
}
```

### Step 3: Replace Component Logic

Replace manual state management with SWR hooks:

```typescript
// Before
const [notifications, setNotifications] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  fetchNotifications().then(setNotifications);
}, []);

// After
const { notifications, isLoading } = useNotifications();
```

### Step 4: Add Optimistic Updates

Implement optimistic updates for better UX:

```typescript
const markAsRead = async (notificationId: string) => {
  // Optimistic update
  mutate(
    `/api/notifications?userId=${userId}`,
    (current) =>
      current?.map((n) =>
        n.$id === notificationId ? { ...n, read: true } : n
      ),
    false
  );

  // API call
  await fetch(`/api/notifications/${notificationId}/read`, { method: 'PUT' });

  // Revalidate
  mutate(`/api/notifications?userId=${userId}`);
};
```

## Benefits of SWR Implementation

### 1. Performance Improvements

- **Automatic Caching:** Reduces redundant API calls
- **Background Updates:** Keeps data fresh without blocking UI
- **Deduplication:** Prevents multiple simultaneous requests
- **Optimistic Updates:** Immediate UI feedback

### 2. Better User Experience

- **Real-time Updates:** Data stays current automatically
- **Loading States:** Consistent loading indicators
- **Error Handling:** Graceful error recovery
- **Offline Support:** Cached data available offline

### 3. Developer Experience

- **Simplified State Management:** Less boilerplate code
- **Automatic Revalidation:** No manual refresh logic
- **Type Safety:** Full TypeScript support
- **Debugging:** Built-in dev tools

## Migration Checklist

### Phase 1: Core Components

- [ ] NotificationCenter
- [ ] ExecutiveDashboard
- [ ] DocumentViewer

### Phase 2: User Interaction Components

- [ ] Search
- [ ] FileUploader
- [ ] ActionDropdown

### Phase 3: Authentication & Reports

- [ ] TwoFactorModal
- [ ] ReportsPage

### Phase 4: Testing & Optimization

- [ ] Performance testing
- [ ] Error handling validation
- [ ] Cache optimization
- [ ] User acceptance testing

## Best Practices

### 1. Cache Strategy

```typescript
// Frequent updates (notifications, uploads)
refreshInterval: 30000;

// Moderate updates (dashboard data)
refreshInterval: 60000;

// Static data (templates, departments)
refreshInterval: 300000;
```

### 2. Error Handling

```typescript
const { data, error, isLoading } = useSWR(key, fetcher, {
  onError: (error) => {
    console.error('SWR Error:', error);
    toast.error('Failed to load data');
  },
  errorRetryCount: 3,
});
```

### 3. Optimistic Updates

```typescript
// Always provide fallback data
const { data = [] } = useSWR(key, fetcher);

// Use optimistic updates for mutations
mutate(key, newData, false); // Optimistic
await apiCall(); // Actual update
mutate(key); // Revalidate
```

### 4. Type Safety

```typescript
interface ApiResponse<T> {
  data: T;
  error?: string;
}

const { data } = useSWR<ApiResponse<Notification[]>>(key, fetcher);
const notifications = data?.data || [];
```

## Monitoring & Analytics

### 1. Performance Metrics

- Cache hit rates
- API call frequency
- Loading times
- Error rates

### 2. User Experience Metrics

- Time to interactive
- Perceived performance
- Error recovery success
- Offline usage patterns

## Conclusion

Implementing SWR across the CAALM application will significantly improve performance, user experience, and developer productivity. The systematic approach outlined in this guide ensures a smooth migration with minimal disruption to existing functionality.

The key benefits include:

- **Reduced API calls** through intelligent caching
- **Better UX** with optimistic updates and real-time data
- **Simplified codebase** with less state management boilerplate
- **Improved reliability** with automatic error handling and retries

Start with the core components (NotificationCenter, ExecutiveDashboard) and gradually migrate other components following the phases outlined in the migration checklist.
