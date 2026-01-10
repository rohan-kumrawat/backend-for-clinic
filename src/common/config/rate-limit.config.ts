export interface RateLimitConfig {
  windowSeconds: number;
  maxRequests: number;
  blockDurationSeconds: number;
}

export interface RateLimitProfile {
  auth: RateLimitConfig;
  read: RateLimitConfig;
  write: RateLimitConfig;
  admin: RateLimitConfig;
  receptionist: RateLimitConfig;
}

export const RATE_LIMIT_PROFILES: RateLimitProfile = {
  auth: {
    windowSeconds: 60, // 1 minute window
    maxRequests: 5,    // 5 requests per minute
    blockDurationSeconds: 300, // 5 minutes block
  },
  read: {
    windowSeconds: 60, // 1 minute window
    maxRequests: 60,   // 60 requests per minute
    blockDurationSeconds: 300, // 5 minutes block
  },
  write: {
    windowSeconds: 60, // 1 minute window
    maxRequests: 30,   // 30 requests per minute
    blockDurationSeconds: 300, // 5 minutes block
  },
  admin: {
    windowSeconds: 60,
    maxRequests: 100,  // Higher limit for admins
    blockDurationSeconds: 300,
  },
  receptionist: {
    windowSeconds: 60,
    maxRequests: 50,   // Lower limit for receptionists
    blockDurationSeconds: 300,
  },
};

export const ABUSE_DETECTION_CONFIG = {
  MAX_ATTEMPTS_PER_IP: 10,
  MAX_ATTEMPTS_PER_USERNAME: 5,
  ACCOUNT_LOCK_MINUTES: 30,
  DETECTION_WINDOW_MINUTES: 5,
};