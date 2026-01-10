import * as path from 'path';

const fontPath = path.join(process.cwd(), 'fonts');

export const clinicFonts = {
  Roboto: {
    normal: path.join(fontPath, 'Roboto-Regular.ttf'),
    bold: path.join(fontPath, 'Roboto-Bold.ttf'),
    italics: path.join(fontPath, 'Roboto-Italic.ttf'),
    bolditalics: path.join(fontPath, 'Roboto-BoldItalic.ttf'),
  },
};

export const clinicStyles = {
  header: {
    fontSize: 18,
    bold: true,
    alignment: 'center' as const,
    margin: [0, 0, 0, 10] as [number, number, number, number],
  },
  subheader: {
    fontSize: 14,
    bold: true,
    margin: [0, 10, 0, 5] as [number, number, number, number],
  },
  clinicInfo: {
    fontSize: 10,
    alignment: 'center' as const,
    margin: [0, 0, 0, 10] as [number, number, number, number],
  },
  receiptTitle: {
    fontSize: 16,
    bold: true,
    alignment: 'center' as const,
    margin: [0, 0, 0, 15] as [number, number, number, number],
  },
  receiptLabel: {
    fontSize: 10,
    bold: true,
    margin: [0, 3, 0, 3] as [number, number, number, number],
  },
  receiptValue: {
    fontSize: 10,
    margin: [0, 3, 0, 3] as [number, number, number, number],
  },
  tableHeader: {
    bold: true,
    fontSize: 10,
    fillColor: '#f2f2f2',
  },
  tableCell: {
    fontSize: 9,
  },
  footer: {
    fontSize: 9,
    alignment: 'center' as const,
    margin: [0, 20, 0, 0] as [number, number, number, number],
  },
  pageNumber: {
    fontSize: 9,
    alignment: 'center' as const,
    margin: [0, 10, 0, 0] as [number, number, number, number],
  },
};

export const clinicConfig = {
  clinicName: "Dr Shashi's Physiotherapy And Clinical Fitness",
  clinicAddress: '19-E, Tulsi Nagar Rd, near BCM Paradise, Tulsi Nagar, Nipania, Indore, Madhya Pradesh 453771',
  clinicPhone: '+91 08817144273',
  clinicEmail: 'drshashipareta12@gmail.com',
  clinicGST: 'GSTIN: 29ABCDE1234F1Z5',
  thankYouNote: 'Thank you for choosing us. Get well soon!',
  termsNote: 'This is a computer-generated receipt. No signature required.',
};