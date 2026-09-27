import { brand } from '../config/brand';
import type { Availability } from '../types/catalog';

const formatter = new Intl.NumberFormat(brand.locale, { style: 'currency', currency: brand.currency, maximumFractionDigits: 0 });
export const formatPrice = (price: number) => formatter.format(price);
export const availabilityLabels: Record<Availability, string> = {
  'under-order': 'Por encargo',
  available: 'Disponible',
  unavailable: 'Agotado',
};
