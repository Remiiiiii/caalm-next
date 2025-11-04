import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Custom hook to enable automatic calendar sync with Outlook
 * Polls the auto-sync endpoint every 30 seconds for near-instant updates
 */
export function useAutoSync(userId: string | undefined, enabled: boolean = true) {
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);
  const isSyncingRef = useRef<boolean>(false);
  const hasInitialSyncedRef = useRef<boolean>(false);
  const consecutiveErrorsRef = useRef<number>(0);
  const lastErrorTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!userId || !enabled) {
      // Clear interval if disabled or no user
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Function to perform auto-sync
    const performAutoSync = async () => {
      const now = Date.now();
      const timeSinceLastSync = now - lastSyncRef.current;
      
      // If we had recent connection errors, increase delay to avoid spamming
      const errorBackoffDelay = consecutiveErrorsRef.current > 0 
        ? Math.min(60000 * Math.pow(2, consecutiveErrorsRef.current - 1), 5 * 60 * 1000) // Exponential backoff up to 5 min
        : 20000; // Normal 20 second minimum
      
      if (timeSinceLastSync < errorBackoffDelay) {
        console.log(`⏳ Skipping auto-sync (too soon since last sync, backoff: ${errorBackoffDelay}ms)`);
        return;
      }

      // Prevent concurrent syncs
      if (isSyncingRef.current) {
        console.log('⏳ Skipping auto-sync (sync already in progress)');
        return;
      }

      try {
        isSyncingRef.current = true;
        console.log('🔄 Performing auto-sync...');
        lastSyncRef.current = now;

        const response = await fetch('/api/microsoft/calendar/auto-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        });

        const result = await response.json();

        if (result.success) {
          // Reset error count on successful sync
          consecutiveErrorsRef.current = 0;
          
          const syncedCount = result.result?.syncedEvents || 0;
          const conflictsCount = result.result?.conflicts?.length || 0;
          const errorsCount = result.result?.errors?.length || 0;

          // Silent success for auto-sync (no toast notifications)
          // Toast notifications only appear when user manually clicks Sync button
          console.log('✅ Auto-sync completed:', {
            synced: syncedCount,
            conflicts: conflictsCount,
            errors: errorsCount,
          });
        } else {
          consecutiveErrorsRef.current += 1;
          lastErrorTimeRef.current = now;
          
          // Show toast only for persistent connection issues (after 3 consecutive failures)
          if (result.error === 'token_expired' || result.error === 'graph_connection_failed') {
            if (consecutiveErrorsRef.current >= 3) {
              console.error('❌ Auto-sync failed (persistent):', result.error);
              toast({
                title: 'Outlook Connection Lost',
                description: 'Please reconnect your Microsoft account in Settings to continue syncing.',
                variant: 'destructive',
                duration: 8000,
              });
              // Stop auto-sync after persistent failures
              if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
            } else {
              // Silent failure for temporary connection issues (don't spam user)
              console.warn(`⚠️ Auto-sync failed (attempt ${consecutiveErrorsRef.current}/3):`, result.error);
            }
          } else {
            // Reset error count for non-connection errors
            consecutiveErrorsRef.current = 0;
            console.error('❌ Auto-sync failed:', result.error);
          }
        }
      } catch (error) {
        console.error('Error during auto-sync:', error);
        // Silent failure for auto-sync
      } finally {
        isSyncingRef.current = false;
      }
    };

    // Prevent duplicate initial syncs on re-mount
    if (hasInitialSyncedRef.current) {
      console.log('⏭️ Skipping initial sync (already performed in this session)');
      
      // Still set up the interval for periodic sync
      intervalRef.current = setInterval(() => {
        performAutoSync();
      }, 30 * 1000); // 30 seconds for near-instant sync
      
      return;
    }

    // Perform initial sync after 5 seconds for instant visibility
    const initialTimeout = setTimeout(() => {
      performAutoSync();
      hasInitialSyncedRef.current = true;
    }, 5000); // 5 seconds for faster initial sync

    // Set up interval for periodic sync (every 30 seconds for near-instant updates)
    intervalRef.current = setInterval(() => {
      performAutoSync();
    }, 30 * 1000); // 30 seconds

    console.log('✅ Auto-sync enabled (initial in 5s, then 30-second interval)');

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      clearTimeout(initialTimeout);
      console.log('🛑 Auto-sync disabled');
    };
  }, [userId, enabled, toast]);

  // Return a function to manually trigger sync
  const triggerSync = async () => {
    if (!userId) return;

    try {
      const response = await fetch('/api/microsoft/calendar/auto-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error triggering manual sync:', error);
      throw error;
    }
  };

  return { triggerSync };
}


