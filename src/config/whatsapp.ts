import { buildWhatsAppUrl, productMessage } from '../utils/whatsapp';

export const whatsapp = {
  number: import.meta.env.PUBLIC_WHATSAPP_NUMBER?.trim() || '573046583246',
  generalMessage: 'Hola, quisiera conocer más sobre las creaciones de ÁMELA.',
};

export function getWhatsAppUrl(productName?: string, message?: string, imageUrl?: string): string | null {
  return buildWhatsAppUrl(whatsapp.number, message || (productName ? productMessage(productName, imageUrl) : whatsapp.generalMessage));
}
