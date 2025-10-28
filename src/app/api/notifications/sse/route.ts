/**
 * Server-Sent Events (SSE) endpoint for real-time notifications
 * Provides persistent connection for real-time notification updates
 */

import { NextRequest } from 'next/server';
import { getCurrentUserId } from '@/lib/microsoft/auth-utils';
import { createAdminClient } from '@/lib/appwrite';
import { appwriteConfig } from '@/lib/appwrite/config';
import { Query } from 'node-appwrite';

/**
 * Create a text encoder for SSE
 */
const encoder = new TextEncoder();

/**
 * Format SSE message
 */
function formatSSE(id: number, event: string, data: any): string {
  return `id: ${id}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Keep track of active connections
 */
const activeConnections = new Map<
  string,
  {
    controller: ReadableStreamDefaultController;
    userId: string;
    lastEventId: number;
  }
>();

/**
 * Broadcast notification to a specific user
 */
export async function broadcastToUser(userId: string, notification: any) {
  for (const [connectionId, connection] of activeConnections.entries()) {
    if (connection.userId === userId) {
      try {
        connection.lastEventId++;
        const message = formatSSE(
          connection.lastEventId,
          'notification',
          notification
        );
        connection.controller.enqueue(encoder.encode(message));
      } catch (error) {
        console.error(
          `Error sending message to connection ${connectionId}:`,
          error
        );
        activeConnections.delete(connectionId);
      }
    }
  }
}

/**
 * Broadcast to all connected users
 */
export async function broadcastToAll(notification: any) {
  for (const [connectionId, connection] of activeConnections.entries()) {
    try {
      connection.lastEventId++;
      const message = formatSSE(
        connection.lastEventId,
        'notification',
        notification
      );
      connection.controller.enqueue(encoder.encode(message));
    } catch (error) {
      console.error(`Error broadcasting to connection ${connectionId}:`, error);
      activeConnections.delete(connectionId);
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const userId = await getCurrentUserId();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Create a unique connection ID
    const connectionId = `${userId}-${Date.now()}`;

    console.log(`New SSE connection: ${connectionId} for user: ${userId}`);

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      start(controller) {
        // Store the connection
        activeConnections.set(connectionId, {
          controller,
          userId,
          lastEventId: 0,
        });

        // Send initial ping to establish connection
        controller.enqueue(
          encoder.encode('event: connected\ndata: {"message":"connected"}\n\n')
        );

        // Send a heartbeat every 30 seconds to keep connection alive
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(
              encoder.encode(
                'event: heartbeat\ndata: {"timestamp":"' + Date.now() + '"}\n\n'
              )
            );
          } catch (error) {
            clearInterval(heartbeatInterval);
            activeConnections.delete(connectionId);
          }
        }, 30000);

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          console.log(`SSE connection closed: ${connectionId}`);
          clearInterval(heartbeatInterval);
          activeConnections.delete(connectionId);
        });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  } catch (error) {
    console.error('SSE endpoint error:', error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to establish SSE connection',
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
}

/**
 * Cleanup on server shutdown
 */
process.on('SIGTERM', () => {
  console.log('Cleaning up SSE connections...');
  for (const [connectionId] of activeConnections.entries()) {
    activeConnections.delete(connectionId);
  }
});
