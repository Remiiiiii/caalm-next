import { createHmac, randomBytes } from 'crypto';

// TOTP implementation based on RFC 6238
export class TOTP {
  private static readonly DIGITS = 6;
  private static readonly PERIOD = 30; // 30 seconds
  private static readonly ALGORITHM = 'sha1';

  /**
   * Generate a TOTP secret key
   */
  static generateSecret(length: number = 32): string {
    const bytes = randomBytes(length);
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';

    for (let i = 0; i < bytes.length; i++) {
      result += alphabet[bytes[i] % alphabet.length];
    }

    return result;
  }

  /**
   * Generate a TOTP code for the current time
   */
  static generateCode(secret: string, time?: number): string {
    const timestamp = time || Math.floor(Date.now() / 1000);
    const counter = Math.floor(timestamp / this.PERIOD);

    return this.generateHOTP(secret, counter);
  }

  /**
   * Verify a TOTP code
   */
  static verifyCode(secret: string, code: string, window: number = 1): boolean {
    const timestamp = Math.floor(Date.now() / 1000);
    const counter = Math.floor(timestamp / this.PERIOD);

    // Check current time window and adjacent windows
    for (let i = -window; i <= window; i++) {
      const expectedCode = this.generateHOTP(secret, counter + i);
      if (expectedCode === code) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generate HOTP code (RFC 4226)
   */
  private static generateHOTP(secret: string, counter: number): string {
    // Convert counter to 8-byte buffer
    const buffer = Buffer.alloc(8);
    buffer.writeBigUInt64BE(BigInt(counter), 0);

    // Create HMAC
    const hmac = createHmac(this.ALGORITHM, this.base32Decode(secret));
    hmac.update(buffer);
    const hash = hmac.digest();

    // Generate 4-byte code
    const offset = hash[hash.length - 1] & 0xf;
    const code =
      ((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff);

    // Convert to string with leading zeros
    const codeStr = (code % Math.pow(10, this.DIGITS)).toString();
    return codeStr.padStart(this.DIGITS, '0');
  }

  /**
   * Decode base32 string
   */
  private static base32Decode(str: string): Buffer {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let bits = 0;
    let value = 0;
    let output = '';

    for (let i = 0; i < str.length; i++) {
      const char = str[i].toUpperCase();
      const index = alphabet.indexOf(char);

      if (index === -1) continue;

      value = (value << 5) | index;
      bits += 5;

      if (bits >= 8) {
        output += String.fromCharCode((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }

    return Buffer.from(output, 'binary');
  }

  /**
   * Generate QR code URL for authenticator apps
   */
  static generateQRUrl(
    secret: string,
    accountName: string,
    issuer: string = 'CAALM'
  ): string {
    const encodedSecret = encodeURIComponent(secret);
    const encodedAccount = encodeURIComponent(accountName);
    const encodedIssuer = encodeURIComponent(issuer);

    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${encodedSecret}&issuer=${encodedIssuer}&algorithm=${this.ALGORITHM.toUpperCase()}&digits=${
      this.DIGITS
    }&period=${this.PERIOD}`;
  }
}

// Utility functions for easy use
export const generateTOTPSecret = () => TOTP.generateSecret();
export const generateTOTPCode = (secret: string) => TOTP.generateCode(secret);
export const verifyTOTPCode = (secret: string, code: string) =>
  TOTP.verifyCode(secret, code);
export const generateTOTPQRUrl = (
  secret: string,
  accountName: string,
  issuer?: string
) => TOTP.generateQRUrl(secret, accountName, issuer);
