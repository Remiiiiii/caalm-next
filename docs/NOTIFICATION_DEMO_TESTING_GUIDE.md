# Notification Demo Endpoint Testing Guide

## 🎯 **Overview**

The notification demo endpoint allows you to test all 11 notification types at once. This is perfect for:

- **Development testing** - Verify notification system functionality
- **UI/UX testing** - See how different notification types appear
- **Demo purposes** - Show stakeholders the notification capabilities
- **Debugging** - Test notification triggers and display

## 📍 **Endpoint Details**

- **URL**: `/api/notifications/demo`
- **Method**: `POST`
- **Authentication**: Required (must be logged in)
- **Response**: JSON with success/error details

## 🧪 **Testing Methods**

### **Method 1: Browser Developer Tools (Easiest)**

1. **Open your browser** and navigate to your app (e.g., `http://localhost:3000`)
2. **Log in** to your account
3. **Open Developer Tools** (F12 or right-click → Inspect)
4. **Go to Console tab**
5. **Run this command**:

```javascript
fetch('/api/notifications/demo', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
})
  .then((response) => response.json())
  .then((data) => console.log('Demo Result:', data))
  .catch((error) => console.error('Error:', error));
```

### **Method 2: Using curl (Command Line)**

```bash
# Make sure you're logged in and have a valid session
curl -X POST http://localhost:3000/api/notifications/demo \
  -H "Content-Type: application/json" \
  -H "Cookie: appwrite-session=YOUR_SESSION_COOKIE" \
  -v
```

### **Method 3: Using Postman**

1. **Open Postman**
2. **Create a new request**:
   - Method: `POST`
   - URL: `http://localhost:3000/api/notifications/demo`
3. **Add headers**:
   - `Content-Type: application/json`
4. **Add cookies** (if needed):
   - `appwrite-session: YOUR_SESSION_COOKIE`
5. **Send the request**

### **Method 4: Using Thunder Client (VS Code Extension)**

1. **Install Thunder Client** extension in VS Code
2. **Create a new request**:
   - Method: `POST`
   - URL: `http://localhost:3000/api/notifications/demo`
3. **Add headers**:
   - `Content-Type: application/json`
4. **Send the request**

### **Method 5: Create a Test Button in Your App**

Add this component to any page for easy testing:

```tsx
// components/NotificationDemoButton.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export function NotificationDemoButton() {
  const [isLoading, setIsLoading] = useState(false);

  const triggerDemo = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/notifications/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Demo Notifications Triggered!',
          description:
            'Check your notification center to see all notification types.',
        });
        console.log('Demo Result:', data);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to trigger demo notifications',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to trigger demo notifications',
        variant: 'destructive',
      });
      console.error('Demo Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={triggerDemo}
      disabled={isLoading}
      variant="outline"
      className="bg-blue-50 hover:bg-blue-100"
    >
      {isLoading ? 'Triggering...' : '🎭 Test All Notifications'}
    </Button>
  );
}
```

Then add it to any page:

```tsx
// In any page component
import { NotificationDemoButton } from '@/components/NotificationDemoButton';

export default function SomePage() {
  return (
    <div>
      <h1>My Page</h1>
      <NotificationDemoButton />
      {/* Rest of your page content */}
    </div>
  );
}
```

## 📊 **Expected Results**

### **Successful Response**

```json
{
  "success": true,
  "message": "Demo notifications triggered successfully",
  "userId": "68682eba0038a0e0b7fd",
  "timestamp": "2024-02-12T10:30:00.000Z"
}
```

### **Error Response (Not Authenticated)**

```json
{
  "error": "User not authenticated"
}
```

### **Error Response (Server Error)**

```json
{
  "error": "Failed to trigger demo notifications",
  "details": "Specific error message"
}
```

## 🔍 **What You Should See**

After triggering the demo, you should see **11 new notifications** in your notification center:

1. **File Upload** - "File 'demo-contract.pdf' (document, 2.0 MB) has been uploaded to the system."
2. **Contract Expiry (Urgent)** - "Contract 'Vendor Agreement' expires on February 15, 2024 (3 days remaining)."
3. **Contract Renewal** - "Contract 'Service Contract' has been renewed until January 15, 2025."
4. **User Invitation** - "User john.doe@company.com has been invited to the system by Admin User."
5. **Audit Due (High)** - "Audit 'Q4 Compliance Audit' is due on March 1, 2024 (15 days remaining)."
6. **Compliance Alert (Urgent)** - "Data Breach: Suspicious activity detected in user accounts"
7. **System Update** - "System Update: Security Patch - Critical security update applied to system"
8. **Performance Metric** - "📈 Performance Metric: Response Time: 2.3s"
9. **Deadline Approaching (High)** - "Task 'Project Review' is due on February 20, 2024 (2 days remaining)."
10. **Task Completed** - "Task 'Document Review' has been completed by Jane Smith."
11. **Information** - "System Maintenance: Scheduled maintenance completed successfully"

## 🎨 **Visual Indicators to Look For**

- **Different background colors** for each notification type
- **Priority badges** (urgent, high, medium, low)
- **Type-specific icons** (📄, ⚠️, 🔄, 👥, etc.)
- **Unread indicators** (blue dots)
- **Action buttons** with relevant links

## 🐛 **Troubleshooting**

### **Common Issues**

1. **"User not authenticated"**

   - Make sure you're logged in
   - Check that your session is valid
   - Try refreshing the page and logging in again

2. **"Failed to trigger demo notifications"**

   - Check the browser console for detailed error messages
   - Verify the notification service is working
   - Check database connectivity

3. **No notifications appear**
   - Check the notification center is properly connected
   - Verify SWR is revalidating data
   - Check browser console for errors

### **Debug Steps**

1. **Check Network Tab**:

   - Open Developer Tools → Network tab
   - Trigger the demo
   - Look for the POST request to `/api/notifications/demo`
   - Check the response status and body

2. **Check Console Logs**:

   - Look for success/error messages
   - Check for any JavaScript errors
   - Verify the notification service logs

3. **Check Database**:
   - Verify notifications are being created in the database
   - Check the notification types collection
   - Ensure user permissions are correct

## 🚀 **Advanced Testing**

### **Test Individual Notification Types**

You can also test individual notification types by calling specific trigger functions:

```javascript
// Test just file upload notifications
fetch('/api/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'YOUR_USER_ID',
    title: 'Test File Upload',
    message: 'This is a test file upload notification',
    type: 'file-uploaded',
    priority: 'low',
  }),
});
```

### **Test Notification Settings**

1. **Go to notification settings**
2. **Toggle different notification types on/off**
3. **Trigger the demo again**
4. **Verify only enabled notifications appear**

### **Test Different Users**

1. **Log in as different users**
2. **Trigger the demo for each user**
3. **Verify notifications are user-specific**
4. **Check notification counts per user**

## 📈 **Performance Testing**

### **Load Testing**

```javascript
// Test multiple rapid requests
const testLoad = async () => {
  const promises = Array(10)
    .fill()
    .map(() => fetch('/api/notifications/demo', { method: 'POST' }));

  const results = await Promise.allSettled(promises);
  console.log('Load test results:', results);
};

testLoad();
```

### **Concurrent User Testing**

1. **Open multiple browser tabs/windows**
2. **Log in as different users**
3. **Trigger demos simultaneously**
4. **Verify no conflicts or race conditions**

## 🎯 **Best Practices**

1. **Test in different browsers** (Chrome, Firefox, Safari, Edge)
2. **Test on mobile devices** for responsive design
3. **Test with different user roles** (admin, manager, user)
4. **Test notification preferences** (enabled/disabled types)
5. **Test error scenarios** (network issues, invalid data)
6. **Test performance** with large numbers of notifications

## 🏆 **Success Criteria**

The demo is working correctly if:

✅ **All 11 notification types appear** in the notification center  
✅ **Notifications have correct priorities** (urgent, high, medium, low)  
✅ **Notifications include proper metadata** (action URLs, context data)  
✅ **Notifications are user-specific** (only for the logged-in user)  
✅ **Notifications can be marked as read/unread**  
✅ **Notifications can be dismissed**  
✅ **No errors appear** in console or network tab  
✅ **Response time is reasonable** (< 2 seconds)

## 🎉 **Next Steps**

Once testing is complete:

1. **Remove demo button** from production code
2. **Keep demo endpoint** for development/testing
3. **Document any issues** found during testing
4. **Plan integration** of real notification triggers
5. **Set up monitoring** for notification system performance

Happy testing! 🚀
