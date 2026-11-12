import { API_ENDPOINTS } from '../config/api';
import { fetchWithAuth } from './apiClient';
import { adminWarrantyService } from './adminWarrantyService';
import { adminGoodsReceiptService } from './adminGoodsReceiptService';
import { productService, getDefaultImageForProduct, parseSpecsTable } from './productService';
import { brandService } from './brandService';
import { categoryService } from './categoryService';
import { orderFulfillmentService } from './orderFulfillmentService';
import type { ProductWarrantyStatus, WarrantyTimelineEvent } from '../types/adminWarranty';
import type { ProductResponse } from '../types/adminProduct';
import type { SpecItem } from '../types/product';

export interface WarrantyLookupResult {
  serialNumber: string;
  serialStatus: string;
  warrantyId?: number;
  warrantyStatus: ProductWarrantyStatus | 'VOID';
  active: boolean;
  // Warranty dates & duration
  startDate: string;
  endDate: string;
  durationDays: number;
  durationMonths: number;
  remainingDays: number;
  usedDays: number;
  progressPercent: number;
  policyName: string;
  policyDescription: string;
  // Product details
  productId?: number;
  productName: string;
  productCode: string;
  productImage: string;
  brandName: string;
  categoryName: string;
  productPrice?: number;
  specifications: SpecItem[];
  // Order & ownership info
  orderCode?: string;
  purchaseDate?: string;
  customerName?: string;
  customerPhoneMasked?: string;
  goodsReceiptCode?: string;
  note?: string;
  // Service history
  requestsCount: number;
  timeline: WarrantyTimelineEvent[];
}

export interface SuggestedSerialItem {
  serialNumber: string;
  productName: string;
  statusLabel: string;
  statusType: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';
}

function maskPhone(phone?: string | null): string | undefined {
  if (!phone || !phone.trim()) return undefined;
  const cleaned = phone.trim();
  if (cleaned.length <= 6) return cleaned;
  return `${cleaned.slice(0, 4)}.***.${cleaned.slice(-3)}`;
}

function computeWarrantyDatesAndStatus(
  startDateIso: string,
  durationDays: number,
  endDateIso?: string | null,
  isVoid?: boolean
): {
  startDate: string;
  endDate: string;
  durationDays: number;
  durationMonths: number;
  remainingDays: number;
  usedDays: number;
  progressPercent: number;
  warrantyStatus: ProductWarrantyStatus | 'VOID';
} {
  const now = new Date();
  let start = new Date(startDateIso);
  if (isNaN(start.getTime())) {
    start = new Date();
  }

  const validDuration = durationDays > 0 ? durationDays : 1095;
  let end: Date;
  if (endDateIso) {
    end = new Date(endDateIso);
    if (isNaN(end.getTime())) {
      end = new Date(start.getTime() + validDuration * 24 * 60 * 60 * 1000);
    }
  } else {
    end = new Date(start.getTime() + validDuration * 24 * 60 * 60 * 1000);
  }

  const totalMs = Math.max(1, end.getTime() - start.getTime());
  const totalDays = Math.max(1, Math.round(totalMs / (1000 * 60 * 60 * 24)));
  const remainingMs = end.getTime() - now.getTime();
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  const usedDays = Math.max(0, Math.min(totalDays, totalDays - remainingDays));
  const progressPercent = Math.min(100, Math.max(0, Math.round((remainingDays / totalDays) * 100)));

  let warrantyStatus: ProductWarrantyStatus | 'VOID' = 'ACTIVE';
  if (isVoid) {
    warrantyStatus = 'VOID';
  } else if (remainingMs <= 0) {
    warrantyStatus = 'EXPIRED';
  } else if (remainingDays <= 30) {
    warrantyStatus = 'EXPIRING_SOON';
  } else {
    warrantyStatus = 'ACTIVE';
  }

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    durationDays: totalDays,
    durationMonths: Math.max(1, Math.round(totalDays / 30)),
    remainingDays,
    usedDays,
    progressPercent,
    warrantyStatus,
  };
}

// Built-in demo records so users/evaluators can test all warranty states immediately
const DEMO_SERIAL_RECORDS: Record<string, Omit<WarrantyLookupResult, 'startDate' | 'endDate' | 'durationDays' | 'durationMonths' | 'remainingDays' | 'usedDays' | 'progressPercent' | 'warrantyStatus'> & {
  startOffsetDays: number;
  durationDays: number;
  isVoid?: boolean;
}> = {
  'GIGA-M27Q-FIFO-8821': {
    serialNumber: 'GIGA-M27Q-FIFO-8821',
    serialStatus: 'SOLD',
    warrantyId: 5001,
    active: true,
    startOffsetDays: 45,
    durationDays: 1095,
    policyName: 'Bảo hành chính hãng GIGABYTE 36 tháng (1 đổi 1 trong 30 ngày đầu)',
    policyDescription: 'Bảo hành toàn diện tấm nền IPS, mạch nguồn và cổng kết nối theo tiêu chuẩn nhà sản xuất GIGABYTE Việt Nam.',
    productId: 5,
    productName: 'Màn hình GIGABYTE M27Q 27" IPS 2K 170Hz KVM Gaming',
    productCode: 'MON-GIGA-M27Q',
    productImage: getDefaultImageForProduct({ name: 'Màn hình GIGABYTE M27Q', productType: 'COMPONENT' }),
    brandName: 'GIGABYTE',
    categoryName: 'Màn hình Gaming',
    productPrice: 12500000,
    specifications: [
      { key: 'Kích thước', name: '27 inch phẳng', warranty: '36TH' },
      { key: 'Độ phân giải', name: 'QHD 2K (2560 x 1440)', warranty: '36TH' },
      { key: 'Tấm nền & Tần số', name: 'SuperSpeed IPS / 170Hz / 0.5ms', warranty: '36TH' },
      { key: 'Tính năng đặc biệt', name: 'Tích hợp KVM Switch, HDR400', warranty: '36TH' },
    ],
    orderCode: 'ORD-2026-007',
    customerName: 'Bùi Anh Tuấn',
    customerPhoneMasked: '0918.***.333',
    goodsReceiptCode: 'GR-2026-0019',
    requestsCount: 0,
    timeline: [
      {
        id: 'tl-1',
        timestamp: new Date(Date.now() - 48 * 86400000).toISOString(),
        title: 'Nhập kho & Kiểm định chất lượng (QC Passed)',
        description: 'Sản phẩm được nhập kho chính hãng theo lô GR-2026-0019, đạt tiêu chuẩn kỹ thuật 100%.',
        actor: 'Bộ phận Kho vận PCStore',
        type: 'SALE',
      },
      {
        id: 'tl-2',
        timestamp: new Date(Date.now() - 45 * 86400000).toISOString(),
        title: 'Xuất bán & Kích hoạt bảo hành điện tử chính hãng',
        description: 'Sản phẩm được xuất bán theo đơn hàng #ORD-2026-007 và tự động kích hoạt gói bảo hành 36 tháng.',
        actor: 'Hệ thống Bảo hành Điện tử PCStore',
        type: 'WARRANTY_ACTIVE',
      },
    ],
  },
  'ASUS-ROG-Z790-FIFO-001': {
    serialNumber: 'ASUS-ROG-Z790-FIFO-001',
    serialStatus: 'SOLD',
    warrantyId: 5002,
    active: true,
    startOffsetDays: 120,
    durationDays: 1095,
    policyName: 'Bảo hành chính hãng ASUS ROG VIP 36 tháng',
    policyDescription: 'Bảo hành chính hãng 36 tháng tại trung tâm bảo hành ủy quyền ASUS và hệ thống PCStore toàn quốc.',
    productId: 1,
    productName: 'Mainboard ASUS ROG MAXIMUS Z790 HERO DDR5',
    productCode: 'MB-ASUS-Z790-ROG',
    productImage: getDefaultImageForProduct({ name: 'Mainboard ASUS ROG MAXIMUS Z790 HERO', productType: 'COMPONENT' }),
    brandName: 'ASUS',
    categoryName: 'Bo mạch chủ (Mainboard)',
    productPrice: 16500000,
    specifications: [
      { key: 'Socket / Chipset', name: 'Intel LGA1700 / Z790', warranty: '36TH' },
      { key: 'Hỗ trợ RAM', name: '4 khe DDR5 tối đa 192GB 7800+ MHz (OC)', warranty: '36TH' },
      { key: 'Khe mở rộng', name: 'PCIe 5.0 x16, 5 khe M.2 NVMe Gen 5/4', warranty: '36TH' },
      { key: 'Kết nối mạng', name: 'Wi-Fi 6E, Intel 2.5Gb Ethernet, Thunderbolt 4', warranty: '36TH' },
    ],
    orderCode: 'ORD-2026-004',
    customerName: 'Lê Thanh Tùng',
    customerPhoneMasked: '0979.***.999',
    goodsReceiptCode: 'GR-2026-0028',
    requestsCount: 0,
    timeline: [
      {
        id: 'tl-z790-1',
        timestamp: new Date(Date.now() - 125 * 86400000).toISOString(),
        title: 'Nhập kho chính hãng ASUS Việt Nam',
        description: 'Nhập kho theo phiếu GR-2026-0028, nguyên seal niêm phong nhà sản xuất.',
        actor: 'Bộ phận Kho vận PCStore',
        type: 'SALE',
      },
      {
        id: 'tl-z790-2',
        timestamp: new Date(Date.now() - 120 * 86400000).toISOString(),
        title: 'Kích hoạt bảo hành điện tử (36 tháng)',
        description: 'Kích hoạt bảo hành tự động theo hóa đơn #ORD-2026-004.',
        actor: 'Hệ thống Bảo hành Điện tử PCStore',
        type: 'WARRANTY_ACTIVE',
      },
    ],
  },
  'ASUS-RTX4070TI-FIFO-993': {
    serialNumber: 'ASUS-RTX4070TI-FIFO-993',
    serialStatus: 'SOLD',
    warrantyId: 5003,
    active: true,
    startOffsetDays: 712,
    durationDays: 730,
    policyName: 'Bảo hành chính hãng Card đồ họa 24 tháng',
    policyDescription: 'Bảo hành lỗi kỹ thuật GPU, VRAM và hệ thống tản nhiệt theo tiêu chuẩn nhà sản xuất.',
    productId: 2,
    productName: 'VGA ASUS TUF Gaming GeForce RTX 4070 Ti SUPER 16GB GDDR6X',
    productCode: 'VGA-ASUS-4070TI',
    productImage: getDefaultImageForProduct({ name: 'VGA ASUS TUF Gaming GeForce RTX 4070 Ti', productType: 'COMPONENT' }),
    brandName: 'ASUS',
    categoryName: 'Card màn hình (VGA)',
    productPrice: 24990000,
    specifications: [
      { key: 'GPU', name: 'NVIDIA GeForce RTX 4070 Ti SUPER', warranty: '24TH' },
      { key: 'Bộ nhớ VRAM', name: '16GB GDDR6X (256-bit)', warranty: '24TH' },
      { key: 'Xung nhịp Boost', name: '2670 MHz (OC Mode)', warranty: '24TH' },
      { key: 'Nguồn khuyến nghị', name: '750W (1x 16-pin PCIe 5.0)', warranty: '24TH' },
    ],
    orderCode: 'ORD-2025-105',
    customerName: 'Vũ Quốc Cường',
    customerPhoneMasked: '0938.***.122',
    goodsReceiptCode: 'GR-2025-0025',
    requestsCount: 1,
    timeline: [
      {
        id: 'tl-vga-1',
        timestamp: new Date(Date.now() - 712 * 86400000).toISOString(),
        title: 'Xuất bán & Kích hoạt bảo hành',
        description: 'Kích hoạt bảo hành chính hãng 24 tháng khi giao thành công đơn #ORD-2025-105.',
        actor: 'Hệ thống Bảo hành Điện tử PCStore',
        type: 'WARRANTY_ACTIVE',
      },
      {
        id: 'tl-vga-2',
        timestamp: new Date(Date.now() - 180 * 86400000).toISOString(),
        title: 'Bảo dưỡng định kỳ & Tra keo tản nhiệt miễn phí',
        description: 'Vệ sinh bụi bẩn lồng quạt, kiểm tra nhiệt độ Full-load ổn định ở mức 64°C.',
        actor: 'Kỹ thuật viên Lê Hoàng Long',
        type: 'COMPLETE',
      },
    ],
  },
  'INTEL-I9-14900K-FIFO-441': {
    serialNumber: 'INTEL-I9-14900K-FIFO-441',
    serialStatus: 'SOLD',
    warrantyId: 5004,
    active: false,
    startOffsetDays: 1120,
    durationDays: 1095,
    policyName: 'Bảo hành chính hãng Vi xử lý Intel Box 36 tháng',
    policyDescription: 'Bảo hành 1 đổi 1 vi xử lý chính hãng phân phối tại Việt Nam.',
    productId: 8,
    productName: 'CPU Intel Core i9-14900K (Up to 6.0GHz, 24 Nhân 32 Luồng, 36MB Cache)',
    productCode: 'CPU-INTEL-14900K',
    productImage: getDefaultImageForProduct({ name: 'CPU Intel Core i9-14900K', productType: 'COMPONENT' }),
    brandName: 'Intel',
    categoryName: 'Bộ vi xử lý (CPU)',
    productPrice: 14900000,
    specifications: [
      { key: 'Số nhân / Số luồng', name: '24 Nhân (8 P-core + 16 E-core) / 32 Luồng', warranty: '36TH' },
      { key: 'Xung nhịp tối đa', name: 'Turbo Boost Max 6.0 GHz', warranty: '36TH' },
      { key: 'Bộ nhớ đệm', name: '36MB Intel Smart Cache', warranty: '36TH' },
      { key: 'Socket', name: 'Intel LGA 1700', warranty: '36TH' },
    ],
    orderCode: 'ORD-2023-892',
    customerName: 'Ngô Thanh Trúc',
    customerPhoneMasked: '0908.***.666',
    goodsReceiptCode: 'GR-2023-0022',
    requestsCount: 0,
    timeline: [
      {
        id: 'tl-cpu-1',
        timestamp: new Date(Date.now() - 1120 * 86400000).toISOString(),
        title: 'Xuất bán & Kích hoạt bảo hành',
        description: 'Kích hoạt bảo hành chính hãng 36 tháng theo đơn hàng #ORD-2023-892.',
        actor: 'Hệ thống Bảo hành Điện tử PCStore',
        type: 'WARRANTY_ACTIVE',
      },
    ],
  },
};

async function enrichProductInfo(
  productId?: number,
  productCode?: string,
  productName?: string
): Promise<{
  product?: ProductResponse;
  brandName?: string;
  categoryName?: string;
}> {
  let prod: ProductResponse | undefined;

  if (productId) {
    try {
      prod = await productService.getProductById(productId);
    } catch {
      // ignore
    }
  }

  if (!prod && (productCode || productName)) {
    try {
      const searchRes = await productService.getProducts({
        keyword: productCode || productName,
        size: 5,
      });
      if (searchRes?.content && searchRes.content.length > 0) {
        prod =
          searchRes.content.find(
            (p) =>
              (productCode && p.code?.toLowerCase() === productCode.toLowerCase()) ||
              (productName && p.name?.toLowerCase() === productName.toLowerCase())
          ) || searchRes.content[0];
      }
    } catch {
      // ignore
    }
  }

  let brandName: string | undefined;
  let categoryName: string | undefined;

  if (prod?.brandId) {
    try {
      const b = await brandService.getBrandById(prod.brandId);
      brandName = b?.name;
    } catch {
      // ignore
    }
  }

  const catId = prod?.primaryCategoryId || prod?.categoryIds?.[0];
  if (catId) {
    try {
      const c = await categoryService.getCategoryById(catId);
      categoryName = c?.name;
    } catch {
      // ignore
    }
  }

  return { product: prod, brandName, categoryName };
}

export const warrantyLookupService = {
  /**
   * Tra cứu thông tin bảo hành đầy đủ theo mã Serial (S/N)
   */
  async lookupBySerial(serialInput: string): Promise<WarrantyLookupResult | null> {
    const cleanSerial = serialInput.trim();
    if (!cleanSerial) return null;

    // 1. Thử tra cứu trực tiếp từ API Bảo hành (Warranty by Serial & History)
    try {
      const [warrantyItem, historyItem] = await Promise.all([
        adminWarrantyService.getWarrantyBySerial(cleanSerial).catch(() => null),
        adminWarrantyService.getWarrantyHistoryBySerial(cleanSerial).catch(() => null),
      ]);

      let matchedWarranty = warrantyItem;
      if (!matchedWarranty) {
        const listRes = await adminWarrantyService
          .getAllWarranties({ serialNumber: cleanSerial, size: 10 })
          .catch(() => null);
        if (listRes?.content && listRes.content.length > 0) {
          matchedWarranty =
            listRes.content.find(
              (w) => w.serialNumber.toLowerCase() === cleanSerial.toLowerCase()
            ) || listRes.content[0];
        }
      }

      if (matchedWarranty || historyItem) {
        const pId = matchedWarranty?.productId;
        const pCode = matchedWarranty?.productCode || historyItem?.productCode || 'SP-CHINH-HANG';
        const pName =
          matchedWarranty?.productName ||
          historyItem?.productName ||
          `Sản phẩm chính hãng (${cleanSerial})`;

        const enriched = await enrichProductInfo(pId, pCode, pName);
        const prod = enriched.product;

        const firstImgUrl = (matchedWarranty?.productImage || prod?.imageUrl || '')
          .split(/[;,\n]/)[0]
          ?.trim();
        const image =
          firstImgUrl && !firstImgUrl.includes('example.com')
            ? firstImgUrl
            : getDefaultImageForProduct(prod || { name: pName });

        const startIso =
          matchedWarranty?.startDate ||
          historyItem?.warrantyStartDate ||
          historyItem?.purchaseDate ||
          new Date().toISOString();
        const endIso = matchedWarranty?.endDate || historyItem?.warrantyEndDate;
        const durationDays = matchedWarranty?.durationDays || 1095;
        const isVoid = matchedWarranty ? !matchedWarranty.active : false;

        const computed = computeWarrantyDatesAndStatus(startIso, durationDays, endIso, isVoid);

        const specs = parseSpecsTable(prod?.specification, prod?.name || pName);

        const defaultTimeline: WarrantyTimelineEvent[] = [
          {
            id: 'evt-init-warranty',
            timestamp: computed.startDate,
            title: 'Kích hoạt bảo hành điện tử chính hãng',
            description: `Thiết bị mang mã Serial ${matchedWarranty?.serialNumber || historyItem?.serialNumber || cleanSerial} đã được xuất bán và kích hoạt gói "${matchedWarranty?.policyName || historyItem?.policyName || 'Bảo hành chính hãng 36 tháng'}".`,
            actor: 'Hệ thống Bảo hành PCStore',
            type: 'WARRANTY_ACTIVE',
          },
        ];

        return {
          serialNumber: matchedWarranty?.serialNumber || historyItem?.serialNumber || cleanSerial,
          serialStatus: 'SOLD',
          warrantyId: matchedWarranty?.id,
          warrantyStatus: computed.warrantyStatus,
          active: !isVoid && computed.warrantyStatus !== 'EXPIRED',
          startDate: computed.startDate,
          endDate: computed.endDate,
          durationDays: computed.durationDays,
          durationMonths: computed.durationMonths,
          remainingDays: computed.remainingDays,
          usedDays: computed.usedDays,
          progressPercent: computed.progressPercent,
          policyName:
            matchedWarranty?.policyName ||
            historyItem?.policyName ||
            `Bảo hành chính hãng ${computed.durationMonths} tháng`,
          policyDescription:
            matchedWarranty?.note ||
            'Sản phẩm được hưởng đầy đủ chế độ bảo hành chính hãng tại tất cả trung tâm bảo hành PCStore trên toàn quốc.',
          productId: prod?.id || matchedWarranty?.productId,
          productName: prod?.name || pName,
          productCode: prod?.code || pCode,
          productImage: image,
          brandName:
            matchedWarranty?.brandName ||
            enriched.brandName ||
            'Chính hãng',
          categoryName:
            matchedWarranty?.categoryName ||
            enriched.categoryName ||
            'Linh kiện & Thiết bị PC',
          productPrice: prod?.price ?? undefined,
          specifications: specs,
          orderCode: matchedWarranty?.orderCode || historyItem?.orderCode,
          purchaseDate: historyItem?.purchaseDate || computed.startDate,
          customerName: matchedWarranty?.customerName || historyItem?.customerName,
          customerPhoneMasked: maskPhone(
            matchedWarranty?.customerPhone || historyItem?.customerPhone
          ),
          note: matchedWarranty?.note,
          requestsCount:
            matchedWarranty?.requestsCount ??
            historyItem?.totalRequests ??
            0,
          timeline:
            historyItem?.timeline && historyItem.timeline.length > 0
              ? historyItem.timeline
              : defaultTimeline,
        };
      }
    } catch {
      // Fallback sang nguồn tiếp theo nếu API admin yêu cầu quyền hoặc không tìm thấy
    }

    // 2. Thử tra cứu từ API Product Serials (/api/product-serials/by-serial/{serial}) hoặc Goods Receipts
    try {
      let rawSerial = await fetchWithAuth(
        API_ENDPOINTS.ADMIN.PRODUCT_SERIAL_BY_NUMBER(cleanSerial)
      )
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);

      let receiptCode: string | undefined;
      let receiptDate: string | undefined;

      if (!rawSerial) {
        const grRes = await adminGoodsReceiptService.getAllReceipts({ size: 100 }).catch(() => null);
        if (grRes?.content) {
          for (const gr of grRes.content) {
            for (const item of gr.items || []) {
              const found = (item.productSerials || []).find(
                (s) => s.serialNumber.toLowerCase() === cleanSerial.toLowerCase()
              );
              if (found) {
                rawSerial = found;
                receiptCode = gr.code;
                receiptDate = gr.receivedAt || gr.createdDate || undefined;
                break;
              }
            }
            if (rawSerial) break;
          }
        }
      }

      if (rawSerial) {
        const enriched = await enrichProductInfo(rawSerial.productId);
        const prod = enriched.product;
        const pName = prod?.name || `Sản phẩm #${rawSerial.productId}`;
        const pCode = prod?.code || `SP-${rawSerial.productId}`;

        const firstImgUrl = (prod?.imageUrl || '').split(/[;,\n]/)[0]?.trim();
        const image =
          firstImgUrl && !firstImgUrl.includes('example.com')
            ? firstImgUrl
            : getDefaultImageForProduct(prod || { name: pName });

        // Xác định thời hạn bảo hành dựa trên loại sản phẩm
        const isLaptop = (prod?.productType || '').toUpperCase() === 'LAPTOP';
        const durationDays = isLaptop ? 730 : 1095;
        const startIso =
          rawSerial.lastModifiedDate ||
          rawSerial.createdDate ||
          receiptDate ||
          new Date().toISOString();
        const isTerminated = Boolean(rawSerial.isTerminated || rawSerial.terminated);

        const computed = computeWarrantyDatesAndStatus(
          startIso,
          durationDays,
          undefined,
          isTerminated
        );

        const specs = parseSpecsTable(prod?.specification, pName);

        // Kiểm tra xem có thông tin đơn hàng trong orderFulfillmentService không
        const fulfillments = orderFulfillmentService.getFulfillments();
        let matchedOrderCode: string | undefined;
        let matchedCustomerName: string | undefined;
        let matchedCustomerPhone: string | undefined;

        for (const f of fulfillments) {
          const foundAssigned = (f.assignedSerials || []).find(
            (as) => as.serialNumber.toLowerCase() === rawSerial.serialNumber.toLowerCase()
          );
          if (foundAssigned) {
            matchedOrderCode = f.orderCode;
            matchedCustomerName = f.customerName;
            matchedCustomerPhone = f.customerPhone;
            break;
          }
        }

        const timeline: WarrantyTimelineEvent[] = [];
        if (receiptDate || rawSerial.createdDate) {
          timeline.push({
            id: `tl-gr-${rawSerial.id}`,
            timestamp: receiptDate || rawSerial.createdDate,
            title: 'Nhập kho & Kiểm định chất lượng chính hãng',
            description: `Thiết bị Serial ${rawSerial.serialNumber} được nhập kho và kiểm định đạt chuẩn kỹ thuật${receiptCode ? ` (Phiếu nhập: ${receiptCode})` : ''}.`,
            actor: 'Bộ phận Kho vận PCStore',
            type: 'SALE',
          });
        }
        timeline.push({
          id: `tl-act-${rawSerial.id}`,
          timestamp: computed.startDate,
          title: 'Kích hoạt thời hạn bảo hành điện tử',
          description: `Áp dụng chính sách bảo hành chính hãng ${computed.durationMonths} tháng (${computed.durationDays} ngày) cho sản phẩm ${pName}.`,
          actor: 'Hệ thống Bảo hành Điện tử PCStore',
          type: 'WARRANTY_ACTIVE',
        });

        return {
          serialNumber: rawSerial.serialNumber,
          serialStatus: rawSerial.status || 'SOLD',
          warrantyId: rawSerial.id,
          warrantyStatus: computed.warrantyStatus,
          active: !isTerminated && computed.warrantyStatus !== 'EXPIRED',
          startDate: computed.startDate,
          endDate: computed.endDate,
          durationDays: computed.durationDays,
          durationMonths: computed.durationMonths,
          remainingDays: computed.remainingDays,
          usedDays: computed.usedDays,
          progressPercent: computed.progressPercent,
          policyName: `Bảo hành chính hãng ${computed.durationMonths} tháng (Tiêu chuẩn nhà sản xuất)`,
          policyDescription:
            'Áp dụng bảo hành chính hãng 1 đổi 1 trong 30 ngày đầu nếu có lỗi phần cứng từ nhà sản xuất và hỗ trợ kỹ thuật trọn đời tại PCStore.',
          productId: prod?.id || rawSerial.productId,
          productName: pName,
          productCode: pCode,
          productImage: image,
          brandName: enriched.brandName || 'Chính hãng',
          categoryName: enriched.categoryName || 'Linh kiện & Thiết bị PC',
          productPrice: prod?.price ?? undefined,
          specifications: specs,
          orderCode: matchedOrderCode,
          purchaseDate: computed.startDate,
          customerName: matchedCustomerName,
          customerPhoneMasked: maskPhone(matchedCustomerPhone),
          goodsReceiptCode: receiptCode,
          requestsCount: 0,
          timeline,
        };
      }
    } catch {
      // ignore and continue to local / demo lookup
    }

    // 3. Kiểm tra dữ liệu mẫu DEMO_SERIAL_RECORDS (không phân biệt hoa thường)
    const upperKey = Object.keys(DEMO_SERIAL_RECORDS).find(
      (k) => k.toLowerCase() === cleanSerial.toLowerCase()
    );
    if (upperKey) {
      const demo = DEMO_SERIAL_RECORDS[upperKey];
      const startIso = new Date(
        Date.now() - demo.startOffsetDays * 24 * 60 * 60 * 1000
      ).toISOString();
      const computed = computeWarrantyDatesAndStatus(
        startIso,
        demo.durationDays,
        undefined,
        demo.isVoid
      );

      // Thử làm giàu thêm ảnh/giá từ backend nếu có
      const enriched = await enrichProductInfo(
        demo.productId,
        demo.productCode,
        demo.productName
      );
      const prod = enriched.product;
      const firstImgUrl = (prod?.imageUrl || '').split(/[;,\n]/)[0]?.trim();
      const image =
        firstImgUrl && !firstImgUrl.includes('example.com')
          ? firstImgUrl
          : demo.productImage;

      return {
        ...demo,
        productId: prod?.id || demo.productId,
        productImage: image,
        productPrice: prod?.price ?? demo.productPrice,
        startDate: computed.startDate,
        endDate: computed.endDate,
        durationDays: computed.durationDays,
        durationMonths: computed.durationMonths,
        remainingDays: computed.remainingDays,
        usedDays: computed.usedDays,
        progressPercent: computed.progressPercent,
        warrantyStatus: computed.warrantyStatus,
        purchaseDate: computed.startDate,
      };
    }

    // 4. Kiểm tra trong OrderFulfillmentService (các serial đã gán trong đơn hàng)
    try {
      const fulfillments = orderFulfillmentService.getFulfillments();
      for (const f of fulfillments) {
        const assigned = (f.assignedSerials || []).find(
          (s) => s.serialNumber.toLowerCase() === cleanSerial.toLowerCase()
        );
        if (assigned) {
          const enriched = await enrichProductInfo(
            assigned.productId,
            assigned.productCode,
            assigned.productName
          );
          const prod = enriched.product;
          const firstImgUrl = (prod?.imageUrl || '').split(/[;,\n]/)[0]?.trim();
          const image =
            firstImgUrl && !firstImgUrl.includes('example.com')
              ? firstImgUrl
              : getDefaultImageForProduct({ name: assigned.productName });

          const startIso = f.completedAt || assigned.assignedAt || f.createdAt;
          const computed = computeWarrantyDatesAndStatus(startIso, 1095);
          const specs = parseSpecsTable(prod?.specification, assigned.productName);

          return {
            serialNumber: assigned.serialNumber,
            serialStatus: assigned.status || 'SOLD',
            warrantyStatus: computed.warrantyStatus,
            active: computed.warrantyStatus !== 'EXPIRED',
            startDate: computed.startDate,
            endDate: computed.endDate,
            durationDays: computed.durationDays,
            durationMonths: computed.durationMonths,
            remainingDays: computed.remainingDays,
            usedDays: computed.usedDays,
            progressPercent: computed.progressPercent,
            policyName: 'Bảo hành chính hãng 36 tháng (1 đổi 1 trong 30 ngày đầu)',
            policyDescription:
              'Bảo hành chính hãng theo tiêu chuẩn nhà sản xuất tại hệ thống showroom PCStore toàn quốc.',
            productId: prod?.id || assigned.productId,
            productName: prod?.name || assigned.productName,
            productCode: prod?.code || assigned.productCode,
            productImage: image,
            brandName: enriched.brandName || 'Chính hãng',
            categoryName: enriched.categoryName || 'Linh kiện PC',
            productPrice: prod?.price ?? assigned.productPrice,
            specifications: specs,
            orderCode: f.orderCode,
            purchaseDate: computed.startDate,
            customerName: f.customerName,
            customerPhoneMasked: maskPhone(f.customerPhone),
            goodsReceiptCode: assigned.goodsReceiptCode,
            requestsCount: 0,
            timeline: [
              {
                id: `tl-ord-${f.orderId}`,
                timestamp: computed.startDate,
                title: 'Xuất bán & Kích hoạt bảo hành điện tử',
                description: `Thiết bị được xuất bán theo đơn hàng #${f.orderCode} và kích hoạt bảo hành 36 tháng.`,
                actor: 'Hệ thống Bảo hành PCStore',
                type: 'WARRANTY_ACTIVE',
              },
            ],
          };
        }
      }
    } catch {
      // ignore
    }

    return null;
  },

  /**
   * Lấy danh sách các mã Serial gợi ý (kết hợp dữ liệu thật từ hệ thống và mẫu thử nghiệm)
   */
  async getSuggestedSerials(): Promise<SuggestedSerialItem[]> {
    const suggestions: SuggestedSerialItem[] = [];
    const seen = new Set<string>();

    // 1. Thử lấy từ danh sách bảo hành thật trong backend
    try {
      const wRes = await adminWarrantyService.getAllWarranties({ size: 6 }).catch(() => null);
      if (wRes?.content) {
        for (const w of wRes.content) {
          if (w.serialNumber && !seen.has(w.serialNumber.toLowerCase())) {
            seen.add(w.serialNumber.toLowerCase());
            suggestions.push({
              serialNumber: w.serialNumber,
              productName: w.productName || 'Sản phẩm chính hãng',
              statusLabel:
                w.status === 'ACTIVE'
                  ? 'Còn hạn'
                  : w.status === 'EXPIRING_SOON'
                  ? 'Sắp hết hạn'
                  : 'Đã hết hạn',
              statusType: w.status || 'ACTIVE',
            });
          }
        }
      }
    } catch {
      // ignore
    }

    // 2. Thử lấy thêm từ danh sách phiếu nhập kho (Goods Receipts) nếu có
    if (suggestions.length < 4) {
      try {
        const grRes = await adminGoodsReceiptService.getAllReceipts({ size: 10 }).catch(() => null);
        if (grRes?.content) {
          for (const gr of grRes.content) {
            for (const item of gr.items || []) {
              for (const s of item.productSerials || []) {
                if (s.serialNumber && !seen.has(s.serialNumber.toLowerCase())) {
                  seen.add(s.serialNumber.toLowerCase());
                  suggestions.push({
                    serialNumber: s.serialNumber,
                    productName: `Serial #${s.serialNumber}`,
                    statusLabel: 'Còn hạn',
                    statusType: 'ACTIVE',
                  });
                  if (suggestions.length >= 4) break;
                }
              }
              if (suggestions.length >= 4) break;
            }
            if (suggestions.length >= 4) break;
          }
        }
      } catch {
        // ignore
      }
    }

    // 3. Bổ sung các mã Serial mẫu đa dạng trạng thái
    const demoSuggestions: SuggestedSerialItem[] = [
      {
        serialNumber: 'GIGA-M27Q-FIFO-8821',
        productName: 'Màn hình GIGABYTE M27Q 27" 2K 170Hz',
        statusLabel: 'Còn hạn BH',
        statusType: 'ACTIVE',
      },
      {
        serialNumber: 'ASUS-ROG-Z790-FIFO-001',
        productName: 'Mainboard ASUS ROG MAXIMUS Z790 HERO',
        statusLabel: 'Còn hạn BH',
        statusType: 'ACTIVE',
      },
      {
        serialNumber: 'ASUS-RTX4070TI-FIFO-993',
        productName: 'VGA ASUS TUF RTX 4070 Ti SUPER 16GB',
        statusLabel: 'Sắp hết hạn',
        statusType: 'EXPIRING_SOON',
      },
      {
        serialNumber: 'INTEL-I9-14900K-FIFO-441',
        productName: 'CPU Intel Core i9-14900K',
        statusLabel: 'Đã hết hạn',
        statusType: 'EXPIRED',
      },
    ];

    for (const d of demoSuggestions) {
      if (!seen.has(d.serialNumber.toLowerCase())) {
        seen.add(d.serialNumber.toLowerCase());
        suggestions.push(d);
      }
    }

    return suggestions.slice(0, 6);
  },
};

export default warrantyLookupService;

