export interface SpecItem {
  key: string; // e.g. "CPU", "VGA", "RAM", "SSD", "MAINBOARD", "PSU", "CASE", "TẢN NHIỆT", "FAN"
  name: string; // e.g. "CPU Intel Core i5-12400F"
  warranty?: string; // e.g. "36 Tháng"
  productId?: string; // e.g. "12" or "cpu-12400f"
  highlightSummary?: string;
}

export interface Product {
  id: string;
  title: string;
  images: string[];
  thumbnails?: string[];
  price: string; // e.g. "136.000.000đ"
  numericPrice: number;
  marketPrice?: string;
  installmentPrice?: string; // e.g. "11.666.533 / tháng"
  discountPercent?: string;
  badge?: "HOT" | "NEW" | string;
  inStock: boolean;
  stockQuantity?: number; // Tồn kho thực tế (mặc định 10 nếu không khai báo)
  warrantyInfo: string; // e.g. "Bảo hành theo từng linh kiện"

  rating: number; // e.g. 0.0 or 5.0
  reviewCount: number;
  viewCount: number;
  commentCount: number;
  purchaseCount: number;
  flashSale?: {
    endTime?: string;
    hours: number;
    minutes: number;
    seconds: number;
  };
  promotions: string[];
  quickSpecs?: Record<string, string | undefined>;
  specsTable: SpecItem[];
  descriptionHtml?: string;
  category?: string;
  categoryName?: string;
  brand?: string;
}

export type ProductDetailType = Product;
