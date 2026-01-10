import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
  ParseUUIDPipe,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { PdfService } from './pdf.service';
import { GenerateStatementDto } from './dto/generate-statement.dto';

@Controller('pdf')
@UseGuards(AuthGuard('jwt'))
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Get('payment-receipt/:paymentId')
@Header('Content-Type', 'application/pdf')
@Header('Content-Disposition', 'inline; filename="payment-receipt.pdf"')
async generatePaymentReceipt(
  @Param('paymentId', ParseUUIDPipe) paymentId: string,
  @Res({ passthrough: true }) res: Response,
) {
  const pdfBuffer = await this.pdfService.generatePaymentReceipt(paymentId);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Length': pdfBuffer.length,
  });

  return pdfBuffer;
}

  @Get('patient-statement/:patientId')
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'inline; filename="patient-statement.pdf"')
  async generatePatientStatement(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: GenerateStatementDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pdfBuffer = await this.pdfService.generatePatientStatement(
      patientId,
      query.dateFrom,
      query.dateTo,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length,
    });

    return pdfBuffer;
}

}