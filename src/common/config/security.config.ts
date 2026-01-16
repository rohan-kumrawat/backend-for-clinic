export interface RateLimitProfile {
  windowMs: number;
  maxRequests: number;
  blockDurationMs: number;
}

export interface SecurityConfig {
  rateLimiting: {
    public: {
      login: RateLimitProfile;
      passwordReset: RateLimitProfile;
      registration: RateLimitProfile;
    };
    authenticated: {
      default: RateLimitProfile;
      admin: RateLimitProfile;
      receptionist: RateLimitProfile;
    };
    strict: RateLimitProfile;
  };
  abuseDetection: {
    maxFailedLogins: number;
    failedLoginWindowMs: number;
    maxPasswordResets: number;
    passwordResetWindowMs: number;
    rapidRequestThreshold: number;
    rapidRequestWindowMs: number;
    progressivePenaltySteps: number;
    temporaryBlockDurationMs: number;
  };
  apiHardening: {
    maxPayloadSize: number;
    maxJsonDepth: number;
    allowedMethods: string[];
    allowedContentTypes: string[];
    enableCors: boolean;
    enableHsts: boolean;
  };
}

export const SECURITY_CONFIG: SecurityConfig = {
  rateLimiting: {
    public: {
      login: {
        windowMs: 5 * 60 * 1000, // 5 minutes
        maxRequests: 5,
        blockDurationMs: 15 * 60 * 1000, // 15 minutes
      },
      passwordReset: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 3,
        blockDurationMs: 30 * 60 * 1000, // 30 minutes
      },
      registration: {
        windowMs: 60 * 60 * 1000, // 1 hour
        maxRequests: 2,
        blockDurationMs: 60 * 60 * 1000, // 1 hour
      },
    },
    authenticated: {
      default: {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 100,
        blockDurationMs: 5 * 60 * 1000, // 5 minutes
      },
      admin: {
        windowMs: 60 * 1000,
        maxRequests: 500,
        blockDurationMs: 5 * 60 * 1000,
      },
      receptionist: {
        windowMs: 60 * 1000,
        maxRequests: 50,
        blockDurationMs: 5 * 60 * 1000,
      },
    },
    strict: {
      windowMs: 60 * 1000,
      maxRequests: 10,
      blockDurationMs: 30 * 60 * 1000,
    },
  },
  abuseDetection: {
    maxFailedLogins: 5,
    failedLoginWindowMs: 15 * 60 * 1000, // 15 minutes
    maxPasswordResets: 3,
    passwordResetWindowMs: 60 * 60 * 1000, // 1 hour
    rapidRequestThreshold: 20,
    rapidRequestWindowMs: 10 * 1000, // 10 seconds
    progressivePenaltySteps: 3,
    temporaryBlockDurationMs: 30 * 60 * 1000, // 30 minutes
  },
  apiHardening: {
    maxPayloadSize: 10 * 1024 * 1024, // 10MB
    maxJsonDepth: 10,
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedContentTypes: [
      'application/json', 
      'application/x-www-form-urlencoded', 
      'multipart/form-data'
    ],
    enableCors: false,
    enableHsts: true,
  },
};