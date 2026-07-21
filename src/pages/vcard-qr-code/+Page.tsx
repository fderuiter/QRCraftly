import { createQRPage } from '@/utils/pageFactory';
import { QRType } from '@/types';

export default createQRPage(QRType.VCARD, 'vCard QR Code', 'vcard-qr-code');
