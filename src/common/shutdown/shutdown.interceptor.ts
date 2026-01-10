import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ShutdownService } from './shutdown.service';

@Injectable()
export class ShutdownInterceptor implements NestInterceptor {
  constructor(private readonly shutdownService: ShutdownService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    try {
      this.shutdownService.trackStart();
    } catch {
      return throwError(
        () =>
          new ServiceUnavailableException({
            errorCode: 'SYSTEM_SHUTTING_DOWN',
            message: 'System is shutting down',
            retryAfter: 30,
          }),
      );
    }

    return next.handle().pipe(
      tap(() => this.shutdownService.trackEnd()),
      catchError(err => {
        this.shutdownService.trackEnd();
        throw err;
      }),
    );
  }
}
