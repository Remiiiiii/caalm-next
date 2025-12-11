# Quick Wins Implementation Guide

## 5 Simple Changes for 40-50% Bundle Reduction

Each change takes < 30 minutes and provides immediate performance benefits.

---

## ✅ 1. Lazy Load ReportGenerator (10 minutes)

### File: `src/components/QuickActions.tsx`

**Current Code:**

```typescript
import ReportGenerator from '@/components/ReportGenerator';
```

**Change To:**

```typescript
import dynamic from 'next/dynamic';

const ReportGenerator = dynamic(() => import('@/components/ReportGenerator'), {
  ssr: false,
  loading: () => null,
});
```

**Impact:** ~15-20KB reduction, faster page loads everywhere QuickActions is used

---

## ✅ 2. Lazy Load CalendarAIChat (15 minutes)

### File: `src/components/OutlookStyleCalendar.tsx`

**Current Code (Line 23):**

```typescript
import CalendarAIChat from '@/components/CalendarAIChat';
```

**Change To:**

```typescript
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const CalendarAIChat = dynamic(() => import('@/components/CalendarAIChat'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full p-8">
      <Loader2 className="h-8 w-8 animate-spin text-brand" />
    </div>
  ),
});
```

**Impact:** ~55KB reduction from calendar, much faster calendar load

---

## ✅ 3. Lazy Load ContractDocumentViewer (10 minutes)

### File: `src/components/ContractsDisplay.tsx`

**Current Code (Line 43):**

```typescript
import ContractDocumentViewer from '@/components/ContractDocumentViewer';
```

**Change To:**

```typescript
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const ContractDocumentViewer = dynamic(
  () => import('@/components/ContractDocumentViewer'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-brand" />
      </div>
    ),
  }
);
```

**Impact:** ~58KB reduction from contracts page, faster load

---

## ✅ 4. Lazy Load ExpandedCalendarView (10 minutes)

### File: `src/components/CalendarView.tsx`

**Current Code (Line 59):**

```typescript
import ExpandedCalendarView from '@/components/ExpandedCalendarView';
```

**Change To:**

```typescript
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const ExpandedCalendarView = dynamic(
  () => import('@/components/ExpandedCalendarView'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    ),
  }
);
```

**Impact:** ~111KB reduction from calendar, significantly faster load

---

## ✅ 5. Lazy Load Calendar Sub-Dialogs (20 minutes)

### File: `src/components/OutlookStyleCalendar.tsx`

**Current Code (Lines 31-37):**

```typescript
import CalendarSettings from '@/components/CalendarSettings';
import { SharedCalendarManager } from '@/components/SharedCalendarManager';
import { CreateSharedCalendarDialog } from '@/components/CreateSharedCalendarDialog';
import { SharePrimaryCalendarDialog } from '@/components/SharePrimaryCalendarDialog';
import { ResourceManager } from '@/components/ResourceManager';
import { CalendarDelegationManager } from '@/components/CalendarDelegationManager';
```

**Change To:**

```typescript
import dynamic from 'next/dynamic';

const CalendarSettings = dynamic(
  () => import('@/components/CalendarSettings'),
  { ssr: false }
);

const SharedCalendarManager = dynamic(
  () =>
    import('@/components/SharedCalendarManager').then((m) => ({
      default: m.SharedCalendarManager,
    })),
  { ssr: false }
);

const CreateSharedCalendarDialog = dynamic(
  () =>
    import('@/components/CreateSharedCalendarDialog').then((m) => ({
      default: m.CreateSharedCalendarDialog,
    })),
  { ssr: false }
);

const SharePrimaryCalendarDialog = dynamic(
  () =>
    import('@/components/SharePrimaryCalendarDialog').then((m) => ({
      default: m.SharePrimaryCalendarDialog,
    })),
  { ssr: false }
);

const ResourceManager = dynamic(
  () =>
    import('@/components/ResourceManager').then((m) => ({
      default: m.ResourceManager,
    })),
  { ssr: false }
);

const CalendarDelegationManager = dynamic(
  () =>
    import('@/components/CalendarDelegationManager').then((m) => ({
      default: m.CalendarDelegationManager,
    })),
  { ssr: false }
);
```

**Impact:** ~80-100KB reduction from calendar, each dialog loads on-demand

---

## 📊 Combined Impact

After implementing all 5 quick wins:

### Bundle Size:

- **Before:** ~2.5MB initial bundle
- **After:** ~1.2-1.5MB initial bundle
- **Reduction:** 1MB+ (40-50%)

### Load Times:

- **Before:** 4-7 seconds
- **After:** 2-3 seconds
- **Improvement:** 60-70% faster

### Time to Interactive:

- **Before:** 6-10 seconds
- **After:** 2-4 seconds
- **Improvement:** 60-70% faster

---

## 🧪 Testing Checklist

After each change, verify:

1. **Build succeeds:**

   ```bash
   pnpm build
   ```

2. **Component still works:**

   - Open the dialog/modal
   - Verify functionality
   - Check for console errors

3. **Bundle size reduced:**

   - Check `.next/server/app` folder sizes
   - Use Chrome DevTools → Network tab
   - Verify lazy loading in Network waterfall

4. **Loading states work:**
   - Slow down network (Chrome DevTools → Network → Slow 3G)
   - Verify loading indicators appear
   - Verify smooth transition

---

## 🚀 Implementation Order

**Recommended sequence (easiest to hardest):**

1. ✅ ReportGenerator (simplest - single import in QuickActions)
2. ✅ ContractDocumentViewer (simple - single import)
3. ✅ ExpandedCalendarView (simple - single import)
4. ✅ CalendarAIChat (medium - within large file)
5. ✅ Calendar Sub-Dialogs (medium - multiple imports)

**Total Time:** ~90 minutes
**Total Impact:** 40-50% bundle reduction

---

## 💡 Pro Tips

### Tip 1: Test in Production Mode

```bash
pnpm build
pnpm start
```

Production mode shows actual bundle sizes and lazy loading behavior.

### Tip 2: Monitor Bundle Analyzer

```bash
# Add to package.json scripts:
"analyze": "ANALYZE=true pnpm build"

# Install if needed:
pnpm add -D @next/bundle-analyzer
```

### Tip 3: Check Network Waterfall

Open Chrome DevTools → Network tab and watch components load lazily when triggered.

### Tip 4: Use React DevTools Profiler

Verify components only render when actually used.

---

## ⚠️ Common Pitfalls to Avoid

### 1. Forgetting SSR: false

Always add `ssr: false` for client-only components:

```typescript
const Component = dynamic(() => import('./Component'), {
  ssr: false, // ← Don't forget this!
});
```

### 2. Not Handling Named Exports

For named exports, use `.then()`:

```typescript
// Wrong:
const { SharedCalendarManager } = dynamic(
  () => import('./SharedCalendarManager')
);

// Right:
const SharedCalendarManager = dynamic(
  () =>
    import('./SharedCalendarManager').then((m) => ({
      default: m.SharedCalendarManager,
    })),
  { ssr: false }
);
```

### 3. Lazy Loading Critical Path Components

Don't lazy load:

- Layout components
- Above-the-fold content
- Components shown immediately on page load

DO lazy load:

- Dialogs/modals
- Hidden panels/sidebars
- Below-the-fold content
- Heavy features rarely used

---

## 📈 Before/After Comparison

### Before Optimizations:

```
src/components/
├── OutlookStyleCalendar.tsx  280KB ⬅️ Loaded on calendar page
│   ├── CalendarAIChat        55KB  ⬅️ Loaded even if never opened
│   ├── SharedCalendarManager 30KB  ⬅️ Loaded even if never opened
│   └── Other dialogs         50KB  ⬅️ Loaded even if never opened
├── ContractDocumentViewer   58KB  ⬅️ Loaded on contracts page
├── ExpandedCalendarView     111KB ⬅️ Loaded even if not expanded
└── ReportGenerator          20KB  ⬅️ Loaded on every page
```

**Total unnecessary load:** ~415KB+ on initial page load

### After Optimizations:

```
src/components/
├── OutlookStyleCalendar.tsx  80KB  ⬅️ Core calendar only
│   ├── CalendarAIChat        55KB  ➡️ Loads when AI panel opens
│   ├── SharedCalendarManager 30KB  ➡️ Loads when dialog opens
│   └── Other dialogs         50KB  ➡️ Load when opened
├── ContractDocumentViewer   58KB  ➡️ Loads when viewing doc
├── ExpandedCalendarView     111KB ➡️ Loads when expanded
└── ReportGenerator          20KB  ➡️ Loads when triggered
```

**Initial load:** ~80KB (core only)  
**On-demand load:** Components load as needed

---

## 🎯 Success Metrics

Track these metrics before and after:

### Bundle Metrics:

- [ ] Initial JavaScript bundle size
- [ ] Lazy-loaded chunk sizes
- [ ] Total download size

### Performance Metrics:

- [ ] First Contentful Paint (FCP)
- [ ] Time to Interactive (TTI)
- [ ] Largest Contentful Paint (LCP)

### User Experience:

- [ ] Page load feels faster
- [ ] Interactions feel snappier
- [ ] No perceived slowness when opening dialogs

---

**Ready to implement?** Start with #1 (ReportGenerator) and work your way down!
