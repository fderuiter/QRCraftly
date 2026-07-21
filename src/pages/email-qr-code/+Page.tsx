import { createQRPage } from '@/utils/pageFactory';
import { QRType } from '@/types';

export default createQRPage(QRType.EMAIL, 'Email QR Code', 'email-qr-code');
