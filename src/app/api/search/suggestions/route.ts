import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/appwrite/admin';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'appwrite';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const { databases } = await createAdminClient();

    // Get all contracts and filter client-side to avoid fulltext index requirement
    const allContracts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.contractsCollectionId,
      [
        Query.limit(100), // Get more documents to filter client-side
        Query.select(['contractName', 'vendor', 'contractType', 'department']),
      ]
    );

    // Combine and deduplicate suggestions
    const suggestions = new Set<string>();

    allContracts.documents.forEach((doc) => {
      if (
        doc.contractName &&
        doc.contractName.toLowerCase().includes(query.toLowerCase())
      ) {
        suggestions.add(doc.contractName);
      }
      if (
        doc.vendor &&
        doc.vendor.toLowerCase().includes(query.toLowerCase())
      ) {
        suggestions.add(doc.vendor);
      }
      if (
        doc.contractType &&
        doc.contractType.toLowerCase().includes(query.toLowerCase())
      ) {
        suggestions.add(doc.contractType);
      }
      if (
        doc.department &&
        doc.department.toLowerCase().includes(query.toLowerCase())
      ) {
        suggestions.add(doc.department);
      }
    });

    // Convert to array and sort by relevance
    const suggestionArray = Array.from(suggestions)
      .filter((suggestion) =>
        suggestion.toLowerCase().includes(query.toLowerCase())
      )
      .sort((a, b) => {
        const aLower = a.toLowerCase();
        const bLower = b.toLowerCase();
        const queryLower = query.toLowerCase();

        // Prioritize exact matches and starts-with matches
        if (aLower.startsWith(queryLower) && !bLower.startsWith(queryLower))
          return -1;
        if (!aLower.startsWith(queryLower) && bLower.startsWith(queryLower))
          return 1;

        return a.length - b.length; // Shorter matches first
      })
      .slice(0, limit);

    return NextResponse.json({
      suggestions: suggestionArray,
      query,
      count: suggestionArray.length,
    });
  } catch (error) {
    console.error('Search suggestions error:', error);
    return NextResponse.json(
      { error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}
