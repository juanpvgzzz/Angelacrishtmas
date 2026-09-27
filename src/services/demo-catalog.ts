import type { CatalogRepository, Category, Product } from '../types/catalog.ts';

/** Solo expone productos activos pertenecientes a categorías activas. */
export function createDemoCatalog(categories: Category[], products: Product[]): CatalogRepository {
  const visibleCategories = () => categories.filter((category) => category.active).sort((a, b) => a.order - b.order);
  const visibleProducts = () => {
    const categoryIds = new Set(visibleCategories().map((category) => category.id));
    return products.filter((product) => product.active && categoryIds.has(product.categoryId)).sort((a, b) => a.order - b.order);
  };
  return {
    async getCategories() { return visibleCategories(); },
    async getProducts(categoryId) { return visibleProducts().filter((product) => !categoryId || product.categoryId === categoryId); },
    async getCategoryBySlug(slug) { return visibleCategories().find((category) => category.slug === slug); },
    async getProductBySlug(slug) { return visibleProducts().find((product) => product.slug === slug); },
  };
}
