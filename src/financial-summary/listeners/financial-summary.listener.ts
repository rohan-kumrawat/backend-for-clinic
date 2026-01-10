import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { FinancialSummaryService } from '../financial-summary.service';
import {
  EVENT_PAYMENT_CREATED,
  EVENT_SESSION_CREATED,
  EVENT_PACKAGE_CLOSED,
} from '../../common/events/event-names';

import { PaymentCreatedEvent } from '../../common/events/payment-created.event';
import { SessionCreatedEvent } from '../../common/events/session-created.event';
import { PackageClosedEvent } from '../../common/events/package-closed.event';

@Injectable()
export class FinancialSummaryListener {
  private readonly logger = new Logger(FinancialSummaryListener.name);

  constructor(
    private readonly financialSummaryService: FinancialSummaryService,
  ) {}

  @OnEvent(EVENT_PAYMENT_CREATED)
  async handlePaymentCreatedEvent(event: PaymentCreatedEvent): Promise<void> {
    await this.handleRecompute(event.packageId, 'PaymentCreated');
  }

  @OnEvent(EVENT_SESSION_CREATED)
  async handleSessionCreatedEvent(event: SessionCreatedEvent): Promise<void> {
    await this.handleRecompute(event.packageId, 'SessionCreated');
  }

  @OnEvent(EVENT_PACKAGE_CLOSED)
  async handlePackageClosedEvent(event: PackageClosedEvent): Promise<void> {
    await this.handleRecompute(event.packageId, 'PackageClosed');
  }

  private async handleRecompute(
    packageId: string,
    eventType: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Recomputing financial summary for package ${packageId} triggered by ${eventType}`,
      );

      await this.financialSummaryService.recomputeForPackage(packageId);

      this.logger.log(
        `Successfully recomputed financial summary for package ${packageId}`,
      );
    } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));

        this.logger.error(
          `Failed to recompute financial summary for package ${packageId} after ${eventType}: ${err.message}`,
            err.stack,
        );
    }

  }
}