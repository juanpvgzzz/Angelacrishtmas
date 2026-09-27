import { validateImage } from './catalog-validation';

/** Decode before upload, bound dimensions and strip metadata when re-encoding. */
export async function prepareImage(original: File): Promise<{ file: File; width: number; height: number }> {
  validateImage(original);
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(original); }
  catch { throw new Error('No pudimos abrir esta fotografía. Prueba con otra imagen JPEG, PNG o WebP.'); }
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 48_000_000) {
      throw new Error('Esta fotografía es demasiado grande. Usa una imagen de hasta 48 megapíxeles.');
    }
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('No pudimos preparar la fotografía. Intenta desde otro navegador.');
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', .84));
    if (!blob) throw new Error('No pudimos preparar la fotografía. Prueba con otra imagen.');
    if (scale === 1 && blob.size >= original.size) return { file: original, width, height };
    const extension = blob.type === 'image/webp' ? 'webp' : 'png';
    const file = new File([blob], original.name.replace(/\.[^.]+$/, '') + '.' + extension, { type: blob.type });
    validateImage(file);
    return { file, width, height };
  } finally { bitmap.close(); }
}
