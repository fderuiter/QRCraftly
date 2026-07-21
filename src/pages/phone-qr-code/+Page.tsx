import { createQRPage } from '@/utils/pageFactory';
import { QRType } from '@/types';

export default createQRPage(QRType.PHONE, 'Phone QR Code', 'phone-qr-code');
