import type { Category } from '../types/catalog';

export const categories: Category[] = [
  { id: 'dolls', name: 'Muñecos navideños', slug: 'munecos-navidenos', description: 'Personajes entrañables, puntada a puntada, para acompañar tus tradiciones.', order: 1, active: true, image: { kind: 'placeholder', src: '/images/placeholders/santa.svg', alt: 'Ilustración de un Papá Noel artesanal', width: 600, height: 720 } },
  { id: 'ornaments', name: 'Adornos para el árbol', slug: 'adornos-para-el-arbol', description: 'Pequeños detalles que hacen único el rincón más especial de la Navidad.', order: 2, active: true, image: { kind: 'placeholder', src: '/images/placeholders/angel.svg', alt: 'Ilustración de un ángel para el árbol', width: 600, height: 720 } },
  { id: 'wreaths', name: 'Coronas', slug: 'coronas', description: 'Una bienvenida hecha a mano para compartir la alegría de volver a casa.', order: 3, active: true, image: { kind: 'placeholder', src: '/images/placeholders/wreath.svg', alt: 'Ilustración de una corona navideña', width: 600, height: 720 } },
  { id: 'centerpieces', name: 'Centros de mesa', slug: 'centros-de-mesa', description: 'Creaciones para reunir a quienes quieres alrededor de una mesa especial.', order: 4, active: true, image: { kind: 'placeholder', src: '/images/placeholders/table.svg', alt: 'Ilustración de un centro de mesa', width: 600, height: 720 } },
  { id: 'home', name: 'Decoración para el hogar', slug: 'decoracion-para-el-hogar', description: 'Estamos preparando nuevos detalles para llevar la Navidad a cada rincón.', order: 5, active: true, image: { kind: 'placeholder', src: '/images/placeholders/stocking.svg', alt: 'Ilustración de una bota navideña', width: 600, height: 720 } },
];
