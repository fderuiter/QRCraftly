import { createQRPage } from '@/utils/pageFactory';
import { QRType } from '@/types';

export default createQRPage(QRType.SMS, 'SMS QR Code', 'sms-qr-code');
