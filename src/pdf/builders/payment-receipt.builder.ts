import { Injectable } from '@nestjs/common';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { clinicConfig, clinicStyles } from '../fonts/fonts';

@Injectable()
export class PaymentReceiptBuilder {
  build(paymentData: any): TDocumentDefinitions {
    const receiptNumber = `REC-${paymentData.payment_id.substring(0, 8).toUpperCase()}`;
    const paymentDate = new Date(paymentData.payment_paymentDate).toLocaleDateString('en-IN');
    
    return {
      pageSize: 'A8',
      pageMargins: [10, 15, 10, 15],
      content: [
        // Clinic Header
        {
          text: clinicConfig.clinicName,
          style: 'clinicHeader',
        },
        {
          text: clinicConfig.clinicAddress,
          style: 'clinicInfo',
        },
        {
          text: `Ph: ${clinicConfig.clinicPhone} | Email: ${clinicConfig.clinicEmail}`,
          style: 'clinicInfo',
        },
        { text: clinicConfig.clinicGST, style: 'clinicInfo', margin: [0, 0, 0, 15] },
        
        // Receipt Title
        { text: 'PAYMENT RECEIPT', style: 'receiptTitle' },
        
        // Receipt Details Table
        {
          table: {
            widths: ['*'],
            body: [
              [
                {
                  columns: [
                    { text: 'Receipt No:', style: 'receiptLabel', width: '40%' },
                    { text: receiptNumber, style: 'receiptValue', width: '60%' },
                  ],
                },
              ],
              [
                {
                  columns: [
                    { text: 'Date:', style: 'receiptLabel', width: '40%' },
                    { text: paymentDate, style: 'receiptValue', width: '60%' },
                  ],
                },
              ],
              [
                {
                  columns: [
                    { text: 'Patient:', style: 'receiptLabel', width: '40%' },
                    { text: paymentData.patient_name, style: 'receiptValue', width: '60%' },
                  ],
                },
              ],
              [
                {
                  columns: [
                    { text: 'Reg No:', style: 'receiptLabel', width: '40%' },
                    { text: paymentData.patient_registrationNumber, style: 'receiptValue', width: '60%' },
                  ],
                },
              ],
              [
                {
                  columns: [
                    { text: 'Package:', style: 'receiptLabel', width: '40%' },
                    { text: paymentData.pkg_packageName, style: 'receiptValue', width: '60%' },
                  ],
                },
              ],
              [
                {
                  columns: [
                    { text: 'Amount Paid:', style: 'receiptLabel', width: '40%' },
                    { text: `₹ ${parseFloat(paymentData.payment_amountPaid).toFixed(2)}`, style: 'receiptValue', width: '60%' },
                  ],
                },
              ],
              [
                {
                  columns: [
                    { text: 'Payment Mode:', style: 'receiptLabel', width: '40%' },
                    { text: paymentData.payment_paymentMode, style: 'receiptValue', width: '60%' },
                  ],
                },
              ],
            ],
          },
          layout: 'noBorders',
        },
        
        // Separator
        { text: '―'.repeat(40), alignment: 'center', margin: [0, 15, 0, 15] },
        
        // Thank You Note
        { text: clinicConfig.thankYouNote, style: 'footer' },
        { text: clinicConfig.termsNote, style: 'footer', margin: [0, 5, 0, 0] },
      ],
      styles: {
        clinicHeader: {
          ...clinicStyles.header,
          fontSize: 12,
        },
        clinicInfo: clinicStyles.clinicInfo,
        receiptTitle: clinicStyles.receiptTitle,
        receiptLabel: {
          ...clinicStyles.receiptLabel,
          fontSize: 9,
        },
        receiptValue: {
          ...clinicStyles.receiptValue,
          fontSize: 9,
        },
        footer: clinicStyles.footer,
      },
      defaultStyle: {
        font: 'Roboto',
        fontSize: 8,
      },
    };
  }
}