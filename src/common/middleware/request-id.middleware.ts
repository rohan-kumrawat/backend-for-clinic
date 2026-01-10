import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = req.headers['x-request-id'] as string || crypto.randomUUID();
    
    // Store in request object
    (req as any).id = requestId;
    (req as any).startTime = Date.now();
    
    // Set response header
    res.setHeader('X-Request-Id', requestId);
    
    // Attach to response locals for logging
    (res as any).locals = { ...(res as any).locals, requestId };
    
    next();
  }
}