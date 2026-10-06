import { BUILDER_PRODUCTS, type BuilderProduct } from '../data/builderProducts';

export async function fetchApiBuilderProducts(): Promise<BuilderProduct[]> {
  // Return static BUILDER_PRODUCTS directly without calling backend API
  return BUILDER_PRODUCTS;
}
