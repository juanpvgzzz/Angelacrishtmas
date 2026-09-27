import type { CatalogImage } from '../types/catalog';

export const brand = {
  name: 'ÁMELA',
  tagline: 'Handmade with Love',
  description: 'Flores eternas, muñecas, decoración y regalos personalizados elaborados a mano para momentos especiales.',
  locale: 'es-CO',
  currency: 'COP',
  siteUrl: import.meta.env.PUBLIC_SITE_URL?.trim() || undefined,
  // Recurso original reservado para la colección navideña.
  seasonalImage: {
    kind: 'placeholder',
    src: '/images/brand/christmas-scene.svg',
    alt: 'Ilustración provisional de Papá Noel, una corona y estrellas navideñas',
    width: 720,
    height: 760,
  } as CatalogImage,
  about: 'En ÁMELA contamos con más de 12 años de experiencia artesanal. Damos forma a flores eternas, muñecas, decoración y piezas de temporada. Creamos cada pieza a mano, cuidando los materiales, las puntadas y los pequeños acabados. Conversamos contigo para personalizar colores y detalles: queremos que cada creación tenga algo de ti.',
  purchase: 'Trabajamos principalmente bajo pedido. Para comenzar la elaboración se realiza un anticipo del 50% y el valor restante se paga al finalizar el producto.',
  socialLinks: [] as { label: string; url: string }[],
};
