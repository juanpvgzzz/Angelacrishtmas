import type { Product } from '../types/catalog';

const image = (name: string, alt: string) => ({ kind: 'placeholder' as const, src: `/images/placeholders/${name}.svg`, alt: `Ilustración de demostración: ${alt}`, width: 600, height: 720 });

export const products: Product[] = [
  {
    id: 'santa-classic', name: 'Papá Noel de Navidad', slug: 'papa-noel-de-navidad', categoryId: 'dolls',
    shortDescription: 'Un personaje lleno de ternura y tradición.',
    description: 'Papá Noel decorativo en tela, con gorro rojo y detalles cosidos a mano. Una pieza para acompañar el árbol, decorar una repisa o convertirse en un regalo especial. El acabado y las medidas se acuerdan al realizar el pedido.',
    basePrice: 85000, priceFrom: true, images: [image('santa', 'Papá Noel de tela en rojo y blanco'), image('santa-detail', 'detalle ilustrado del gorro y las puntadas de Papá Noel')], availability: 'under-order', productionTime: 'De 7 a 10 días hábiles',
    customizationOptions: ['Nombre bordado', 'Tamaño a convenir', 'Detalles de la vestimenta'], featured: true, active: true, order: 1, createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'wreath-home', name: 'Corona Dulce Bienvenida', slug: 'corona-dulce-bienvenida', categoryId: 'wreaths',
    shortDescription: 'La magia comienza desde la puerta.',
    description: 'Corona decorativa con piezas textiles, lazo rojo y pequeños detalles artesanales. Pensada para puertas interiores o espacios protegidos. Podemos conversar sobre el tamaño y los detalles que mejor acompañan tu hogar.',
    basePrice: 120000, priceFrom: true, images: [image('wreath', 'corona roja con lazo y detalles blancos')], availability: 'under-order', productionTime: 'De 8 a 12 días hábiles',
    customizationOptions: ['Inicial de la familia', 'Diámetro a convenir', 'Mensaje de bienvenida'], featured: true, active: true, order: 2, createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'angel-star', name: 'Angelito de los Deseos', slug: 'angelito-de-los-deseos', categoryId: 'ornaments',
    shortDescription: 'Un pequeño deseo en cada rama.',
    description: 'Ángel de tela para colgar en el árbol o acompañar un regalo. Sus alas blancas y su vestido rojo evocan la sencillez de una Navidad en familia. Cada detalle se termina a mano, por lo que las piezas pueden presentar pequeñas variaciones.',
    basePrice: 28000, priceFrom: false, images: [image('angel', 'ángel artesanal con alas blancas y vestido rojo')], availability: 'available', productionTime: 'Consultar tiempo de entrega',
    customizationOptions: ['Inicial bordada', 'Presentación para regalo'], featured: true, active: true, order: 3, createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'table-magic', name: 'Centro de mesa Nochebuena', slug: 'centro-de-mesa-nochebuena', categoryId: 'centerpieces',
    shortDescription: 'Un detalle para compartir y celebrar.',
    description: 'Composición decorativa con flores textiles y velas ornamentales, ideal para una mesa navideña. Las velas de esta propuesta son decorativas y no deben encenderse. El diseño final se acuerda según el espacio disponible.',
    basePrice: 95000, priceFrom: true, images: [image('table', 'centro de mesa rojo y blanco con velas ornamentales')], availability: 'under-order', productionTime: 'De 7 a 10 días hábiles',
    customizationOptions: ['Largo de la composición', 'Cantidad de flores textiles'], featured: true, active: true, order: 4, createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'star-wish', name: 'Estrella de los Sueños', slug: 'estrella-de-los-suenos', categoryId: 'ornaments',
    shortDescription: 'Puntadas que guardan buenos deseos.',
    description: 'Estrella acolchada de tela roja, terminada con puntadas visibles y una cinta para colgar. Un detalle ligero para decorar el árbol o personalizar los regalos de la familia.',
    basePrice: 18000, priceFrom: false, images: [image('star', 'estrella acolchada roja con costuras blancas')], availability: 'under-order', productionTime: 'De 4 a 6 días hábiles',
    customizationOptions: ['Inicial bordada', 'Tamaño a convenir'], featured: false, active: true, order: 5, createdAt: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'gnome-snow', name: 'Gnomo Copito', slug: 'gnomo-copito', categoryId: 'dolls',
    shortDescription: 'Un compañero para tus rincones favoritos.',
    description: 'Gnomo decorativo con gorro alto y barba blanca, elaborado en tela. Esta propuesta no está disponible en este momento; puedes consultarnos por alternativas o por una futura elaboración.',
    basePrice: 65000, priceFrom: false, images: [image('gnome', 'gnomo de tela con gorro rojo y barba blanca')], availability: 'unavailable', productionTime: 'Por confirmar al retomar su elaboración',
    customizationOptions: ['Tamaño a convenir'], featured: false, active: true, order: 6, createdAt: '2026-09-01T00:00:00.000Z',
  },
];
