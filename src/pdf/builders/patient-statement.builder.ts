import { Injectable } from '@nestjs/common';
import { TDocumentDefinitions } from 'pdfmake/interfaces';
import { Patient } from '../../patients/patient.entity';
import { Package } from '../../packages/package.entity';
import { Payment } from '../../payments/payment.entity';
import { Session } from '../../sessions/session.entity';
import { FinancialSummary } from '../../financial-summary/financial-summary.entity';
import { clinicConfig, clinicStyles } from '../fonts/fonts';

interface StatementData {
  patient: Patient;
  packages: Package[];
  financialSummaries: Map<string, FinancialSummary>;
  paymentsByPackage: Map<string, Payment[]>;
  sessionsByPackage: Map<string, Session[]>;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class PatientStatementBuilder {
  build(
    patient: Patient,
    packages: Package[],
    financialSummaries: Map<string, FinancialSummary>,
    paymentsByPackage: Map<string, Payment[]>,
    sessionsByPackage: Map<string, Session[]>,
    dateFrom?: string,
    dateTo?: string,
  ): TDocumentDefinitions {
    const content: any[] = [];
    const pageHeader = this.createPageHeader();
    const pageFooter = this.createPageFooter();

    // Patient Information Section
    content.push(
      { text: 'PATIENT FINANCIAL STATEMENT', style: 'header' },
      this.createPatientInfoTable(patient, dateFrom, dateTo),
      { text: ' ', margin: [0, 10] },
    );

    // Packages Summary Section
    content.push(
      { text: 'PACKAGES SUMMARY', style: 'subheader' },
      this.createPackagesSummaryTable(packages, financialSummaries),
      { text: ' ', margin: [0, 20] },
    );

    // Detailed Package Information
    packages.forEach((pkg, index) => {
      const summary = financialSummaries.get(pkg.id);
      const payments = paymentsByPackage.get(pkg.id) || [];
      const sessions = sessionsByPackage.get(pkg.id) || [];

      content.push(
        { text: `Package: ${pkg.packageName}`, style: 'subheader' },
        this.createPackageDetailsTable(pkg, summary),
        { text: ' ', margin: [0, 10] },
      );

      if (payments.length > 0) {
        content.push(
          { text: 'Payments', style: 'tableHeader', fontSize: 11 },
          this.createPaymentsTable(payments),
          { text: ' ', margin: [0, 10] },
        );
      }

      if (sessions.length > 0) {
        content.push(
          { text: 'Sessions', style: 'tableHeader', fontSize: 11 },
          this.createSessionsTable(sessions),
          { text: ' ', margin: [0, index === packages.length - 1 ? 0 : 20] },
        );
      }
    });

    // Overall Totals
    content.push(
      { text: 'OVERALL FINANCIAL SUMMARY', style: 'subheader' },
      this.createOverallSummaryTable(packages, financialSummaries),
    );

    return {
      pageSize: 'A4',
      pageMargins: [40, 120, 40, 80],
      header: pageHeader,
      footer: pageFooter,
      content,
      styles: clinicStyles,
      defaultStyle: {
        font: 'Roboto',
        fontSize: 10,
      },
    };
  }

  private createPageHeader(): any {
    return (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: clinicConfig.clinicName,
          style: 'header',
          fontSize: 16,
          margin: [0, 30],
        },
      ],
    });
  }

  private createPageFooter(): any {
    return (currentPage: number, pageCount: number) => ({
      columns: [
        {
          text: clinicConfig.clinicAddress,
          alignment: 'center',
          fontSize: 9,
          margin: [0, 20, 0, 0],
        },
      ],
      margin: [40, 0, 40, 20],
    });
  }

  private createPatientInfoTable(patient: Patient, dateFrom?: string, dateTo?: string): any {
    const periodText = dateFrom && dateTo 
      ? `${new Date(dateFrom).toLocaleDateString('en-IN')} to ${new Date(dateTo).toLocaleDateString('en-IN')}`
      : 'All Time';

    return {
      table: {
        widths: ['*'],
        body: [
          [
            {
              columns: [
                { text: 'Patient Name:', style: 'receiptLabel', width: '20%' },
                { text: patient.name, width: '30%' },
                { text: 'Registration No:', style: 'receiptLabel', width: '20%' },
                { text: patient.registrationNumber, width: '30%' },
              ],
            },
          ],
          [
            {
              columns: [
                { text: 'Mobile:', style: 'receiptLabel', width: '20%' },
                { text: patient.mobile, width: '30%' },
                { text: 'Statement Period:', style: 'receiptLabel', width: '20%' },
                { text: periodText, width: '30%' },
              ],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 15],
    };
  }

  private createPackagesSummaryTable(packages: Package[], summaries: Map<string, FinancialSummary>): any {
    const body: any[] = [
      [
        { text: 'Package Name', style: 'tableHeader' },
        { text: 'Status', style: 'tableHeader' },
        { text: 'Total Amount', style: 'tableHeader', alignment: 'right' },
        { text: 'Paid Amount', style: 'tableHeader', alignment: 'right' },
        { text: 'Due Amount', style: 'tableHeader', alignment: 'right' },
        { text: 'Overpaid', style: 'tableHeader', alignment: 'right' },
      ],
    ];

    packages.forEach(pkg => {
      const summary = summaries.get(pkg.id);
      body.push([
        { text: pkg.packageName, style: 'tableCell' },
        { text: pkg.status, style: 'tableCell' },
        { text: `₹ ${Number(pkg.totalAmount).toFixed(2)}`, style: 'tableCell', alignment: 'right' },
        { text: `₹ ${summary ? Number(summary.totalPaidAmount).toFixed(2) : '0.00'}`, style: 'tableCell', alignment: 'right' },
        { text: `₹ ${summary && summary.status === 'DUE' ? Number(summary.remainingPayableAmount).toFixed(2) : '0.00'}`, style: 'tableCell', alignment: 'right' },
        { text: `₹ ${summary && summary.status === 'OVERPAID' ? Number(summary.overPaidAmount).toFixed(2) : '0.00'}`, style: 'tableCell', alignment: 'right' },
      ]);
    });

    return {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body,
      },
      layout: {
        hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc',
        paddingLeft: () => 5,
        paddingRight: () => 5,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
    };
  }

  private createPackageDetailsTable(pkg: Package, summary?: FinancialSummary): any {
    return {
      table: {
        widths: ['*'],
        body: [
          [
            {
              columns: [
                { text: 'Visit Type:', style: 'receiptLabel', width: '15%' },
                { text: pkg.visitType, width: '35%' },
                { text: 'Total Sessions:', style: 'receiptLabel', width: '15%' },
                { text: pkg.totalSessions.toString(), width: '35%' },
              ],
            },
          ],
          [
            {
              columns: [
                { text: 'Per Session:', style: 'receiptLabel', width: '15%' },
                { text: `₹ ${Number(pkg.perSessionAmount).toFixed(2)}`, width: '35%' },
                { text: 'Consumed Sessions:', style: 'receiptLabel', width: '15%' },
                { text: summary ? summary.consumedSessions.toString() : '0', width: '35%' },
              ],
            },
          ],
          [
            {
              columns: [
                { text: 'Consumed Amount:', style: 'receiptLabel', width: '15%' },
                { text: 'Financial Status:', style: 'receiptLabel', width: '15%' },
                { text: summary ? summary.status : 'N/A', width: '35%' },
              ],
            },
          ],
        ],
      },
      layout: 'noBorders',
    };
  }

  private createPaymentsTable(payments: Payment[]): any {
    const body: any[] = [
      [
        { text: 'Date', style: 'tableHeader' },
        { text: 'Receipt No', style: 'tableHeader' },
        { text: 'Amount', style: 'tableHeader', alignment: 'right' },
        { text: 'Mode', style: 'tableHeader' },
      ],
    ];

    payments.forEach(payment => {
      const receiptNo = `REC-${payment.id.substring(0, 8).toUpperCase()}`;
      body.push([
        { text: new Date(payment.paymentDate).toLocaleDateString('en-IN'), style: 'tableCell' },
        { text: receiptNo, style: 'tableCell' },
        { text: `₹ ${Number(payment.amountPaid).toFixed(2)}`, style: 'tableCell', alignment: 'right' },
        { text: payment.paymentMode, style: 'tableCell' },
      ]);
    });

    const totalAmount = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
    body.push([
      { text: 'TOTAL', style: 'tableHeader', colSpan: 2 },
      {},
      { text: `₹ ${totalAmount.toFixed(2)}`, style: 'tableHeader', alignment: 'right' },
      { text: '', style: 'tableHeader' },
    ]);

    return {
      table: {
        headerRows: 1,
        widths: ['auto', '*', 'auto', 'auto'],
        body,
      },
      layout: {
        hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length - 1) ? 1 : 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc',
        paddingLeft: () => 5,
        paddingRight: () => 5,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
    };
  }

  private createSessionsTable(sessions: Session[]): any {
    const body: any[] = [
      [
        { text: 'Date', style: 'tableHeader' },
        { text: 'Shift', style: 'tableHeader' },
        { text: 'Visit Type', style: 'tableHeader' },
        { text: 'Type', style: 'tableHeader' },
        { text: 'Remarks', style: 'tableHeader' },
      ],
    ];

    sessions.forEach(session => {
      body.push([
        { text: new Date(session.sessionDate).toLocaleDateString('en-IN'), style: 'tableCell' },
        { text: session.shift, style: 'tableCell' },
        { text: session.visitType, style: 'tableCell' },
        { text: session.isFreeSession ? 'FREE' : 'REGULAR', style: 'tableCell' },
        { text: session.remarks || '-', style: 'tableCell' },
      ]);
    });

    const regularSessions = sessions.filter(s => !s.isFreeSession).length;
    const freeSessions = sessions.filter(s => s.isFreeSession).length;
    
    body.push([
      { text: 'SUMMARY', style: 'tableHeader', colSpan: 2 },
      {},
      { text: `Regular: ${regularSessions}`, style: 'tableHeader' },
      { text: `Free: ${freeSessions}`, style: 'tableHeader' },
      { text: `Total: ${sessions.length}`, style: 'tableHeader' },
    ]);

    return {
      table: {
        headerRows: 1,
        widths: ['auto', 'auto', '*', 'auto', '*'],
        body,
      },
      layout: {
        hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length - 1) ? 1 : 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc',
        paddingLeft: () => 5,
        paddingRight: () => 5,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
    };
  }

  private createOverallSummaryTable(packages: Package[], summaries: Map<string, FinancialSummary>): any {
    let totalPackages = 0;
    let totalPackageAmount = 0;
    let totalPaidAmount = 0;
    let totalDueAmount = 0;
    let totalOverpaidAmount = 0;
    let activePackages = 0;

    packages.forEach(pkg => {
      const summary = summaries.get(pkg.id);
      totalPackages++;
      totalPackageAmount += Number(pkg.totalAmount);
      
      if (summary) {
        totalPaidAmount += Number(summary.totalPaidAmount);
        if (summary.status === 'DUE') {
          totalDueAmount += Number(summary.remainingPayableAmount);
        } else if (summary.status === 'OVERPAID') {
          totalOverpaidAmount += Number(summary.overPaidAmount);
        }
      }
      
      if (pkg.status === 'ACTIVE') activePackages++;
    });

    return {
      table: {
        widths: ['*', '*', '*', '*'],
        body: [
          [
            { text: 'Total Packages', style: 'tableHeader' },
            { text: 'Active Packages', style: 'tableHeader' },
            { text: 'Total Package Value', style: 'tableHeader' },
            { text: 'Total Paid', style: 'tableHeader' },
          ],
          [
            { text: totalPackages.toString(), style: 'tableCell', alignment: 'center' },
            { text: activePackages.toString(), style: 'tableCell', alignment: 'center' },
            { text: `₹ ${totalPackageAmount.toFixed(2)}`, style: 'tableCell', alignment: 'center' },
            { text: `₹ ${totalPaidAmount.toFixed(2)}`, style: 'tableCell', alignment: 'center' },
          ],
          [
            { text: 'Total Due', style: 'tableHeader' },
            { text: 'Total Overpaid', style: 'tableHeader' },
            { text: 'Net Balance', style: 'tableHeader' },
            { text: 'Overall Status', style: 'tableHeader' },
          ],
          [
            { text: `₹ ${totalDueAmount.toFixed(2)}`, style: 'tableCell', alignment: 'center' },
            { text: `₹ ${totalOverpaidAmount.toFixed(2)}`, style: 'tableCell', alignment: 'center' },
            { text: `₹ ${(totalPaidAmount - totalDueAmount + totalOverpaidAmount).toFixed(2)}`, style: 'tableCell', alignment: 'center' },
            { 
              text: totalDueAmount > 0 ? 'DUE' : totalOverpaidAmount > 0 ? 'OVERPAID' : 'CLEAR', 
              style: 'tableCell', 
              alignment: 'center',
              color: totalDueAmount > 0 ? '#d32f2f' : totalOverpaidAmount > 0 ? '#1976d2' : '#388e3c'
            },
          ],
        ],
      },
      layout: {
        hLineWidth: (i: number) => (i === 0 || i === 2 || i === 4) ? 1 : 0,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc',
        paddingLeft: () => 5,
        paddingRight: () => 5,
        paddingTop: () => 8,
        paddingBottom: () => 8,
      },
      margin: [0, 10, 0, 0],
    };
  }
}