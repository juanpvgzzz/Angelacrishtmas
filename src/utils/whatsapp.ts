export const EXAMPLE_WHATSAPP_NUMBER = '573000000000';

export function isValidWhatsAppNumber(number: string): boolean {
  return /^[1-9]\d{7,14}$/.test(number) && number !== EXAMPLE_WHATSAPP_NUMBER;
}

export function productMessage(name: string, imageUrl?: string): string {
  const message = `Hola, quiero cotizar el producto ${name} de ÁMELA. Quisiera conocer su precio, disponibilidad y opciones de personalización.`;
  if (!imageUrl) return message;
  try {
    const image = new URL(imageUrl);
    if (image.protocol === 'https:' || image.protocol === 'http:') return `${message}\n\nFoto del producto: ${image.href}`;
  } catch { /* Sin una URL válida, conservar la consulta de texto. */ }
  return message;
}

export function buildWhatsAppUrl(number: string, message: string): string | null {
  return isValidWhatsAppNumber(number)
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : null;
}
