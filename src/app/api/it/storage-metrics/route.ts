import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import CacheManager from '@/lib/services/cache-manager';
import { CACHE_KEYS } from '@/lib/services/cache-keys';

/**
 * Calculate directory size recursively
 */
async function getDirectorySize(dirPath: string): Promise<number> {
  try {
    if (!existsSync(dirPath)) {
      return 0;
    }

    const stats = await stat(dirPath);
    if (!stats.isDirectory()) {
      return stats.size;
    }

    const entries = await readdir(dirPath, { withFileTypes: true });
    let totalSize = 0;

    for (const entry of entries) {
      const fullPath = join(dirPath, entry.name);
      
      // Skip common ignored directories
      if (entry.name.startsWith('.') && entry.name !== '.next') {
        continue;
      }

      try {
        if (entry.isDirectory()) {
          totalSize += await getDirectorySize(fullPath);
        } else {
          const fileStats = await stat(fullPath);
          totalSize += fileStats.size;
        }
      } catch (error) {
        // Skip files/directories we can't access
        continue;
      }
    }

    return totalSize;
  } catch (error) {
    return 0;
  }
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number): { size: number; unit: string } {
  if (bytes === 0) return { size: 0, unit: 'B' };
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return {
    size: parseFloat((bytes / Math.pow(k, i)).toFixed(2)),
    unit: sizes[i],
  };
}

export async function GET(request: NextRequest) {
  try {
    // Cache key for IT storage metrics
    const cacheKey = CACHE_KEYS.it.storageMetrics();

    // Fetch storage metrics with caching (5 minutes TTL)
    const metrics = await CacheManager.withCache(
      'it/storage-metrics',
      cacheKey,
      async () => {
        const projectRoot = process.cwd();

        // Calculate sizes for different components
        const sourceCodeSize = await getDirectorySize(join(projectRoot, 'src'));
        const testsSize = await getDirectorySize(join(projectRoot, 'tests'));
        const publicAssetsSize = await getDirectorySize(join(projectRoot, 'public'));
        const nodeModulesSize = await getDirectorySize(join(projectRoot, 'node_modules'));
        const buildArtifactsSize = await getDirectorySize(join(projectRoot, '.next'));
    
    // Get lock file size
    let lockFileSize = 0;
    try {
      const lockFileStats = await stat(join(projectRoot, 'pnpm-lock.yaml'));
      lockFileSize = lockFileStats.size;
    } catch {
      // Lock file might not exist
    }

    // Calculate total (excluding node_modules and .next for source code total)
    const sourceCodeTotal = sourceCodeSize + testsSize + publicAssetsSize + lockFileSize;
    const totalWithDeps = sourceCodeTotal + nodeModulesSize;
    const totalComplete = totalWithDeps + buildArtifactsSize;

    // Format sizes
    const sourceCode = formatBytes(sourceCodeTotal);
    const dependencies = formatBytes(nodeModulesSize);
    const buildArtifacts = formatBytes(buildArtifactsSize);
    const publicAssets = formatBytes(publicAssetsSize);
    const lockFile = formatBytes(lockFileSize);
    const total = formatBytes(totalComplete);

    // Platform breakdown (estimated differences)
    // Windows typically has larger node_modules due to .exe files
    // Linux is usually smaller
    // macOS is in between
    const platformBreakdown = [
      {
        platform: 'Windows',
        nodeModules: Math.round(nodeModulesSize / 1024 / 1024 * 1.1), // ~10% larger
        buildArtifacts: Math.round(buildArtifactsSize / 1024 / 1024 * 1.08),
        total: Math.round(totalComplete / 1024 / 1024 * 1.09),
      },
      {
        platform: 'Linux',
        nodeModules: Math.round(nodeModulesSize / 1024 / 1024 * 0.91), // ~9% smaller
        buildArtifacts: Math.round(buildArtifactsSize / 1024 / 1024 * 0.92),
        total: Math.round(totalComplete / 1024 / 1024 * 0.91),
      },
      {
        platform: 'macOS',
        nodeModules: Math.round(nodeModulesSize / 1024 / 1024), // Baseline
        buildArtifacts: Math.round(buildArtifactsSize / 1024 / 1024),
        total: Math.round(totalComplete / 1024 / 1024),
      },
    ];

    // Component breakdown
    const componentBreakdown = [
      {
        name: 'node_modules',
        size: Math.round(nodeModulesSize / 1024 / 1024),
        percentage: Math.round((nodeModulesSize / totalComplete) * 100),
      },
      {
        name: '.next',
        size: Math.round(buildArtifactsSize / 1024 / 1024),
        percentage: Math.round((buildArtifactsSize / totalComplete) * 100),
      },
      {
        name: 'src/',
        size: Math.round(sourceCodeSize / 1024 / 1024 * 10) / 10,
        percentage: Math.round((sourceCodeSize / totalComplete) * 100 * 10) / 10,
      },
      {
        name: 'public/',
        size: Math.round(publicAssetsSize / 1024 / 1024 * 10) / 10,
        percentage: Math.round((publicAssetsSize / totalComplete) * 100 * 10) / 10,
      },
      {
        name: 'tests/',
        size: Math.round(testsSize / 1024 / 1024 * 10) / 10,
        percentage: Math.round((testsSize / totalComplete) * 100 * 10) / 10,
      },
      {
        name: 'Other',
        size: Math.round((lockFileSize + (totalComplete - sourceCodeTotal - nodeModulesSize - buildArtifactsSize)) / 1024 / 1024 * 10) / 10,
        percentage: Math.round(((lockFileSize + (totalComplete - sourceCodeTotal - nodeModulesSize - buildArtifactsSize)) / totalComplete) * 100 * 10) / 10,
      },
    ].filter(item => item.size > 0);

        return {
          sourceCode,
          dependencies,
          buildArtifacts,
          publicAssets,
          lockFile,
          total,
          platformBreakdown,
          componentBreakdown,
        };
      }
    );

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error calculating storage metrics:', error);
    return NextResponse.json(
      { error: 'Failed to calculate storage metrics' },
      { status: 500 }
    );
  }
}
