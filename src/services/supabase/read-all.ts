/** Evita truncar silenciosamente el catálogo al alcanzar el límite de filas de la API. */
export async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const rows: T[] = [];
  const size = 500;
  for (let offset = 0; ; offset += size) {
    const result = await page(offset, offset + size - 1);
    if (result.error) throw result.error;
    rows.push(...(result.data || []));
    if (!result.data || result.data.length < size) return rows;
  }
}
