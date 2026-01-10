import { Request } from 'express';

export class IpUtils {
  static extractClientIp(req: Request): string {
    // Check for reverse proxy headers
    const forwardedFor = req.headers['x-forwarded-for'];
    
    if (forwardedFor) {
      if (Array.isArray(forwardedFor)) {
        return forwardedFor[0].split(',')[0].trim();
      }
      return forwardedFor.split(',')[0].trim();
    }
    
    // Check for cloudflare header
    const cfConnectingIp = req.headers['cf-connecting-ip'];
    if (cfConnectingIp) {
      return Array.isArray(cfConnectingIp) ? cfConnectingIp[0] : cfConnectingIp;
    }
    
    // Default to connection remote address
    return req.ip || req.connection.remoteAddress || 'unknown';
  }

  static normalizeIp(ip: string): string {
    if (ip === '::1') return '127.0.0.1';
    if (ip.startsWith('::ffff:')) return ip.substring(7);
    return ip;
  }

  static isPrivateIp(ip: string): boolean {
    if (ip === '127.0.0.1' || ip === 'localhost') return true;
    
    // IPv4 private ranges
    const privateRanges = [
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/,
      /^192\.168\.\d{1,3}\.\d{1,3}$/,
    ];
    
    return privateRanges.some(regex => regex.test(ip));
  }
}