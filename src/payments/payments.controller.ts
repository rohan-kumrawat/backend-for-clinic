import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { PaymentsService, PaymentListResponse } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payment-query.dto';

import { Idempotent } from '../common/idempotency/idempotency.decorator';

@Controller('payments')
@UseGuards(AuthGuard('jwt'))
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ✅ EXACT PLACE
  @Post()
  @Idempotent()
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: any,
  ) {
    const currentUserId = req.user.userId;
    return this.paymentsService.createPayment(createPaymentDto, currentUserId);
  }

  @Get()
  async getPayments(
    @Query() query: ListPaymentsQueryDto,
  ): Promise<PaymentListResponse> {
    return this.paymentsService.getPayments(query);
  }
}
