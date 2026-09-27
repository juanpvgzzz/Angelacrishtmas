import { categories } from '../data/categories';
import { products } from '../data/products';
import { createDemoCatalog } from './demo-catalog';

// Respaldo de desarrollo e importación manual. No usar para el catálogo público.
export const catalog = createDemoCatalog(categories, products);
