import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SecurityMetricsService } from '../security/security-metrics.service';
import { LoggerService } from '../logger/logger.service';
import { SECURITY_CONFIG } from '../config/security.config';

@Injectable()
export class ApiHardeningMiddleware implements NestMiddleware {
  constructor(
    private readonly metrics: SecurityMetricsService,
    private readonly logger: LoggerService,
  ) {}

  use(req: Request, res: Response, next: NextFunction): void {

    if(req.method === 'OPTIONS'){
      return next();
    }
  try {
    const contentType = req.headers['content-type'] ?? '';

    // 🔥 IMPORTANT: multipart ko bypass karo
    if (contentType.includes('multipart/form-data')) {
      return next();
    }

    this.validateHttpMethod(req.method);

    if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
      this.validateContentType(req);
    }

    this.checkPayloadSize(req);
    this.setSecurityHeaders(res);

    next();
  } catch (error) {
    if (error instanceof ForbiddenException) {
      throw error;
    }
    next(error);
  }
}


  private validateHttpMethod(method: string): void {
    const allowedMethods = SECURITY_CONFIG.apiHardening.allowedMethods;
    
    if (!allowedMethods.includes(method.toUpperCase())) {
      this.metrics.incrementCounter('method_violations', { method });
      
      this.logger.warn('Invalid HTTP method attempted', {
        module: 'ApiHardening',
        action: 'INVALID_METHOD',
        method,
        allowedMethods,
      });

      throw new ForbiddenException({
        errorCode: 'METHOD_NOT_ALLOWED',
        message: `HTTP method ${method} is not allowed.`,
      });
    }
  }

  private validateContentType(req: Request): void {
    const contentType = req.headers['content-type'];
    const allowedTypes = SECURITY_CONFIG.apiHardening.allowedContentTypes;

    if (!contentType) {
      this.metrics.incrementCounter('content_type_violations', { reason: 'MISSING' });
      
      this.logger.warn('Missing Content-Type header', {
        module: 'ApiHardening',
        action: 'MISSING_CONTENT_TYPE',
        endpoint: req.originalUrl,
      });

      throw new ForbiddenException({
        errorCode: 'INVALID_CONTENT_TYPE',
        message: 'Content-Type header is required.',
      });
    }

    // Check if content type is allowed
    const isValidType = allowedTypes.some(type => 
      contentType.toLowerCase().includes(type.toLowerCase())
    );

    if (!isValidType) {
      this.metrics.incrementCounter('content_type_violations', { 
        contentType,
        allowedTypes: allowedTypes.join(', '),
      });

      this.logger.warn('Invalid Content-Type header', {
        module: 'ApiHardening',
        action: 'INVALID_CONTENT_TYPE',
        endpoint: req.originalUrl,
        contentType,
        allowedTypes,
      });

      throw new ForbiddenException({
        errorCode: 'INVALID_CONTENT_TYPE',
        message: `Content-Type ${contentType} is not allowed.`,
      });
    }
  }

  private checkPayloadSize(req: Request): void {
  const contentType = req.headers['content-type'];

  // Multer handles multipart size limits
  if (contentType?.includes('multipart/form-data')) {
    return;
  }

  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  const maxSize = SECURITY_CONFIG.apiHardening.maxPayloadSize;

  if (contentLength > maxSize) {
    this.metrics.incrementCounter('payload_size_violations', {
      size: contentLength.toString(),
      max: maxSize.toString(),
    });

    throw new ForbiddenException({
      errorCode: 'PAYLOAD_TOO_LARGE',
      message: `Payload exceeds ${Math.round(maxSize / 1024 / 1024)}MB limit`,
    });
  }
}


  private setSecurityHeaders(res: Response): void {
    // Remove sensitive headers
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // Set security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'",
    );

    // HSTS if enabled
    if (SECURITY_CONFIG.apiHardening.enableHsts) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
    }

  }
}