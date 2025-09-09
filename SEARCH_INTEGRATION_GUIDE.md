# Advanced Search & Filtering Integration Guide

## 🚀 How to Test and Use the New Search Feature

### 1. **Test Page**

Visit `/test-search` to see the full search functionality in action:

- Full search dashboard with analytics
- Standalone enhanced search component
- Real-time search results display
- Testing instructions and examples

### 2. **Enhanced Contracts Page**

Visit `/my-contracts/enhanced` to see the search integrated into your existing contracts page:

- Toggle search dashboard on/off
- Search results with highlighting
- Maintains existing contract display functionality

### 3. **Integration Options**

#### Option A: Full Search Dashboard

```tsx
import SearchDashboard from '@/components/SearchDashboard';

<SearchDashboard onSearchResults={handleSearchResults} />;
```

#### Option B: Standalone Enhanced Search

```tsx
import EnhancedSearch from '@/components/EnhancedSearch';

<EnhancedSearch
  onResults={handleSearchResults}
  showAnalytics={true}
  initialQuery=""
  initialFilters={{}}
/>;
```

#### Option C: Search Result Highlighting

```tsx
import SearchResultHighlight from '@/components/SearchResultHighlight';

<SearchResultHighlight
  text={contractName}
  query={searchQuery}
  className="font-semibold"
  highlightClassName="bg-yellow-200"
/>;
```

### 4. **Testing the Features**

#### **Basic Search Testing:**

1. Type in the search box to see autocomplete suggestions
2. Try searching for:
   - Contract names: "Service Agreement"
   - Vendors: "Microsoft"
   - Departments: "IT"
   - Contract types: "Purchase Order"
3. Press Enter or click Search to execute
4. Notice the search time displayed after each search

#### **Autocomplete Features:**

- **Recent searches** appear with a clock icon
- **Trending searches** appear with a trending icon
- **API suggestions** from your contract database
- Click on any suggestion to use it

#### **Analytics Dashboard:**

- View search statistics in the analytics section
- Check popular searches and filter usage
- Monitor search performance metrics
- Review recent search activity

#### **Search Results:**

- Results are ranked by relevance score
- Search terms are highlighted in results
- Each result shows search score and metadata
- Results include both contracts and files

### 5. **API Endpoints**

The search feature includes these new API endpoints:

- `GET /api/search` - Enhanced search with better scoring
- `GET /api/search/suggestions` - Autocomplete suggestions
- `POST /api/search/analytics` - Log search analytics
- `GET /api/search/analytics` - Get search analytics
- `GET /api/search/saved` - Get saved searches
- `POST /api/search/saved` - Save a search
- `DELETE /api/search/saved` - Delete a saved search

### 6. **Database Collections Required**

Make sure these collections exist in your Appwrite database:

- `contracts` - Your existing contracts collection
- `files` - Your existing files collection
- `saved_searches` - For saved search functionality
- `search_analytics` - For search analytics tracking

### 7. **Environment Setup**

No additional environment variables are required. The search feature uses your existing Appwrite configuration.

### 8. **Performance Considerations**

- Search results are cached for better performance
- Analytics logging is asynchronous and won't slow down searches
- Autocomplete suggestions are debounced to reduce API calls
- Search scoring algorithm is optimized for relevance

### 9. **Customization Options**

#### **Search Scoring:**

Modify field weights in `src/app/api/search/route.ts`:

```typescript
const fieldWeights = {
  contractName: 15, // Highest priority
  name: 15,
  contractNumber: 12,
  vendor: 10,
  department: 8,
  // ... adjust as needed
};
```

#### **Autocomplete Suggestions:**

Customize suggestion sources in `src/app/api/search/suggestions/route.ts`:

```typescript
// Add more fields to search
Query.search('description', query),
Query.search('contractNumber', query),
```

#### **Analytics Tracking:**

Modify what gets tracked in `src/app/api/search/analytics/route.ts`:

```typescript
// Add custom fields to track
customField: request.headers.get('x-custom-header'),
```

### 10. **Troubleshooting**

#### **Search not returning results:**

1. Check if contracts exist in your database
2. Verify the collection IDs in `appwriteConfig`
3. Check browser console for API errors

#### **Autocomplete not working:**

1. Ensure the suggestions API endpoint is accessible
2. Check if contracts have the fields being searched
3. Verify the search query length (minimum 2 characters)

#### **Analytics not showing:**

1. Check if the `search_analytics` collection exists
2. Verify user authentication
3. Check browser console for analytics API errors

### 11. **Next Steps**

1. **Test the basic functionality** using `/test-search`
2. **Integrate into your main app** using the enhanced contracts page
3. **Customize the search scoring** based on your business needs
4. **Monitor analytics** to understand user search patterns
5. **Add more search fields** as your contract data grows

The Advanced Search & Filtering feature is now fully implemented and ready for production use! 🎉
