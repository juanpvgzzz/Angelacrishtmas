export const catalogDefaults = {
  eyebrow: 'HECHO CON AMOR, ELEGIDO POR TI',
  title: 'Encuentra tu detalle',
  description: 'Artesanía que se siente especial.',
  all_button_label: 'Todo',
  category_label: 'Categoría',
  all_categories_label: 'Todas las categorías',
  customizable_label: 'Solo personalizables',
  show_category_buttons: true,
  show_category_select: true,
  show_customizable_filter: true,
};
export type CatalogSettings = typeof catalogDefaults;
export type CatalogSettingsRow = CatalogSettings & { id: 'catalog'; created_at: string; updated_at: string };
export const catalogTextFields = [
  { key: 'eyebrow', label: 'Texto superior', max: 120 },
  { key: 'title', label: 'Título', max: 120 },
  { key: 'description', label: 'Descripción', max: 300 },
  { key: 'all_button_label', label: 'Texto del botón “Todo”', max: 60 },
  { key: 'category_label', label: 'Etiqueta del selector', max: 60 },
  { key: 'all_categories_label', label: 'Texto “Todas las categorías”', max: 80 },
  { key: 'customizable_label', label: 'Texto del filtro de personalización', max: 80 },
] as const;
export const catalogToggleFields = [
  { key: 'show_category_buttons', label: 'Mostrar botones de categorías' },
  { key: 'show_category_select', label: 'Mostrar selector de categorías' },
  { key: 'show_customizable_filter', label: 'Mostrar filtro de personalizables' },
] as const;
export function validateCatalogSettings(value: CatalogSettings): CatalogSettings {
  const clean = { ...value };
  for (const field of catalogTextFields) {
    const text = value[field.key].trim();
    if (!text || text.length > field.max) throw new Error(`${field.label}: escribe entre 1 y ${field.max} caracteres.`);
    clean[field.key] = text;
  }
  return clean;
}
