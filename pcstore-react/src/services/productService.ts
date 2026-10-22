import { API_ENDPOINTS } from '../config/api';
import type {
  ProductResponse,
  PageResponseProductResponse,
  GetProductsParams,
} from '../types/adminProduct';
import type { Product, SpecItem } from '../types/product';
import type { ProductCardProps } from '../components/storePage/boxProductCategory/productCard';
import type { DealProductCardProps } from '../components/storePage/dealProduct/dealProductCard';

import cleanPcImg from '../assets/images/products/clean_pc.png';
import pcImg from '../assets/images/products/pc.jpg';
import rtxImg from '../assets/images/products/rtx.png';

export function getDefaultImageForProduct(product: Partial<ProductResponse>): string {
  const name = (product.name || '').toLowerCase();
  const type = (product.productType || '').toUpperCase();

  if (
    name.includes('vga') ||
    name.includes('rtx') ||
    name.includes('gtx') ||
    name.includes('gpu') ||
    name.includes('radeon') ||
    name.includes('card')
  ) {
    return rtxImg;
  }

  if (
    type === 'PC' ||
    name.includes('pc') ||
    name.includes('case') ||
    name.includes('máy tính') ||
    name.includes('workstation') ||
    name.includes('server')
  ) {
    return cleanPcImg;
  }

  return pcImg;
}

export function formatProductToCardProps(product: ProductResponse): ProductCardProps {
  const priceNum = product.price != null ? Number(product.price) : 0;
  const priceStr = priceNum > 0 ? `${priceNum.toLocaleString('vi-VN')}đ` : 'Liên hệ';
  const marketPriceNum = priceNum > 0 ? Math.round(priceNum * 1.15) : undefined;
  const marketPriceStr = marketPriceNum ? `${marketPriceNum.toLocaleString('vi-VN')}đ` : undefined;
  const discountStr = priceNum > 0 ? '-13%' : undefined;

  const firstUrl = product.imageUrl?.split(';')[0]?.trim();
  const image =
    firstUrl && !firstUrl.includes('example.com')
      ? firstUrl
      : getDefaultImageForProduct(product);

  const isHot = product.id % 2 === 0;
  const isNew = product.id % 2 === 1;

  return {
    id: product.id,
    title: product.name,
    image,
    price: priceStr,
    marketPrice: marketPriceStr,
    discountPercent: discountStr,
    badge: isHot ? 'HOT' : isNew ? 'NEW' : undefined,
    banner:
      product.id % 3 === 0
        ? { type: 'hot', title: 'BEST SELLER', badgeText: 'HOT' }
        : product.id % 3 === 1
          ? { type: 'sale', title: 'GIÁ SỐC', badgeText: 'GIÁ' }
          : undefined,
    promotion: 'Tặng bảo hành chính hãng VIP 1 đổi 1 tận nơi',
    inStock: product.status !== 'OUT_OF_STOCK',
    link: `/product/${product.id}`,
  };
}

export function formatProductToDealCardProps(product: ProductResponse): DealProductCardProps {
  const priceNum = product.price != null ? Number(product.price) : 0;
  const priceStr = priceNum > 0 ? `${priceNum.toLocaleString('vi-VN')}đ` : 'Liên hệ';
  const marketPriceNum = priceNum > 0 ? Math.round(priceNum * 1.2) : undefined;
  const marketPriceStr = marketPriceNum ? `${marketPriceNum.toLocaleString('vi-VN')}đ` : undefined;
  const discountStr = priceNum > 0 ? '-17%' : undefined;

  const firstUrl = product.imageUrl?.split(';')[0]?.trim();
  const image =
    firstUrl && !firstUrl.includes('example.com')
      ? firstUrl
      : getDefaultImageForProduct(product);

  const sold = ((product.id || 1) * 7) % 18 + 5;
  const total = sold + 7;

  return {
    id: product.id,
    title: product.name,
    image,
    price: priceStr,
    marketPrice: marketPriceStr,
    discountPercent: discountStr,
    sold,
    total,
    link: `/product/${product.id}`,
  };
}

export async function getProducts(params: GetProductsParams = {}): Promise<PageResponseProductResponse> {
  const query = new URLSearchParams();

  if (params.keyword && params.keyword.trim()) {
    query.set('keyword', params.keyword.trim());
  }
  if (params.status && params.status !== 'ALL') {
    query.set('status', String(params.status));
  }
  if (params.productType && params.productType !== 'ALL') {
    query.set('productType', String(params.productType));
  }
  if (params.brandId !== undefined && params.brandId !== '' && params.brandId !== 'ALL') {
    query.set('brandId', String(params.brandId));
  }
  if (params.categoryId !== undefined && params.categoryId !== '' && params.categoryId !== 'ALL') {
    query.set('categoryId', String(params.categoryId));
  }
  if (params.page !== undefined) {
    query.set('page', String(params.page));
  }
  if (params.size !== undefined) {
    query.set('size', String(params.size));
  }
  if (params.sort && params.sort.length > 0) {
    params.sort.forEach((s) => query.append('sort', s));
  }

  const queryString = query.toString();
  const url = `${API_ENDPOINTS.PRODUCTS.LIST}${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Lỗi tải danh sách sản phẩm (${response.status})`);
  }

  return response.json();
}

export async function getProductById(id: number | string): Promise<ProductResponse> {
  const response = await fetch(API_ENDPOINTS.PRODUCTS.DETAIL(id), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Không tìm thấy sản phẩm (${response.status})`);
  }

  return response.json();
}

export async function getProductBySlug(slug: string): Promise<ProductResponse> {
  const response = await fetch(API_ENDPOINTS.PRODUCTS.BY_SLUG(slug), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Không tìm thấy sản phẩm theo đường dẫn (${response.status})`);
  }

  return response.json();
}

export function generateBasicSpecs(productName: string): SpecItem[] {
  const specs: SpecItem[] = [];

  const cpuMatch = productName.match(/(Core\s+i[3579][^\s,]+|Ryzen\s+[3579][^\s,]+|i[3579]-\d{4,5}[A-Z]*)/i);
  if (cpuMatch) {
    specs.push({ key: 'CPU', name: cpuMatch[0], warranty: '36TH' });
  }

  const vgaMatch = productName.match(/(RTX\s*\d{3,4}[A-Za-z0-9\s]*|GTX\s*\d{3,4}[A-Za-z0-9\s]*|Radeon\s*RX\s*\d{4}[A-Za-z0-9\s]*)/i);
  if (vgaMatch) {
    specs.push({ key: 'VGA', name: vgaMatch[0], warranty: '36TH' });
  }

  const ramMatch = productName.match(/(\d+\s*GB\s*(?:DDR[45])?|RAM\s*\d+\s*GB)/i);
  if (ramMatch) {
    specs.push({ key: 'RAM', name: ramMatch[0], warranty: '36TH' });
  }

  if (specs.length === 0) {
    specs.push({
      key: 'Tình trạng',
      name: 'Mới 100% nguyên hộp chính hãng',
      warranty: 'Chính hãng',
    });
  }

  return specs;
}

export function parseSpecsTable(specStr?: string | null, productName: string = ''): SpecItem[] {
  if (!specStr || !specStr.trim()) {
    return generateBasicSpecs(productName);
  }

  const trimmed = specStr.trim();

  // 1. Try parsing JSON array or object
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => ({
          key: String(item.key || item.name || 'Thông số'),
          name: String(item.value || item.name || item.val || ''),
          warranty: item.warranty || '36TH',
        }));
      }
      if (typeof parsed === 'object') {
        return Object.entries(parsed).map(([key, val]) => ({
          key,
          name: String(val),
          warranty: '36TH',
        }));
      }
    } catch {
      // not valid json, fall back to plain text parsing
    }
  }

  // 2. Try splitting by semicolon or newline
  const parts = trimmed.split(/[;\n\r]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    const items: SpecItem[] = [];
    for (const part of parts) {
      if (part.includes(':')) {
        const [k, ...rest] = part.split(':');
        items.push({
          key: k.trim(),
          name: rest.join(':').trim(),
          warranty: '36TH',
        });
      } else {
        items.push({
          key: 'Thông số',
          name: part,
          warranty: '36TH',
        });
      }
    }
    return items;
  }

  // 3. Single string with colon
  if (trimmed.includes(':')) {
    const [k, ...rest] = trimmed.split(':');
    return [
      {
        key: k.trim(),
        name: rest.join(':').trim(),
        warranty: '36TH',
      },
    ];
  }

  return [
    {
      key: 'Thông số kỹ thuật',
      name: trimmed,
      warranty: 'Bảo hành chính hãng',
    },
  ];
}

export function formatProductToDetail(
  product: ProductResponse,
  categoryName?: string,
  brandName?: string
): Product {
  const priceNum = product.price != null ? Number(product.price) : 0;
  const priceStr = priceNum > 0 ? `${priceNum.toLocaleString('vi-VN')}đ` : 'Liên hệ';
  const marketPriceNum = priceNum > 0 ? Math.round(priceNum * 1.15) : undefined;
  const marketPriceStr = marketPriceNum ? `${marketPriceNum.toLocaleString('vi-VN')}đ` : undefined;
  const discountPercent = priceNum > 0 ? '-13%' : undefined;
  const installmentPrice =
    priceNum > 0 ? `${Math.round(priceNum / 12).toLocaleString('vi-VN')}đ / tháng` : undefined;

  const rawUrls = (product.imageUrl || '')
    .split(/[;,\n]/)
    .map((s) => s.trim())
    .filter((s) => Boolean(s) && !s.includes('example.com'));

  const defaultImg = getDefaultImageForProduct(product);
  const images = rawUrls.length > 0 ? rawUrls : [defaultImg];

  const inStock = product.status !== 'OUT_OF_STOCK' && product.status !== 'INACTIVE';
  const stockQuantity = inStock ? 15 : 0;

  const idNum = Number(product.id) || 1;
  const rating = 5.0;
  const reviewCount = ((idNum * 7) % 25) + 6;
  const viewCount = ((idNum * 183) % 15000) + 1500;
  const commentCount = ((idNum * 3) % 12) + 2;
  const purchaseCount = ((idNum * 5) % 35) + 5;

  const specsTable = parseSpecsTable(product.specification, product.name);

  const cpuSpec = specsTable.find((s) => s.key.toUpperCase().includes('CPU'))?.name;
  const vgaSpec = specsTable.find((s) =>
    s.key.toUpperCase().includes('VGA') ||
    s.key.toUpperCase().includes('CARD') ||
    s.key.toUpperCase().includes('GPU')
  )?.name;
  const ramSpec = specsTable.find((s) => s.key.toUpperCase().includes('RAM'))?.name;

  const cpuMatch = product.name.match(/(Core\s+i[3579][^\s,]+|Ryzen\s+[3579][^\s,]+|i[3579]-\d{4,5}[A-Z]*)/i);
  const vgaMatch = product.name.match(/(RTX\s*\d{3,4}[A-Za-z0-9\s]*|GTX\s*\d{3,4}[A-Za-z0-9\s]*|Radeon\s*RX\s*\d{4}[A-Za-z0-9\s]*)/i);
  const ramMatch = product.name.match(/(\d+\s*GB\s*(?:DDR[45])?|RAM\s*\d+\s*GB)/i);

  const quickSpecs = {
    cpu: cpuSpec || cpuMatch?.[0],
    vga: vgaSpec || vgaMatch?.[0],
    ram: ramSpec || ramMatch?.[0],
  };

  const hasQuickSpecs = Boolean(quickSpecs.cpu || quickSpecs.vga || quickSpecs.ram);

  const descriptionHtml = product.description && product.description.trim()
    ? /<[a-z][\s\S]*>/i.test(product.description)
      ? product.description
      : `<div class="space-y-4 text-gray-700 text-sm leading-relaxed">
          <h3 class="text-base font-bold text-gray-900">${product.name}</h3>
          ${product.description
            .split(/\n+/)
            .filter(Boolean)
            .map((p) => `<p>${p}</p>`)
            .join('')}
        </div>`
    : `<div class="space-y-4 text-gray-700 text-sm leading-relaxed">
        <h3 class="text-base font-bold text-gray-900">${product.name}</h3>
        <p>Sản phẩm chính hãng với hiệu năng cao, linh kiện cao cấp và khả năng tương thích tuyệt vời.</p>
        <p>Được kiểm định chất lượng nghiêm ngặt bởi đội ngũ kỹ thuật viên PC Store.</p>
      </div>`;

  return {
    id: String(product.id),
    title: product.name,
    images,
    thumbnails: images,
    price: priceStr,
    numericPrice: priceNum,
    marketPrice: marketPriceStr,
    installmentPrice,
    discountPercent,
    badge: product.id % 2 === 0 ? 'HOT' : 'NEW',
    inStock,
    stockQuantity,
    warrantyInfo:
      product.productType === 'PC'
        ? 'Bảo hành 36 tháng theo linh kiện'
        : product.productType === 'LAPTOP'
        ? 'Bảo hành 24 tháng chính hãng'
        : 'Bảo hành chính hãng 36 tháng',
    rating,
    reviewCount,
    viewCount,
    commentCount,
    purchaseCount,
    flashSale: {
      hours: 18,
      minutes: 24,
      seconds: 50,
    },
    promotions: [
      'Bảo hành chính hãng VIP 1 đổi 1 tận nơi trong 30 ngày đầu tiên nếu có lỗi kỹ thuật.',
      'Miễn phí vận chuyển và giao hàng toàn quốc.',
      'Tặng kèm voucher giảm giá 500.000đ áp dụng cho lần mua tiếp theo.',
      'Hỗ trợ cài đặt phần mềm và vệ sinh linh kiện trọn đời miễn phí.',
    ],
    quickSpecs: hasQuickSpecs ? quickSpecs : undefined,
    specsTable,
    descriptionHtml,
    category: product.slug || 'san-pham',
    categoryName:
      categoryName ||
      (product.productType === 'PC'
        ? 'PC GAMING'
        : product.productType === 'LAPTOP'
        ? 'LAPTOP'
        : 'LINH KIỆN'),
    brand: brandName || 'Chính hãng',
  };
}

export const productService = {
  getProducts,
  getProductById,
  getProductBySlug,
  formatProductToCardProps,
  formatProductToDealCardProps,
  formatProductToDetail,
  parseSpecsTable,
  getDefaultImageForProduct,
};

export default productService;
