import { NextRequest, NextResponse } from 'next/server';
import { getRecentActivities } from '@/lib/actions/recentActivity.actions';

interface RecentActivity {
  $id: string;
  action: string;
  description: string;
  userId?: string;
  userName?: string;
  contractId?: string;
  contractName?: string;
  eventId?: string;
  eventTitle?: string;
  department?: string;
  timestamp: string;
  type: 'contract' | 'user' | 'event' | 'notification' | 'file';
}

interface StreamData {
  type: 'initial' | 'update' | 'error';
  activities?: RecentActivity[];
  message?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '15');

  // Set up SSE headers
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendData = (data: StreamData) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const sendHeartbeat = () => {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`));
      };

      // Send initial data
      try {
        const activities = await getRecentActivities(limit);
        sendData({ type: 'initial', activities });
      } catch (error) {
        console.error('Error fetching initial activities:', error);
        sendData({ type: 'error', message: 'Failed to fetch activities' });
      }

      // Set up polling for updates
      const interval = setInterval(async () => {
        try {
          const activities = await getRecentActivities(limit);
          sendData({ type: 'update', activities });
        } catch (error) {
          console.error('Error fetching activities:', error);
        }
      }, 5000); // Check every 5 seconds

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        sendHeartbeat();
      }, 30000);

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        clearInterval(heartbeatInterval);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}
