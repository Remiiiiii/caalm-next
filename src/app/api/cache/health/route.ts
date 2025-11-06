import { NextResponse } from 'next/server';
import { getStats, healthCheck } from '@/lib/services/redis-cache';

/**
 * Health check endpoint for Redis cache
 * GET /api/cache/health
 * 
 * Returns:
 * - Cache availability status
 * - Cache type (redis or memory)
 * - Health check results (latency, errors)
 */
export async function GET() {
  try {
    // Get cache statistics
    const stats = await getStats();
    
    // Perform health check
    const health = await healthCheck();
    
    return NextResponse.json({
      success: true,
      cache: {
        available: stats.available,
        type: stats.type,
        provider: stats.provider || 'none',
        healthy: health.healthy,
        latency: health.latency,
        error: health.error,
      },
      message: stats.available
        ? `Redis (${stats.provider || 'unknown'}) is active and ${health.healthy ? 'healthy' : 'unhealthy'}`
        : 'Redis is not configured. Using in-memory cache fallback.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cache health check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

