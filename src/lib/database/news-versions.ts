'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';

export interface NewsVersion {
  $id: string;
  newsId: string;
  content: string;
  modifiedBy: string;
  modifiedAt: string;
  changeDescription?: string;
  orgId?: string;
  $createdAt: string;
}

export interface CreateNewsVersionParams {
  newsId: string;
  content: string;
  modifiedBy: string;
  changeDescription?: string;
  orgId?: string;
}

/**
 * Create a version entry for a news article
 */
export async function createNewsVersion(
  params: CreateNewsVersionParams
): Promise<NewsVersion> {
  try {
    const { tablesDB } = await createAdminClient();

    const versionData = {
      newsId: params.newsId,
      content: params.content,
      modifiedBy: params.modifiedBy,
      modifiedAt: new Date().toISOString(),
      changeDescription: params.changeDescription || '',
      orgId: params.orgId || '',
    };

    const version = await tablesDB.createRow({
      databaseId: appwriteConfig.databaseId!,
      tableId: appwriteConfig.newsVersionsCollectionId!,
      rowId: ID.unique(),
      data: versionData,
    });

    return version as NewsVersion;
  } catch (error) {
    console.error('Error creating news version:', error);
    throw error;
  }
}

/**
 * Get all versions for a news article
 */
export async function getNewsVersions(
  newsId: string
): Promise<NewsVersion[]> {
  try {
    const { tablesDB } = await createAdminClient();

    const response = await tablesDB.listRows({
      databaseId: appwriteConfig.databaseId!,
      tableId: appwriteConfig.newsVersionsCollectionId!,
      queries: [
        Query.equal('newsId', newsId),
        Query.orderDesc('$createdAt'),
        Query.limit(50), // Limit to last 50 versions
      ],
    });

    return response.rows as NewsVersion[];
  } catch (error) {
    console.error('Error fetching news versions:', error);
    throw error;
  }
}

/**
 * Get a specific version by ID
 */
export async function getNewsVersion(id: string): Promise<NewsVersion | null> {
  try {
    const { tablesDB } = await createAdminClient();

    const version = await tablesDB.getRow({
      databaseId: appwriteConfig.databaseId!,
      tableId: appwriteConfig.newsVersionsCollectionId!,
      rowId: id,
    });

    return version as NewsVersion;
  } catch (error: any) {
    if (error.code === 404) {
      return null;
    }
    console.error('Error fetching news version:', error);
    throw error;
  }
}
