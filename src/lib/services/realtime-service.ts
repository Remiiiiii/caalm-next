/**
 * Realtime Service
 * Centralized service for managing Appwrite Realtime subscriptions
 * Handles connection management, automatic reconnection, and error recovery
 */

import { client } from '@/lib/appwrite/client';
import { appwriteConfig } from '@/lib/appwrite/config';
import type { RealtimeResponseEvent } from 'appwrite';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface SubscriptionOptions {
  onUpdate?: (payload: any) => void;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export interface Subscription {
  unsubscribe: () => void;
  channel: string;
}

/**
 * Realtime Service Class
 * Manages all Appwrite Realtime subscriptions with connection pooling and error recovery
 */
class RealtimeService {
  private subscriptions: Map<string, Subscription> = new Map();
  private connectionStatus: ConnectionStatus = 'disconnected';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000; // Start with 1 second
  private reconnectTimer: NodeJS.Timeout | null = null;
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();

  /**
   * Subscribe to a collection for real-time updates
   */
  subscribe(
    collectionId: string,
    options: SubscriptionOptions = {}
  ): Subscription {
    const channel = `databases.${appwriteConfig.databaseId}.collections.${collectionId}.documents`;
    
    // If already subscribed, return existing subscription
    if (this.subscriptions.has(channel)) {
      const existing = this.subscriptions.get(channel)!;
      return existing;
    }

    this.setConnectionStatus('connecting');

    try {
      const unsubscribe = client.subscribe(
        channel,
        (event: RealtimeResponseEvent<Record<string, unknown>>) => {
          this.setConnectionStatus('connected');
          this.reconnectAttempts = 0; // Reset on successful event
          this.reconnectDelay = 1000; // Reset delay

          if (options.onUpdate) {
            try {
              options.onUpdate(event.payload);
            } catch (error) {
              console.error(`[RealtimeService] Error in onUpdate callback for ${channel}:`, error);
              if (options.onError) {
                options.onError(error instanceof Error ? error : new Error(String(error)));
              }
            }
          }
        }
      );

      const subscription: Subscription = {
        unsubscribe: () => {
          try {
            unsubscribe();
            this.subscriptions.delete(channel);
            
            // If no more subscriptions, update status
            if (this.subscriptions.size === 0) {
              this.setConnectionStatus('disconnected');
            }
          } catch (error) {
            console.error(`[RealtimeService] Error unsubscribing from ${channel}:`, error);
          }
        },
        channel,
      };

      this.subscriptions.set(channel, subscription);

      // Call onConnect callback
      if (options.onConnect) {
        setTimeout(() => {
          this.setConnectionStatus('connected');
          options.onConnect?.();
        }, 100);
      }

      return subscription;
    } catch (error) {
      this.setConnectionStatus('error');
      console.error(`[RealtimeService] Error subscribing to ${channel}:`, error);
      
      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error(String(error)));
      }

      // Attempt reconnection
      this.scheduleReconnect(collectionId, options);

      // Return a no-op subscription
      return {
        unsubscribe: () => {},
        channel,
      };
    }
  }

  /**
   * Unsubscribe from a collection
   */
  unsubscribe(collectionId: string): void {
    const channel = `databases.${appwriteConfig.databaseId}.collections.${collectionId}.documents`;
    const subscription = this.subscriptions.get(channel);
    
    if (subscription) {
      subscription.unsubscribe();
    }
  }

  /**
   * Unsubscribe from all collections
   */
  unsubscribeAll(): void {
    this.subscriptions.forEach((subscription) => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.error(`[RealtimeService] Error unsubscribing from ${subscription.channel}:`, error);
      }
    });
    
    this.subscriptions.clear();
    this.setConnectionStatus('disconnected');
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  /**
   * Subscribe to connection status changes
   */
  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * Set connection status and notify listeners
   */
  private setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.statusListeners.forEach((listener) => {
        try {
          listener(status);
        } catch (error) {
          console.error('[RealtimeService] Error in status listener:', error);
        }
      });
    }
  }

  /**
   * Schedule reconnection attempt with exponential backoff
   */
  private scheduleReconnect(
    collectionId: string,
    options: SubscriptionOptions
  ): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        `[RealtimeService] Max reconnection attempts reached for ${collectionId}`
      );
      this.setConnectionStatus('error');
      if (options.onError) {
        options.onError(
          new Error('Max reconnection attempts reached')
        );
      }
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    this.reconnectTimer = setTimeout(() => {
      console.log(
        `[RealtimeService] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} for ${collectionId}`
      );
      
      // Try to resubscribe
      this.subscribe(collectionId, {
        ...options,
        onConnect: () => {
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          options.onConnect?.();
        },
        onError: (error) => {
          this.scheduleReconnect(collectionId, options);
          options.onError?.(error);
        },
      });
    }, delay);
  }

  /**
   * Get all active subscriptions
   */
  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }
}

/**
 * Global Realtime Service instance
 */
export const realtimeService = new RealtimeService();

/**
 * Helper function to subscribe to a collection
 */
export function subscribeToCollection(
  collectionId: string,
  options: SubscriptionOptions = {}
): Subscription {
  return realtimeService.subscribe(collectionId, options);
}

/**
 * Helper function to unsubscribe from a collection
 */
export function unsubscribeFromCollection(collectionId: string): void {
  realtimeService.unsubscribe(collectionId);
}
