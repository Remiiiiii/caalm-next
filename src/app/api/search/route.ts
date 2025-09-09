import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite/admin';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'appwrite';
import { logSearchAnalytics } from '@/lib/actions/search.actions';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const userId = searchParams.get('userId');
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const vendor = searchParams.get('vendor');
    const contractType = searchParams.get('contractType');
    const amountMin = searchParams.get('amountMin');
    const amountMax = searchParams.get('amountMax');
    const sortBy = searchParams.get('sortBy') || '$createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '25');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const { databases } = await createAdminClient();

    // Build search queries
    const queries = [];

    // Note: We'll handle text search client-side to avoid fulltext index requirement

    // Filter by type (contract vs file)
    if (type) {
      const types = type.split(',');
      if (types.length === 1) {
        queries.push(Query.equal('type', types[0]));
      } else {
        queries.push(Query.equal('type', types));
      }
    }

    // Date range filters
    if (startDate) {
      queries.push(Query.greaterThanEqual('$createdAt', startDate));
    }
    if (endDate) {
      queries.push(Query.lessThanEqual('$createdAt', endDate));
    }

    // Contract-specific filters
    if (department) {
      queries.push(Query.equal('department', department));
    }
    if (status) {
      queries.push(Query.equal('status', status));
    }
    if (priority) {
      queries.push(Query.equal('priority', priority));
    }
    if (vendor) {
      queries.push(Query.equal('vendor', vendor));
    }
    if (contractType) {
      queries.push(Query.equal('contractType', contractType));
    }

    // Amount range filters
    if (amountMin) {
      queries.push(Query.greaterThanEqual('amount', parseFloat(amountMin)));
    }
    if (amountMax) {
      queries.push(Query.lessThanEqual('amount', parseFloat(amountMax)));
    }

    // Sorting
    const sortField = sortBy.startsWith('$') ? sortBy : sortBy;
    queries.push(Query.orderDesc(sortField));
    if (sortOrder === 'asc') {
      queries[queries.length - 1] = Query.orderAsc(sortField);
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
    let results = [
      ...contractsResult.documents.map((doc) => ({
        ...doc,
        type: 'contract',
        searchScore: calculateSearchScore(doc, query),
      })),
      ...filesResult.documents.map((doc) => ({
        ...doc,
        type: 'file',
        searchScore: calculateSearchScore(doc, query),
      })),
    ];

    // Client-side text filtering if query is provided
    if (query.trim()) {
      const queryLower = query.toLowerCase();
      results = results.filter((doc: Record<string, unknown>) => {
        const searchableFields = [
          doc.contractName,
          doc.name,
          doc.vendor,
          doc.contractNumber,
          doc.description,
          doc.department,
          doc.contractType,
        ].filter(Boolean);

        return searchableFields.some(
          (field: unknown) =>
            typeof field === 'string' &&
            field.toLowerCase().includes(queryLower)
        );
      });
    }

    // Sort by search score (relevance) if there's a query
    if (query.trim()) {
      results.sort((a, b) => (b.searchScore || 0) - (a.searchScore || 0));
    }

    // Apply pagination
    const totalResults = results.length;
    const paginatedResults = results.slice(offset, offset + limit);

    // Log search analytics (async, don't wait for it) - only if user is provided
    if (userId) {
      logSearchAnalytics({
        userId,
        query,
        filters: {
          type: type ? type.split(',') : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          department: department || undefined,
          status: status || undefined,
          priority: priority || undefined,
          vendor: vendor || undefined,
          contractType: contractType || undefined,
          amountMin: amountMin ? parseFloat(amountMin) : undefined,
          amountMax: amountMax ? parseFloat(amountMax) : undefined,
        },
        resultCount: totalResults,
        searchTime: Date.now() - startTime,
      }).catch((error) => {
        console.error('Failed to log search analytics:', error);
      });
    }

    // Results are already sorted by relevance if there's a query

    // Save search to history - only if user is provided
    if (userId) {
      try {
        await databases.createDocument(
          appwriteConfig.databaseId,
          'search_history',
          'unique()',
          {
            userId,
            query,
            filters: {
              type,
              startDate,
              endDate,
              department,
              status,
              priority,
              vendor,
              contractType,
              amountMin,
              amountMax,
            },
            resultCount: totalResults,
            timestamp: new Date().toISOString(),
          }
        );
      } catch (error) {
        console.error('Failed to save search history:', error);
        // Don't fail the search if history saving fails
      }
    }

    return NextResponse.json({
      results: paginatedResults,
      total: totalResults,
      query,
      filters: {
        type,
        startDate,
        endDate,
        department,
        status,
        priority,
        vendor,
        contractType,
        amountMin,
        amountMax,
      },
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < totalResults,
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

// Enhanced search relevance scoring algorithm
function calculateSearchScore(
  doc: Record<string, unknown>,
  query: string
): number {
  if (!query.trim()) return 0;

  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/);
  let score = 0;

  // Field weights for relevance scoring
  const fieldWeights = {
    contractName: 15,
    name: 15,
    contractNumber: 12,
    vendor: 10,
    department: 8,
    contractType: 8,
    description: 6,
    assignedManagers: 5,
    compliance: 4,
    priority: 3,
  };

  // Calculate field-based scores
  Object.entries(fieldWeights).forEach(([field, weight]) => {
    const fieldValue = doc[field];
    if (!fieldValue) return;

    const fieldLower = fieldValue.toString().toLowerCase();

    // Exact match gets full weight
    if (fieldLower === queryLower) {
      score += weight * 2;
      return;
    }

    // Starts with query gets high weight
    if (fieldLower.startsWith(queryLower)) {
      score += weight * 1.5;
      return;
    }

    // Contains query gets medium weight
    if (fieldLower.includes(queryLower)) {
      score += weight;
      return;
    }

    // Word-based matching for multi-word queries
    if (queryWords.length > 1) {
      const fieldWords = fieldLower.split(/\s+/);
      const matchedWords = queryWords.filter((qWord: string) =>
        fieldWords.some((fWord: string) => fWord.includes(qWord))
      );

      if (matchedWords.length > 0) {
        score += (weight * matchedWords.length) / queryWords.length;
      }
    }
  });

  // Boost score for recent contracts (within last 30 days)
  const createdAt = new Date(doc.$createdAt as string);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (createdAt > thirtyDaysAgo) {
    score *= 1.2;
  }

  // Boost score for high priority contracts
  if (doc.priority === 'High' || doc.priority === 'Critical') {
    score *= 1.1;
  }

  // Boost score for active contracts
  if (doc.status === 'active' || doc.status === 'Active') {
    score *= 1.05;
  }

  // Penalize very old contracts (older than 1 year)
  const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  if (createdAt < oneYearAgo) {
    score *= 0.9;
  }

  return Math.round(score * 100) / 100; // Round to 2 decimal places
}
