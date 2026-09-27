export function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);
}
export function optionalPrice(value: string): number | null {
  const input = value.trim();
  if (!input) return null;
  const price = Number(input);
  if (!Number.isFinite(price) || price < 0 || price >= 10000000000) {
    throw new Error('Escribe un precio válido o deja el campo vacío para cotizar.');
  }
  return price;
}
export function validateImage(file: Pick<File, 'type' | 'size'>) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Selecciona una imagen JPEG, PNG o WebP.');
  }
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) throw new Error('Cada imagen debe pesar como máximo 5 MB y no estar vacía.');
}
export function friendlyError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === '23505') return 'Ese slug ya existe. Elige otro.';
  if (code === '23503') return 'La categoría contiene productos o ya no existe. Revisa sus relaciones.';
  if (code === '42501') return 'No tienes autorización para realizar esta operación.';
  if (code === '23514' || code === '22P02') return 'Revisa los datos: uno de los valores no es válido.';
  return 'No se pudo completar la operación. Revisa tu conexión y vuelve a intentarlo.';
}
