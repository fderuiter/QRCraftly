import { createQRPage } from '@/utils/pageFactory';
import { QRType } from '@/types';

export default createQRPage(QRType.TEXT, 'Text QR Code', 'text-qr-code');
