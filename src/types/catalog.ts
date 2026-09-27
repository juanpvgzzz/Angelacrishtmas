export interface CatalogImage {
  /** Permite sustituir las ilustraciones por fotografías sin cambiar componentes. */
  kind: 'placeholder' | 'photo';
  src: string;
  alt: string;
  width: number;
  height: number;
  path?: string;
}

export type Availability = 'under-order' | 'available' | 'unavailable';

export interface Category {
  section?: import('../config/sections').CatalogSection;
  id: string;
  name: string;
  slug: string;
  image: CatalogImage;
  description: string;
  order: number;
  active: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  basePrice: number | null;
  priceFrom: boolean;
  customizable?: boolean;
  currency?: 'COP';
  images: CatalogImage[];
  availability: Availability;
  productionTime: string;
  customizationOptions: string[];
  featured: boolean;
  active: boolean;
  order: number;
  /** Fecha ISO 8601. */
  createdAt: string;
}

export interface CatalogRepository {
  getCategories(): Promise<Category[]>;
  getProducts(categoryId?: string): Promise<Product[]>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
}
