import { createQRPage } from '@/utils/pageFactory';
import { QRType } from '@/types';

export default createQRPage(QRType.PAYMENT, 'Payment QR Code', 'payment-qr-code');
