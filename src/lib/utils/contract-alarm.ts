/**
 * Contract Alarm Utilities
 * Helper functions for contract expiry alarm logic
 */

export interface Contract {
  $id: string;
  contractName: string;
  contractExpiryDate?: string;
  daysUntilExpiry?: number;
}

/**
 * Check if any contract expires within the next 24 hours
 * Returns the contract(s) that trigger the alarm
 * IMPORTANT: Only returns contracts that haven't expired yet
 */
export function getExpiringContracts(contracts: Contract[]): Contract[] {
  if (!contracts || contracts.length === 0) return [];

  const now = new Date();

  return contracts.filter((contract) => {
    if (!contract.contractExpiryDate) return false;

    try {
      // Parse date-only strings (YYYY-MM-DD) using local timezone
      const expiryStr = contract.contractExpiryDate.split('T')[0];
      const [year, month, day] = expiryStr.split('-').map(Number);
      
      // Set expiry date to end of day (23:59:59) to ensure contracts expiring "today" are included
      const expiryDate = new Date(year, month - 1, day, 23, 59, 59, 999);

      // Calculate time until expiry in milliseconds
      const timeUntilExpiry = expiryDate.getTime() - now.getTime();

      // Contract expires within 24 hours (0 to 24 hours) AND hasn't expired yet
      // This means: timeUntilExpiry > 0 (not expired) AND timeUntilExpiry <= 24 hours
      return (
        timeUntilExpiry > 0 &&
        timeUntilExpiry <= 24 * 60 * 60 * 1000
      );
    } catch (error) {
      console.error('Error checking contract expiry:', error);
      return false;
    }
  });
}

/**
 * Get contracts that have already expired
 * Returns contracts where expiry date is in the past
 */
export function getExpiredContracts(contracts: Contract[]): Contract[] {
  if (!contracts || contracts.length === 0) return [];

  const now = new Date();

  return contracts.filter((contract) => {
    if (!contract.contractExpiryDate) return false;

    try {
      // Parse date-only strings (YYYY-MM-DD) using local timezone
      const expiryStr = contract.contractExpiryDate.split('T')[0];
      const [year, month, day] = expiryStr.split('-').map(Number);
      
      // Set expiry date to end of day (23:59:59)
      const expiryDate = new Date(year, month - 1, day, 23, 59, 59, 999);

      // Calculate time until expiry in milliseconds
      const timeUntilExpiry = expiryDate.getTime() - now.getTime();

      // Contract has expired (timeUntilExpiry <= 0)
      return timeUntilExpiry <= 0;
    } catch (error) {
      console.error('Error checking expired contracts:', error);
      return false;
    }
  });
}

/**
 * Check if alarm should play based on silenced state and expiry status
 */
export function shouldPlayAlarm(
  contracts: Contract[],
  silencedUntil?: number | null
): boolean {
  // Check if user has silenced the alarm
  if (silencedUntil && Date.now() < silencedUntil) {
    return false;
  }

  // Check if there are expiring contracts
  const expiringContracts = getExpiringContracts(contracts);
  return expiringContracts.length > 0;
}
