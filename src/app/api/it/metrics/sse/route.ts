/**
 * IT Metrics SSE Endpoint
 * Server-Sent Events stream for real-time IT metrics
 */

import { NextRequest } from 'next/server';
import { requireITRole } from '@/lib/auth/it-guards';

export async function GET(request: NextRequest) {
  // Verify IT role
  const roleCheck = await requireITRole(request);
  if (roleCheck) return roleCheck;

  // Create SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial data
      const sendMetrics = () => {
        const metrics = {
          apiRequests: {
            total: Math.floor(Math.random() * 100000) + 100000,
            perSecond: Math.floor(Math.random() * 100) + 50,
            errors: Math.floor(Math.random() * 10),
          },
          systemPerformance: {
            cpuUsage: Math.random() * 50 + 20,
            memoryUsage: Math.random() * 40 + 40,
            diskIO: Math.random() * 30 + 10,
            networkTraffic: Math.random() * 100 + 50,
          },
          deployments: {
            total: 12,
            successful: 11,
            failed: 1,
            inProgress: 0,
          },
          incidents: {
            active: 0,
            resolved: 5,
            critical: 0,
          },
          timestamp: new Date().toISOString(),
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(metrics)}\n\n`)
        );
      };

      // Send initial metrics
      sendMetrics();

      // Send updates every 30 seconds
      const interval = setInterval(sendMetrics, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
