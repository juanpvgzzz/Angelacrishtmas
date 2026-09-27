export const sections = [
  { id: 'navidad', name: 'Navidad', description: 'Decoración y detalles hechos a mano para celebrar la Navidad.' },
  { id: 'munecas-de-trapo', name: 'Muñecas de trapo', description: 'Muñecas hechas a mano, con detalles únicos y personalidad propia.' },
] as const;

export type CatalogSection = typeof sections[number]['id'];
export const sectionUrl = (section: string) => `/${section}/`;
export const sectionName = (section: string) => sections.find(item => item.id === section)?.name || 'Navidad';
