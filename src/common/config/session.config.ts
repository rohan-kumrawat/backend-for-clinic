export const SESSION_CONFIG = {
  ACCESS_TOKEN_TTL_MINUTES: parseInt(process.env.ACCESS_TOKEN_TTL_MINUTES || '15', 10),
  REFRESH_TOKEN_TTL_DAYS: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10),
  MAX_RECEPTIONIST_SESSIONS: parseInt(process.env.MAX_RECEPTIONIST_SESSIONS || '1', 10),
  SESSION_CLEANUP_INTERVAL_HOURS: parseInt(process.env.SESSION_CLEANUP_INTERVAL_HOURS || '6', 10),
};

export const JWT_CONFIG = {
  ACCESS_TOKEN_SECRET: process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'access_secret',
  REFRESH_TOKEN_SECRET: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
};