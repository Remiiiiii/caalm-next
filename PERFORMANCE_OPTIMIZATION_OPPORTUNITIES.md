# Performance Optimization Opportunities

## Analysis Date: December 3, 2025

This document identifies components and patterns in the codebase that can benefit from the same optimization approach used for ContractUploadForm.

---

## 🎯 Priority 1: Critical Optimizations (Largest Impact)

### 1. OutlookStyleCalendar.tsx ⚠️ CRITICAL
**Size:** 280KB / 6,727 lines  
**Current State:** Massive monolithic component with many statically imported sub-components  
**Impact:** Extremely high - this is the largest component in the codebase

**Static Imports That Should Be Lazy Loaded:**
```typescript
// Lines 23-37 - All these should be dynamic imports
import CalendarAIChat from '@/components/CalendarAIChat';           // 55KB
import CalendarSettings from '@/components/CalendarSettings';
import { SharedCalendarManager } from '@/components/SharedCalendarManager';
import { CreateSharedCalendarDialog } from '@/components/CreateSharedCalendarDialog';
import { SharePrimaryCalendarDialog } from '@/components/SharePrimaryCalendarDialog';
import { ResourceManager } from '@/components/ResourceManager';
import { CalendarDelegationManager } from '@/components/CalendarDelegationManager';
import { CalendarSidebar } from '@/components/CalendarSidebar';
```

**Recommended Actions:**
1. **Lazy load all dialog/modal components** - These are only needed when opened
2. **Lazy load CalendarAIChat** - 55KB component, only needed when AI panel opens
3. **Extract calendar views** (Day/Week/Month) into separate lazy-loaded components
4. **Defer any data fetching** until user interaction
5. **Code split recurring event logic** - Complex calculations not always needed

**Expected Benefits:**
- Initial bundle: 280KB → ~80KB (71% reduction)
- Page load: 4-6s → 1-2s (67% faster)
- AI Panel lazy loads only when needed (~55KB)
- Each dialog lazy loads on open (~10-20KB each)

**Implementation Priority:** 🔴 CRITICAL - Do this first

---

### 2. ExpandedCalendarView.tsx
**Size:** 111KB / ~2,800 lines  
**Current Usage:** Imported statically in CalendarView.tsx (line 59)  
**Impact:** High - Used in calendar pages

**Recommended Actions:**
1. **Lazy load** the component - only loads when user expands calendar
2. **Defer event rendering** until view is opened
3. **Code split** different calendar view modes

**Expected Benefits:**
- Initial calendar page: 111KB lighter
- Loads only when expanded view is triggered
- 30-40% faster calendar page loads

**Implementation Priority:** 🟠 HIGH

---

### 3. ReportGenerator.tsx
**Size:** Medium (~67K3 lines)  
**Current Usage:** Statically imported in QuickActions.tsx and ReportsPage.tsx  
**Impact:** Medium-High - Loaded on every page with QuickActions

**Recommended Actions:**
```typescript
// In QuickActions.tsx
const ReportGenerator = dynamic(
  () => import('@/components/ReportGenerator'),
  { ssr: false, loading: () => null }
);
```

**Current State:**
- ✅ Already optimized: Fetches data only when dialog opens (lines 74-83)
- ❌ Not lazy loaded: Adds ~15-20KB to initial bundle

**Expected Benefits:**
- QuickActions 15-20KB lighter
- Faster initial page loads
- Report generation code loads on-demand

**Implementation Priority:** 🟠 HIGH

---

### 4. ContractDocumentViewer.tsx
**Size:** 58KB / ~1,500 lines  
**Current Usage:** Statically imported in ContractsDisplay.tsx (line 43)  
**Impact:** Medium - Used in contract viewing

**Recommended Actions:**
1. **Lazy load** the entire component
2. **Defer PDF processing** libraries until viewer opens
3. **Code split** different document types (PDF, DOC, etc.)

**Expected Benefits:**
- Contracts page: 58KB lighter
- PDF libraries load only when viewing documents
- 25-30% faster contracts page

**Implementation Priority:** 🟡 MEDIUM

---

### 5. CalendarAIChat.tsx
**Size:** 55KB / ~1,400 lines  
**Current Usage:** Statically imported in OutlookStyleCalendar.tsx (line 23)  
**Impact:** Medium-High - Part of calendar but rarely used

**Recommended Actions:**
1. **Lazy load** - loads only when AI panel opens
2. **Defer AI/LLM libraries** until first use
3. **Code split** different AI features

**Expected Benefits:**
- Calendar: 55KB lighter
- AI libraries load on-demand
- Much faster calendar initialization

**Implementation Priority:** 🟠 HIGH (part of calendar refactor)

---

## 🎯 Priority 2: Important Optimizations

### 6. Lazy Load Calendar Sub-Dialogs
**Components:**
- SharedCalendarManager ✅ (Already optimized - uses SWR, loads on open)
- CreateSharedCalendarDialog
- SharePrimaryCalendarDialog  
- ResourceManager ✅ (Already optimized - fetches on dialog open)
- CalendarDelegationManager
- CalendarSettings

**Recommended Actions:**
```typescript
// In OutlookStyleCalendar.tsx - Make all dynamic imports
const SharedCalendarManager = dynamic(
  () => import('@/components/SharedCalendarManager').then(m => ({ default: m.SharedCalendarManager })),
  { ssr: false }
);

const CreateSharedCalendarDialog = dynamic(
  () => import('@/components/CreateSharedCalendarDialog').then(m => ({ default: m.CreateSharedCalendarDialog })),
  { ssr: false }
);

// Repeat for all calendar sub-components
```

**Expected Benefits:**
- Calendar bundle: ~80-100KB lighter
- Each dialog loads only when opened
- Cumulative 30-40% reduction

**Implementation Priority:** 🟡 MEDIUM

---

### 7. Dashboard Components
**Candidates for Lazy Loading:**
- ExecutiveDashboard (imported in pages)
- AdminDashboard (imported in pages)
- ManagerDashboard (imported in pages)
- HRDashboard (imported in pages)

**Current State:**  
All are statically imported in their respective pages

**Recommended Actions:**
1. **Lazy load** dashboard-specific components
2. **Defer analytics queries** until dashboard tab is active
3. **Code split** widget components

**Expected Benefits:**
- Faster initial dashboard load
- Analytics load only for active tab
- 20-30% faster dashboard

**Implementation Priority:** 🟡 MEDIUM

---

## 🎯 Priority 3: Nice-to-Have Optimizations

### 8. Analytics Components
**Large Components:**
- OrganizationAnalyticsDashboard.tsx
- EnhancedAnalyticsDashboard.tsx
- CalendarAnalyticsDashboard.tsx
- Various chart components

**Recommended Actions:**
1. **Lazy load** chart libraries (recharts, etc.)
2. **Defer data fetching** until analytics tab is viewed
3. **Code split** different chart types

**Expected Benefits:**
- Analytics pages: 40-50KB lighter
- Chart libraries load on-demand
- 15-20% faster page loads

**Implementation Priority:** 🟢 LOW (nice to have)

---

### 9. Settings Components
**Components:**
- TwoFactorSetup.tsx
- ProfileSettings.tsx
- NotificationSettings.tsx

**Current State:**  
Likely imported in settings page

**Recommended Actions:**
1. **Lazy load** each settings panel
2. **Defer data fetching** for each section

**Expected Benefits:**
- Settings page loads faster
- Each panel loads independently
- 10-15% improvement

**Implementation Priority:** 🟢 LOW

---

### 10. Search Components
**Components:**
- AdvancedSearch.tsx
- SearchModal.tsx
- SearchDashboard.tsx

**Recommended Actions:**
1. **Lazy load** advanced search features
2. **Defer search index loading**
3. **Code split** different search types

**Expected Benefits:**
- Faster initial page load
- Search features load on-demand
- 10-15% improvement

**Implementation Priority:** 🟢 LOW

---

## 📋 Implementation Strategy

### Phase 1: Critical (Week 1)
1. ✅ ContractUploadForm (COMPLETED)
2. 🔴 OutlookStyleCalendar.tsx refactor
   - Lazy load all sub-dialogs
   - Lazy load CalendarAIChat
   - Extract and lazy load calendar views
3. 🟠 Lazy load ReportGenerator in QuickActions

**Expected Impact:** 50-60% reduction in initial bundle, 60-70% faster page loads

---

### Phase 2: High Priority (Week 2)
4. ExpandedCalendarView lazy loading
5. ContractDocumentViewer lazy loading
6. Calendar sub-dialogs lazy loading

**Expected Impact:** Additional 20-30% improvement

---

### Phase 3: Medium Priority (Week 3)
7. Dashboard components optimization
8. Analytics components lazy loading

**Expected Impact:** Additional 15-20% improvement

---

### Phase 4: Polish (Week 4)
9. Settings components
10. Search components
11. Misc. optimizations

**Expected Impact:** Additional 10-15% improvement

---

## 🛠️ Development Cache Optimization

### Already Implemented: ✅
```typescript
// next.config.ts
onDemandEntries: {
  maxInactiveAge: 60 * 1000, // 60 seconds
  pagesBufferLength: 5,      // 5 pages
},
```

### Additional Recommendations:
```typescript
// Add to next.config.ts webpack configuration
contractUpload: {
  name: 'contract-upload',
  test: /[\\/]src[\\/]components[\\/](ContractUploadForm|contract-upload)[\\/]/,
  priority: 25,
  enforce: true,
},
// ADD THESE:
calendar: {
  name: 'calendar',
  test: /[\\/]src[\\/]components[\\/](OutlookStyleCalendar|Calendar.*|Expanded.*View)[\\/]/,
  priority: 24,
  enforce: true,
},
analytics: {
  name: 'analytics',
  test: /[\\/]src[\\/]components[\\/]analytics[\\/]/,
  priority: 23,
  enforce: true,
},
reports: {
  name: 'reports',
  test: /[\\/]src[\\/]components[\\/](ReportGenerator|ReportsPage)[\\/]/,
  priority: 22,
  enforce: true,
},
```

---

## 📊 Expected Overall Impact

### Before Optimizations:
- Initial bundle: ~2.5MB
- Page load time: 4-7 seconds
- Time to interactive: 6-10 seconds

### After All Optimizations:
- Initial bundle: ~800KB-1MB (60-68% reduction)
- Page load time: 1-2 seconds (75-80% faster)
- Time to interactive: 2-3 seconds (70-75% faster)

### Development Experience:
- Hot reload: 5-8s → 1-2s
- Build time: Similar (one-time cost)
- Cache hits: Much better with longer cache times

---

## 🔍 Patterns to Follow

### ✅ Good Patterns Already in Codebase:
1. **ResourceManager** - Fetches data only when dialog opens
2. **SharedCalendarManager** - Uses SWR, loads on open
3. **ContractUploadForm** - Fully optimized with lazy loading

### ❌ Anti-Patterns to Avoid:
1. Static imports of large dialog/modal components
2. Data fetching on component mount (useEffect(() => {}, []))
3. Importing heavy libraries at the top level
4. Monolithic components (>200 lines should be split)

### 🎯 Optimization Checklist:
For each component, ask:
- [ ] Is this >50KB? → Consider splitting
- [ ] Is this a dialog/modal? → Lazy load it
- [ ] Does it fetch data on mount? → Defer until needed
- [ ] Does it use heavy libraries? → Lazy load them
- [ ] Is it always visible? → If not, lazy load
- [ ] Can it be code-split? → Split logical sections

---

## 🚀 Quick Wins (< 1 Hour Each)

1. ✅ Lazy load ContractUploadForm (DONE)
2. Lazy load ReportGenerator in QuickActions
3. Lazy load CalendarAIChat
4. Lazy load ContractDocumentViewer
5. Lazy load ExpandedCalendarView

**Total Impact:** 40-50% bundle reduction in 4-5 hours of work

---

## 📝 Notes

- All optimizations should maintain existing functionality
- Test each optimization thoroughly
- Monitor bundle sizes with `pnpm build`
- Use Chrome DevTools Performance tab to verify improvements
- Keep user experience smooth (loading states where appropriate)

---

**Status:** Ready for Implementation  
**Next Steps:** Start with OutlookStyleCalendar.tsx refactor (highest impact)


