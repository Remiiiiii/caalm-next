# Enhanced Notification System

## Overview

The notification system has been completely enhanced to support database-driven configuration, automatic and manual triggering, and improved performance with proper TypeScript typing throughout.

## Key Features

### 1. Database-Driven Configuration

- **NotificationTypes Collection**: Stores notification type configurations in the database
- **Dynamic Rendering**: Icons, colors, and styling are loaded from the database
- **Admin Management**: Notification types can be created, updated, and disabled via API

### 2. Enhanced Notifications Collection

- **Extended Schema**: Added priority, action URLs, metadata, trigger information
- **Performance Indexes**: Optimized queries with proper database indexing
- **Flexible Filtering**: Support for search, type, status, priority, and date range filters

### 3. Comprehensive API Layer

- **RESTful Endpoints**: Complete CRUD operations for notifications and notification types
- **Advanced Filtering**: Support for complex queries with pagination and sorting
- **Bulk Operations**: Efficient handling of multiple notifications
- **Statistics**: Real-time notification statistics and analytics

### 4. Enhanced Hooks and Services

- **Type-Safe Hooks**: Full TypeScript support with proper interfaces
- **SWR Integration**: Optimistic updates and real-time synchronization
- **Error Handling**: Comprehensive error handling with user-friendly messages

## Database Schema

### NotificationTypes Collection

```typescript
interface NotificationType {
  $id: string;
  type_key: string; // Unique identifier (e.g., 'contract-expiry')
  label: string; // Display name (e.g., 'Contract Expiry')
  icon: string; // Icon name (e.g., 'Calendar')
  color_classes: string; // Tailwind classes for colors
  bg_color_classes: string; // Tailwind classes for background
  priority: 'low' | 'medium' | 'high' | 'urgent';
  enabled: boolean; // Whether this type is active
  description?: string; // Optional description
  $createdAt: string;
  $updatedAt: string;
}
```

### Notifications Collection

```typescript
interface Notification {
  $id: string;
  userId: string;
  title: string;
  message: string;
  type: string; // References NotificationType.type_key
  read: boolean;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string; // Optional action URL
  actionText?: string; // Optional action button text
  metadata?: string; // JSON string for additional data
  triggeredBy?: string; // Who/what triggered the notification
  triggerType?: 'manual' | 'automatic' | 'scheduled';
  $createdAt: string;
  $updatedAt: string;
}
```

## API Endpoints

### Notifications

- `GET /api/notifications?userId={id}` - Get user notifications with filtering
- `POST /api/notifications` - Create new notification
- `PUT /api/notifications/{id}/read` - Mark notification as read
- `PUT /api/notifications/{id}/unread` - Mark notification as unread
- `DELETE /api/notifications/{id}` - Delete notification
- `GET /api/notifications/stats?userId={id}` - Get notification statistics
- `GET /api/notifications/unread-count?userId={id}` - Get unread count
- `GET /api/notifications/recent?userId={id}&limit={n}` - Get recent notifications

### Notification Types

- `GET /api/notification-types` - Get all notification types
- `POST /api/notification-types` - Create new notification type
- `GET /api/notification-types/{id}` - Get specific notification type
- `PUT /api/notification-types/{id}` - Update notification type
- `DELETE /api/notification-types/{id}` - Delete notification type

## Usage Examples

### Creating a Notification

```typescript
import { useNotifications } from '@/hooks/useNotifications';

const { createNotification } = useNotifications();

// Manual notification
await createNotification({
  userId: 'user123',
  title: 'Contract Expiring Soon',
  message: 'Your contract will expire in 30 days',
  type: 'contract-expiry',
  priority: 'high',
  actionUrl: '/contracts/123',
  actionText: 'View Contract',
  triggerType: 'manual',
  triggeredBy: 'admin',
});

// Automatic notification
await createNotification({
  userId: 'user123',
  title: 'File Uploaded',
  message: 'New document has been uploaded',
  type: 'file-uploaded',
  triggerType: 'automatic',
  triggeredBy: 'system',
  metadata: { fileId: 'file123', fileName: 'contract.pdf' },
});
```

### Using Notification Types

```typescript
import { useNotificationTypes } from '@/hooks/useNotifications';

const { notificationTypes, createNotificationType } = useNotificationTypes();

// Create a new notification type
await createNotificationType({
  type_key: 'custom-alert',
  label: 'Custom Alert',
  icon: 'AlertTriangle',
  color_classes: 'bg-red-100 text-red-800',
  bg_color_classes: 'bg-red-50/30 border-red-400',
  priority: 'urgent',
  enabled: true,
  description: 'Custom alert notifications',
});
```

### Filtering and Sorting

```typescript
// In your component
const [filters, setFilters] = useState({
  search: '',
  type: 'all',
  status: 'all',
  priority: 'all',
});

const [sort, setSort] = useState({
  field: 'date',
  direction: 'desc',
});

// The API will handle the filtering and sorting
const { notifications } = useNotifications(userId);
```

## Performance Optimizations

### 1. Database Indexes

- `user_read_index`: Composite index on `userId` and `read` for quick unread queries
- `user_created_index`: Composite index on `userId` and `$createdAt` for sorting
- `type_key_index`: Index on notification type keys for quick lookups

### 2. Caching Strategy

- **SWR Integration**: Automatic caching and revalidation
- **Optimistic Updates**: Immediate UI updates with background synchronization
- **Stale-While-Revalidate**: Show cached data while fetching fresh data

### 3. Pagination

- **Server-side Pagination**: Efficient handling of large notification lists
- **Configurable Limits**: Adjustable page sizes (5, 10, 20, 50)
- **Offset-based**: Standard pagination with offset and limit

## Security Considerations

### 1. User Permissions

- **Collection-level Permissions**: Proper read/write permissions for different user roles
- **Document Security**: Individual document permissions where needed
- **API Validation**: Server-side validation of all inputs

### 2. Data Sanitization

- **XSS Prevention**: All user inputs are sanitized
- **SQL Injection Protection**: Using parameterized queries via Appwrite
- **Rate Limiting**: Implemented for manual notification creation

### 3. Audit Trail

- **Trigger Tracking**: All notifications track who/what triggered them
- **Metadata Storage**: Additional context stored as JSON
- **Timestamps**: Full audit trail with creation and update times

## Migration Guide

### From Hardcoded Types to Database-Driven

1. **Existing Notifications**: All existing notifications are preserved
2. **Type Migration**: Notification types have been migrated to the database
3. **Backward Compatibility**: The system maintains compatibility with existing code

### Component Updates

1. **NotificationCenter**: Updated to use database-driven configuration
2. **Dynamic Icons**: New `NotificationIcon` component for dynamic icon rendering
3. **Enhanced Filtering**: Improved search and filter capabilities

## Best Practices

### 1. Code Organization

- **Service Layer**: Business logic separated into `notificationService`
- **Type Safety**: Comprehensive TypeScript interfaces
- **Error Handling**: Proper error boundaries and user feedback

### 2. Performance

- **Lazy Loading**: Load notification history on demand
- **Debounced Search**: Efficient search with debouncing
- **Virtual Scrolling**: For large notification lists (future enhancement)

### 3. User Experience

- **Real-time Updates**: Live notification counts and updates
- **Progressive Enhancement**: Graceful degradation for older browsers
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Future Enhancements

### 1. Real-time Notifications

- **WebSocket Integration**: Live notification delivery
- **Push Notifications**: Browser push notifications
- **Email Integration**: Email notifications for important alerts

### 2. Advanced Features

- **Notification Templates**: Reusable notification templates
- **Scheduled Notifications**: Time-based notification delivery
- **Notification Groups**: Group-related notifications

### 3. Analytics

- **Notification Analytics**: Track notification engagement
- **User Preferences**: Granular notification preferences
- **A/B Testing**: Test different notification formats

## Troubleshooting

### Common Issues

1. **Notification Types Not Loading**

   - Check if the `notification_types` collection exists
   - Verify collection permissions
   - Check API endpoint availability

2. **Performance Issues**

   - Ensure database indexes are created
   - Check for large notification lists
   - Verify SWR cache configuration

3. **Type Errors**
   - Ensure all TypeScript interfaces are imported
   - Check for missing type definitions
   - Verify API response formats

### Debug Mode

Enable debug logging by setting the environment variable:

```bash
NEXT_PUBLIC_DEBUG_NOTIFICATIONS=true
```

This will log all notification operations to the console for debugging purposes.
