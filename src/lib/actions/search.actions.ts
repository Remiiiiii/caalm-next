'use server';

import { createAdminClient } from '@/lib/appwrite/admin';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query, ID } from 'appwrite';

const handleError = (error: unknown, message: string) => {
  console.log(error, message);
  throw error;
};

export interface AdvancedSearchFilters {
  type?: string[];
  startDate?: string;
  endDate?: string;
  department?: string;
  status?: string;
  priority?: string;
  vendor?: string;
  contractType?: string;
  amountMin?: number;
  amountMax?: number;
  assignedManagers?: string[];
  compliance?: string[];
  expiryDateStart?: string;
  expiryDateEnd?: string;
}

export interface SearchResult {
  id: string;
  type: 'contract' | 'file' | 'department' | 'vendor';
  name: string;
  contractName?: string;
  vendor?: string;
  department?: string;
  status?: string;
  priority?: string;
  amount?: number;
  contractExpiryDate?: string;
  assignedManagers?: string[];
  contractType?: string;
  $createdAt: string;
  $updatedAt: string;
  searchScore: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  query: string;
  filters: AdvancedSearchFilters;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// Quick search functions for different search types
export const performQuickSearch = async ({
  searchType,
  userId,
  userRole,
  userDepartment,
  limit = 25,
  offset = 0,
}: {
  searchType: 'all-contracts' | 'departments' | 'vendors' | 'active';
  userId: string;
  userRole?: string;
  userDepartment?: string;
  limit?: number;
  offset?: number;
}): Promise<SearchResponse> => {
  const { databases } = await createAdminClient();

  try {
    let queries = [];
    let results: SearchResult[] = [];

    switch (searchType) {
      case 'all-contracts':
        // List all contracts in user's department, or all departments for Admin/Executive
        if (
          userRole !== 'admin' &&
          userRole !== 'executive' &&
          userDepartment
        ) {
          // Only apply department filter for non-admin/executive users
          queries.push(Query.equal('department', userDepartment));
        }
        // For admin/executive, no department filter - show all contracts
        queries.push(Query.limit(200));

        const contractsResult = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.contractsCollectionId,
          queries
        );

        results = contractsResult.documents.map((doc) => ({
          id: doc.$id,
          type: 'contract' as const,
          name: doc.contractName || doc.name || 'Untitled Contract',
          contractName: doc.contractName,
          vendor: doc.vendor,
          department: doc.department,
          status: doc.status,
          priority: doc.priority,
          amount: doc.amount,
          contractExpiryDate: doc.contractExpiryDate,
          assignedManagers: doc.assignedManagers,
          $createdAt: doc.$createdAt,
          $updatedAt: doc.$updatedAt,
          searchScore: 100, // High score for quick search results
        }));
        break;

      case 'departments':
        // List all departments that have contracts
        const allContractsResult = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.contractsCollectionId,
          [Query.limit(200)]
        );

        // Group by department and create department entries
        const departmentMap = new Map();
        allContractsResult.documents.forEach((doc) => {
          if (doc.department) {
            if (!departmentMap.has(doc.department)) {
              departmentMap.set(doc.department, {
                id: `dept-${doc.department}`,
                type: 'department' as const,
                name: doc.department,
                department: doc.department,
                contractType: 'Department',
                $createdAt: doc.$createdAt,
                $updatedAt: doc.$updatedAt,
                searchScore: 100,
              });
            }
          }
        });

        results = Array.from(departmentMap.values());
        break;

      case 'vendors':
        // List all vendors
        const vendorContractsResult = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.contractsCollectionId,
          [Query.limit(200)]
        );

        // Group by vendor and create vendor entries
        const vendorMap = new Map();
        vendorContractsResult.documents.forEach((doc) => {
          if (doc.vendor) {
            if (!vendorMap.has(doc.vendor)) {
              vendorMap.set(doc.vendor, {
                id: `vendor-${doc.vendor}`,
                type: 'vendor' as const,
                name: doc.vendor,
                vendor: doc.vendor,
                department: doc.department,
                contractType: 'Vendor',
                $createdAt: doc.$createdAt,
                $updatedAt: doc.$updatedAt,
                searchScore: 100,
              });
            }
          }
        });

        results = Array.from(vendorMap.values());
        break;

      case 'active':
        // List all active contracts
        queries.push(Query.equal('status', 'active'));
        queries.push(Query.limit(200));

        const activeContractsResult = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.contractsCollectionId,
          queries
        );

        results = activeContractsResult.documents.map((doc) => ({
          id: doc.$id,
          type: 'contract' as const,
          name: doc.contractName || doc.name || 'Untitled Contract',
          contractName: doc.contractName,
          vendor: doc.vendor,
          department: doc.department,
          status: doc.status,
          priority: doc.priority,
          amount: doc.amount,
          contractExpiryDate: doc.contractExpiryDate,
          assignedManagers: doc.assignedManagers,
          $createdAt: doc.$createdAt,
          $updatedAt: doc.$updatedAt,
          searchScore: 100,
        }));
        break;
    }

    // Apply pagination
    const total = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    return {
      results: paginatedResults,
      total,
      query: searchType,
      filters: {},
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  } catch (error) {
    handleError(error, 'Failed to perform quick search');
    throw error;
  }
};

export const performAdvancedSearch = async ({
  query,
  userId,
  filters = {},
  sortBy = '$createdAt',
  sortOrder = 'desc',
  limit = 25,
  offset = 0,
}: {
  query: string;
  userId: string;
  filters?: AdvancedSearchFilters;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}): Promise<SearchResponse> => {
  console.log('performAdvancedSearch called with:', {
    query,
    userId,
    filters,
    limit,
    offset,
  });

  const { databases } = await createAdminClient();

  try {
    // Build search queries
    const queries = [];

    // Note: We'll handle text search client-side to avoid fulltext index requirement

    // Apply filters
    if (filters.type?.length) {
      queries.push(Query.equal('type', filters.type));
    }

    if (filters.startDate) {
      queries.push(Query.greaterThanEqual('$createdAt', filters.startDate));
    }

    if (filters.endDate) {
      queries.push(Query.lessThanEqual('$createdAt', filters.endDate));
    }

    if (filters.department) {
      queries.push(Query.equal('department', filters.department));
    }

    if (filters.status) {
      queries.push(Query.equal('status', filters.status));
    }

    if (filters.priority) {
      queries.push(Query.equal('priority', filters.priority));
    }

    if (filters.vendor) {
      queries.push(Query.equal('vendor', filters.vendor));
    }

    if (filters.contractType) {
      queries.push(Query.equal('contractType', filters.contractType));
    }

    if (filters.amountMin !== undefined) {
      queries.push(Query.greaterThanEqual('amount', filters.amountMin));
    }

    if (filters.amountMax !== undefined) {
      queries.push(Query.lessThanEqual('amount', filters.amountMax));
    }

    if (filters.assignedManagers?.length) {
      queries.push(Query.equal('assignedManagers', filters.assignedManagers));
    }

    if (filters.compliance?.length) {
      queries.push(Query.equal('compliance', filters.compliance));
    }

    if (filters.expiryDateStart) {
      queries.push(
        Query.greaterThanEqual('contractExpiryDate', filters.expiryDateStart)
      );
    }

    if (filters.expiryDateEnd) {
      queries.push(
        Query.lessThanEqual('contractExpiryDate', filters.expiryDateEnd)
      );
    }

    // Sorting
    const sortField = sortBy.startsWith('$') ? sortBy : sortBy;
    if (sortOrder === 'asc') {
      queries.push(Query.orderAsc(sortField));
    } else {
      queries.push(Query.orderDesc(sortField));
    }

    // Get more documents to filter client-side (remove pagination for now)
    const searchQueries = [...queries];
    searchQueries.push(Query.limit(200)); // Get more documents for client-side filtering

    // Search in contracts collection
    const contractsResult = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.contractsCollectionId,
      searchQueries
    );

    // Search in files collection
    const filesResult = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.filesCollectionId,
      searchQueries
    );

    // Combine and format results with client-side text filtering
    let results: SearchResult[] = [
      ...contractsResult.documents.map((doc) => ({
        id: doc.$id,
        type: 'contract' as const,
        name: doc.contractName || doc.name || 'Untitled Contract',
        contractName: doc.contractName,
        vendor: doc.vendor,
        department: doc.department,
        status: doc.status,
        priority: doc.priority,
        amount: doc.amount,
        contractExpiryDate: doc.contractExpiryDate,
        assignedManagers: doc.assignedManagers,
        $createdAt: doc.$createdAt,
        $updatedAt: doc.$updatedAt,
        searchScore: calculateSearchScore(doc, query),
      })),
      ...filesResult.documents.map((doc) => ({
        id: doc.$id,
        type: 'file' as const,
        name: doc.name || 'Untitled File',
        contractName: doc.contractName,
        vendor: doc.vendor,
        department: doc.department,
        status: doc.status,
        priority: doc.priority,
        amount: doc.amount,
        contractExpiryDate: doc.contractExpiryDate,
        assignedManagers: doc.assignedManagers,
        $createdAt: doc.$createdAt,
        $updatedAt: doc.$updatedAt,
        searchScore: calculateSearchScore(doc, query),
      })),
    ];

    // Client-side text filtering if query is provided
    if (query.trim()) {
      const queryLower = query.toLowerCase();
      results = results.filter((doc) => {
        const searchableFields = [
          doc.contractName,
          doc.name,
          doc.contractNumber,
          doc.vendor,
          doc.contractType,
          doc.department,
          doc.status,
          doc.priority,
          doc.assignedManagers,
          doc.compliance,
          doc.amount?.toString(),
          doc.contractExpiryDate,
        ].filter(Boolean);

        return searchableFields.some((field) => {
          if (Array.isArray(field)) {
            return field.some(
              (item) =>
                typeof item === 'string' &&
                item.toLowerCase().includes(queryLower)
            );
          }
          return (
            typeof field === 'string' &&
            field.toLowerCase().includes(queryLower)
          );
        });
      });
    }

    // Sort by search score and then by specified sort field
    results.sort((a, b) => {
      if (a.searchScore !== b.searchScore) {
        return b.searchScore - a.searchScore;
      }
      return (
        new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime()
      );
    });

    // Apply pagination
    const totalResults = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    // Save search to history
    try {
      await databases.createDocument(
        appwriteConfig.databaseId,
        'search_history',
        ID.unique(),
        {
          userId,
          query,
          filters,
          resultCount: totalResults,
          timestamp: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error('Failed to save search history:', error);
      // Don't fail the search if history saving fails
    }

    const response = {
      results: paginatedResults,
      total: totalResults,
      query,
      filters,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < totalResults,
      },
    };

    console.log('performAdvancedSearch returning:', {
      resultCount: paginatedResults.length,
      totalResults,
      query,
    });

    return response;
  } catch (error) {
    handleError(error, 'Advanced search failed');
    throw error;
  }
};

export const getSearchSuggestions = async (
  query: string
): Promise<string[]> => {
  const { databases } = await createAdminClient();

  try {
    if (!query || query.length < 2) {
      return [];
    }

    const suggestions = new Set<string>();

    // Get contract name suggestions using contains instead of search
    try {
      const contractsResult = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.contractsCollectionId,
        [Query.limit(50)] // Get more documents to filter client-side
      );

      contractsResult.documents.forEach((contract) => {
        if (
          contract.contractName &&
          contract.contractName.toLowerCase().includes(query.toLowerCase())
        ) {
          suggestions.add(contract.contractName);
        }
        if (
          contract.vendor &&
          contract.vendor.toLowerCase().includes(query.toLowerCase())
        ) {
          suggestions.add(contract.vendor);
        }
        if (
          contract.contractNumber &&
          contract.contractNumber.toLowerCase().includes(query.toLowerCase())
        ) {
          suggestions.add(contract.contractNumber);
        }
      });
    } catch (error) {
      console.error('Error fetching contract suggestions:', error);
    }

    // Get file name suggestions using contains instead of search
    try {
      const filesResult = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.filesCollectionId,
        [Query.limit(50)] // Get more documents to filter client-side
      );

      filesResult.documents.forEach((file) => {
        if (
          file.name &&
          file.name.toLowerCase().includes(query.toLowerCase())
        ) {
          suggestions.add(file.name);
        }
      });
    } catch (error) {
      console.error('Error fetching file suggestions:', error);
    }

    // Convert to array and sort by relevance
    return Array.from(suggestions)
      .sort((a, b) => {
        // Prioritize exact matches, then starts-with matches, then contains
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const queryLower = query.toLowerCase();

        if (aLower === queryLower) return -1;
        if (bLower === queryLower) return 1;
        if (aLower.startsWith(queryLower)) return -1;
        if (bLower.startsWith(queryLower)) return 1;
        return a.length - b.length; // Shorter matches first
      })
      .slice(0, 10);
  } catch (error) {
    handleError(error, 'Failed to fetch search suggestions');
    return [];
  }
};

export const getRecentSearches = async (
  userId: string,
  limit: number = 10
): Promise<{ query: string; timestamp: string; resultCount: number }[]> => {
  const { databases } = await createAdminClient();

  try {
    const recentSearches = await databases.listDocuments(
      appwriteConfig.databaseId,
      'search_history',
      [
        Query.equal('userId', userId),
        Query.orderDesc('timestamp'),
        Query.limit(limit),
      ]
    );

    // Extract unique queries from recent searches
    const uniqueQueries = new Map();
    recentSearches.documents.forEach((search) => {
      if (!uniqueQueries.has(search.query)) {
        uniqueQueries.set(search.query, {
          query: search.query,
          timestamp: search.timestamp,
          resultCount: search.resultCount,
        });
      }
    });

    return Array.from(uniqueQueries.values());
  } catch (error) {
    handleError(error, 'Failed to fetch recent searches');
    return [];
  }
};

export const saveSearch = async ({
  userId,
  name,
  query,
  filters,
}: {
  userId: string;
  name: string;
  query: string;
  filters?: AdvancedSearchFilters;
}): Promise<{
  $id: string;
  name: string;
  query: string;
  filters: AdvancedSearchFilters;
  createdAt: string;
}> => {
  const { databases } = await createAdminClient();

  try {
    // Check if a saved search with the same name already exists
    const existingSearches = await databases.listDocuments(
      appwriteConfig.databaseId,
      'saved_searches',
      [Query.equal('userId', userId), Query.equal('name', name)]
    );

    if (existingSearches.documents.length > 0) {
      throw new Error('A saved search with this name already exists');
    }

    // Create new saved search
    const savedSearch = await databases.createDocument(
      appwriteConfig.databaseId,
      'saved_searches',
      ID.unique(),
      {
        userId,
        name,
        query,
        filters: filters || {},
        createdAt: new Date().toISOString(),
      }
    );

    return savedSearch as unknown as {
      $id: string;
      name: string;
      query: string;
      filters: AdvancedSearchFilters;
      createdAt: string;
    };
  } catch (error) {
    handleError(error, 'Failed to save search');
    throw error;
  }
};

export const getSavedSearches = async (
  userId: string
): Promise<
  {
    $id: string;
    name: string;
    query: string;
    filters: AdvancedSearchFilters;
    createdAt: string;
  }[]
> => {
  const { databases } = await createAdminClient();

  try {
    const savedSearches = await databases.listDocuments(
      appwriteConfig.databaseId,
      'saved_searches',
      [Query.equal('userId', userId), Query.orderDesc('$createdAt')]
    );

    return savedSearches.documents as unknown as {
      $id: string;
      name: string;
      query: string;
      filters: AdvancedSearchFilters;
      createdAt: string;
    }[];
  } catch (error) {
    handleError(error, 'Failed to fetch saved searches');
    return [];
  }
};

export const deleteSavedSearch = async (
  searchId: string,
  userId: string
): Promise<void> => {
  const { databases } = await createAdminClient();

  try {
    // Verify the search belongs to the user
    const search = await databases.getDocument(
      appwriteConfig.databaseId,
      'saved_searches',
      searchId
    );

    if (search.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Delete the saved search
    await databases.deleteDocument(
      appwriteConfig.databaseId,
      'saved_searches',
      searchId
    );
  } catch (error) {
    handleError(error, 'Failed to delete saved search');
    throw error;
  }
};

// Calculate search relevance score
function calculateSearchScore(
  doc: Record<string, unknown>,
  query: string
): number {
  const queryLower = query.toLowerCase();
  let score = 0;

  // Exact matches get highest score
  if (
    typeof doc.contractName === 'string' &&
    doc.contractName.toLowerCase().includes(queryLower)
  )
    score += 10;
  if (
    typeof doc.name === 'string' &&
    doc.name.toLowerCase().includes(queryLower)
  )
    score += 10;
  if (
    typeof doc.vendor === 'string' &&
    doc.vendor.toLowerCase().includes(queryLower)
  )
    score += 8;
  if (
    typeof doc.contractNumber === 'string' &&
    doc.contractNumber.toLowerCase().includes(queryLower)
  )
    score += 8;
  if (
    typeof doc.description === 'string' &&
    doc.description.toLowerCase().includes(queryLower)
  )
    score += 5;

  // Partial matches get lower score
  const fields = [
    doc.contractName,
    doc.name,
    doc.vendor,
    doc.description,
  ].filter((field): field is string => typeof field === 'string');

  fields.forEach((field) => {
    if (field.toLowerCase().includes(queryLower)) {
      score += 2;
    }
  });

  return score;
}

// Log search analytics
export const logSearchAnalytics = async ({
  userId,
  query,
  filters,
  resultCount,
  searchTime,
}: {
  userId: string;
  query: string;
  filters?: AdvancedSearchFilters;
  resultCount?: number;
  searchTime?: number;
}): Promise<void> => {
  try {
    await fetch('/api/search/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        query,
        filters,
        resultCount,
        searchTime,
      }),
    });
  } catch (error) {
    console.error('Failed to log search analytics:', error);
    // Don't throw error as this shouldn't break the search flow
  }
};

// Get search analytics
export const getSearchAnalytics = async (
  userId: string,
  days = 30
): Promise<{
  analytics: {
    totalSearches: number;
    averageSearchTime: number;
    topSearches: { query: string; count: number }[];
    topFilters: { filter: string; count: number }[];
    recentSearches: {
      query: string;
      filters: AdvancedSearchFilters;
      resultCount: number;
      searchTime: number;
      timestamp: string;
    }[];
  };
} | null> => {
  try {
    const response = await fetch(
      `/api/search/analytics?userId=${userId}&days=${days}`
    );
    if (!response.ok) {
      throw new Error('Failed to get analytics');
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to get search analytics:', error);
    return null;
  }
};
