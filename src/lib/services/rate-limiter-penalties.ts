/**
 * Progressive penalty system for rate limiting
 * Tracks violations and applies temporary bans for repeat offenders
 */

import { setBan, isBanned } from './redis-rate-limit';
import {
  getRateLimitConfig,
  getUserTier,
} from '@/lib/config/rate-limit.config';
import type { UserTier } from '@/lib/config/rate-limit.config';

export interface ViolationRecord {
  count: number;
  firstViolation: number;
  lastViolation: number;
  banCount: number;
}

export interface PenaltyResult {
  shouldBan: boolean;
  banDuration?: number;
  violationCount: number;
}

/**
 * Configuration for progressive penalties
 */
const PENALTY_CONFIG = {
  BAN_THRESHOLD: parseInt(process.env.RATE_LIMIT_BAN_THRESHOLD || '10', 10), // Violations before ban
  INITIAL_BAN_DURATION: parseInt(
    process.env.RATE_LIMIT_BAN_DURATION || '300',
    10
  ), // 5 minutes
  MAX_BAN_DURATION: 3600, // 1 hour maximum
  BAN_MULTIPLIER: 2, // Each subsequent ban is 2x longer
  VIOLATION_WINDOW: 3600, // Track violations within 1 hour window
};

/**
 * Progressive penalty service
 */
export class PenaltyService {
  /**
   * Record a rate limit violation
   */
  async recordViolation(
    identifier: string,
    endpoint: string,
    tier: UserTier
  ): Promise<PenaltyResult> {
    const violationKey = `ratelimit:violations:${identifier}`;
    const config = getRateLimitConfig(endpoint, tier);
    const threshold = config.requests * PENALTY_CONFIG.BAN_THRESHOLD;

    // Get existing violation record
    const record = await this.getViolationRecord(violationKey);

    // Check if within violation window
    const now = Date.now();
    const windowStart = now - PENALTY_CONFIG.VIOLATION_WINDOW * 1000;

    if (record.firstViolation < windowStart) {
      // Reset if outside window
      record.count = 1;
      record.firstViolation = now;
      record.lastViolation = now;
    } else {
      record.count++;
      record.lastViolation = now;
    }

    // Save violation record
    await this.saveViolationRecord(violationKey, record);

    // Check if should ban
    const shouldBan = record.count >= threshold;

    if (shouldBan) {
      // Calculate ban duration (escalating)
      const banDuration = this.calculateBanDuration(record.banCount);
      record.banCount++;

      // Apply ban
      await setBan(identifier, banDuration);

      // Save updated record
      await this.saveViolationRecord(violationKey, record);

      return {
        shouldBan: true,
        banDuration,
        violationCount: record.count,
      };
    }

    return {
      shouldBan: false,
      violationCount: record.count,
    };
  }

  /**
   * Check if identifier is currently banned
   */
  async checkBan(identifier: string): Promise<boolean> {
    return isBanned(identifier);
  }

  /**
   * Get violation record from storage
   */
  private async getViolationRecord(key: string): Promise<ViolationRecord> {
    try {
      // Try to get from Redis
      const { get } = await import('./redis-cache');
      const record = await get<ViolationRecord>(key);
      if (record) {
        return record;
      }
    } catch (error) {
      console.error('Error getting violation record:', error);
    }

    // Return default record
    return {
      count: 0,
      firstViolation: Date.now(),
      lastViolation: Date.now(),
      banCount: 0,
    };
  }

  /**
   * Save violation record to storage
   */
  private async saveViolationRecord(
    key: string,
    record: ViolationRecord
  ): Promise<void> {
    try {
      const { set } = await import('./redis-cache');
      // Store for 2x the violation window to ensure we track properly
      await set(key, record, PENALTY_CONFIG.VIOLATION_WINDOW * 2);
    } catch (error) {
      console.error('Error saving violation record:', error);
    }
  }

  /**
   * Calculate ban duration based on ban count
   * Escalates: 5min, 10min, 20min, 40min, 1hour (max)
   */
  private calculateBanDuration(banCount: number): number {
    const duration =
      PENALTY_CONFIG.INITIAL_BAN_DURATION *
      Math.pow(PENALTY_CONFIG.BAN_MULTIPLIER, banCount);

    return Math.min(duration, PENALTY_CONFIG.MAX_BAN_DURATION);
  }

  /**
   * Reset violations for identifier (admin function)
   */
  async resetViolations(identifier: string): Promise<void> {
    const violationKey = `ratelimit:violations:${identifier}`;
    const { del } = await import('./redis-cache');
    await del(violationKey);
  }

  /**
   * Get violation statistics for identifier
   */
  async getViolationStats(identifier: string): Promise<ViolationRecord | null> {
    const violationKey = `ratelimit:violations:${identifier}`;
    return this.getViolationRecord(violationKey);
  }
}

/**
 * Global penalty service instance
 */
export const penaltyService = new PenaltyService();

export default penaltyService;
