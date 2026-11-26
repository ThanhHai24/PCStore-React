import { API_ENDPOINTS } from '../config/api';
import { fetchWithAuth } from './apiClient';
import { productService, getDefaultImageForProduct, parseSpecsTable } from './productService';
import { brandService } from './brandService';
import { categoryService } from './categoryService';
import type { ProductWarrantyStatus, WarrantyTimelineEvent } from '../types/adminWarranty';
import type { ProductResponse } from '../types/adminProduct';
import type { SpecItem } from '../types/product';

/**
 * Schema AdminWarrantyResponse từ BE (GET /api/admin/warranties/by-serial/{serialNumber})
 */
interface BackendWarrantyResponse {
  id: number;
  orderItemId?: number;
  orderId?: number;
  orderCode?: string | null;
  productSerialId?: number;
  serialNumber: string;
  productId?: number;
  productName?: string | null;
  productCode?: string | null;
  brandName?: string | null;
  categoryName?: string | null;
  customerId?: number;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
  warrantyPolicyId?: number;
  policyName?: string | null;
  durationDays?: number;
  startDate?: string | null;
  endDate?: string | null;
  active?: boolean;
  status?: string | null;
  remainingDays?: number;
  note?: string | null;
  requestsCount?: number;
}

/**
 * Schema TimelineEvent & WarrantyHistoryResponse từ BE (GET /api/admin/warranties/history/{serialNumber})
 */
interface BackendTimelineEvent {
  id?: string;
  timestamp?: string;
  title?: string;
  description?: string;
  actor?: string;
  type?: string;
  badgeColor?: string;
}

interface BackendWarrantyHistoryResponse {
  serialNumber?: string;
  productName?: string | null;
  productCode?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  orderCode?: string | null;
  purchaseDate?: string | null;
  warrantyStartDate?: string | null;
  warrantyEndDate?: string | null;
  policyName?: string | null;
  status?: string | null;
  totalRequests?: number;
  timeline?: BackendTimelineEvent[];
}

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

function mapTimelineType(rawType?: string): WarrantyTimelineEvent['type'] {
  const upper = (rawType || '').toUpperCase();
  if (
    upper === 'SALE' ||
    upper === 'WARRANTY_ACTIVE' ||
    upper === 'REQUEST_CREATE' ||
    upper === 'DIAGNOSIS' ||
    upper === 'PART_REPLACE' ||
    upper === 'COMPLETE' ||
    upper === 'EXTEND' ||
    upper === 'VOID'
  ) {
    return upper;
  }
  return 'WARRANTY_ACTIVE';
}

async function enrichProductInfo(
  productId?: number,
  productCode?: string | null,
  productName?: string | null,
  hasBrandName?: boolean,
  hasCategoryName?: boolean
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
        keyword: (productCode || productName || '').trim(),
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

  if (!hasBrandName && prod?.brandId) {
    try {
      const b = await brandService.getBrandById(prod.brandId);
      brandName = b?.name;
    } catch {
      // ignore
    }
  }

  const catId = prod?.primaryCategoryId || prod?.categoryIds?.[0];
  if (!hasCategoryName && catId) {
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
   * Tra cứu thông tin & lịch sử bảo hành theo mã Serial (S/N) từ BE:
   * - GET /api/admin/warranties/by-serial/{serialNumber}
   * - GET /api/admin/warranties/history/{serialNumber}
   */
  async lookupBySerial(serialInput: string): Promise<WarrantyLookupResult | null> {
    const cleanSerial = serialInput.trim();
    if (!cleanSerial) return null;

    const [warrantyRes, historyRes] = await Promise.all([
      fetchWithAuth(API_ENDPOINTS.WARRANTIES.BY_SERIAL(cleanSerial), { method: 'GET' }),
      fetchWithAuth(API_ENDPOINTS.WARRANTIES.HISTORY(cleanSerial), { method: 'GET' }).catch(() => null),
    ]);

    if (warrantyRes.status === 404) {
      return null;
    }

    if (warrantyRes.status === 401 || warrantyRes.status === 403) {
      throw new Error(
        'Vui lòng đăng nhập tài khoản có quyền truy cập để tra cứu thông tin bảo hành từ hệ thống.'
      );
    }

    if (!warrantyRes.ok) {
      const errData = await warrantyRes.json().catch(() => null);
      const errMsg =
        errData?.detail ||
        errData?.message ||
        `Không thể tra cứu thông tin bảo hành (mã lỗi ${warrantyRes.status}).`;
      throw new Error(errMsg);
    }

    const w: BackendWarrantyResponse = await warrantyRes.json();
    const history: BackendWarrantyHistoryResponse | null =
      historyRes && historyRes.ok ? await historyRes.json().catch(() => null) : null;

    const pId = w.productId;
    const pCode = w.productCode || history?.productCode || 'SP-CHINH-HANG';
    const pName =
      w.productName || history?.productName || `Sản phẩm chính hãng (${w.serialNumber || cleanSerial})`;

    const enriched = await enrichProductInfo(
      pId,
      pCode,
      pName,
      Boolean(w.brandName),
      Boolean(w.categoryName)
    );
    const prod = enriched.product;

    const firstImgUrl = (prod?.imageUrl || '').split(/[;,\n]/)[0]?.trim();
    const image =
      firstImgUrl && !firstImgUrl.includes('example.com')
        ? firstImgUrl
        : getDefaultImageForProduct(prod || { name: pName });

    const startIso = w.startDate || history?.warrantyStartDate || new Date().toISOString();
    const endIso = w.endDate || history?.warrantyEndDate;
    const durationDays = w.durationDays || 1095;
    const upperStatus = (w.status || history?.status || '').toUpperCase();
    const isVoid = upperStatus === 'VOID' || (w.active === false && upperStatus !== 'EXPIRED');

    const computed = computeWarrantyDatesAndStatus(startIso, durationDays, endIso, isVoid);
    const remainingDays =
      typeof w.remainingDays === 'number' ? Math.max(0, w.remainingDays) : computed.remainingDays;

    const warrantyStatus: ProductWarrantyStatus | 'VOID' =
      upperStatus === 'VOID'
        ? 'VOID'
        : upperStatus === 'EXPIRED'
          ? 'EXPIRED'
          : upperStatus === 'EXPIRING_SOON'
            ? 'EXPIRING_SOON'
            : upperStatus === 'ACTIVE'
              ? 'ACTIVE'
              : computed.warrantyStatus;

    const specs = parseSpecsTable(prod?.specification, prod?.name || pName);

    const policyName =
      w.policyName || history?.policyName || `Bảo hành chính hãng ${computed.durationMonths} tháng`;

    const backendTimeline: WarrantyTimelineEvent[] = (history?.timeline || []).map((ev, idx) => ({
      id: ev.id || `evt-${idx}`,
      timestamp: ev.timestamp || computed.startDate,
      title: ev.title || 'Sự kiện bảo hành',
      description: ev.description || '',
      actor: ev.actor,
      type: mapTimelineType(ev.type),
      badgeColor: ev.badgeColor,
    }));

    const timeline: WarrantyTimelineEvent[] =
      backendTimeline.length > 0
        ? backendTimeline
        : [
            {
              id: 'evt-init-warranty',
              timestamp: computed.startDate,
              title: 'Kích hoạt bảo hành điện tử chính hãng',
              description: `Thiết bị mang mã Serial ${w.serialNumber || cleanSerial} đã được kích hoạt gói "${policyName}".`,
              actor: 'Hệ thống Bảo hành PCStore',
              type: 'WARRANTY_ACTIVE',
            },
          ];

    return {
      serialNumber: w.serialNumber || cleanSerial,
      serialStatus: 'SOLD',
      warrantyId: w.id,
      warrantyStatus,
      active: w.active !== false && warrantyStatus !== 'EXPIRED' && warrantyStatus !== 'VOID',
      startDate: computed.startDate,
      endDate: computed.endDate,
      durationDays: computed.durationDays,
      durationMonths: computed.durationMonths,
      remainingDays,
      usedDays: computed.usedDays,
      progressPercent: computed.progressPercent,
      policyName,
      policyDescription:
        'Sản phẩm được hưởng đầy đủ chế độ bảo hành chính hãng tại tất cả trung tâm bảo hành PCStore trên toàn quốc.',
      productId: prod?.id || w.productId,
      productName: prod?.name || pName,
      productCode: prod?.code || pCode,
      productImage: image,
      brandName: w.brandName || enriched.brandName || 'Chính hãng',
      categoryName: w.categoryName || enriched.categoryName || 'Linh kiện & Thiết bị PC',
      productPrice: prod?.price ?? undefined,
      specifications: specs,
      orderCode: w.orderCode || history?.orderCode || undefined,
      purchaseDate: history?.purchaseDate || computed.startDate,
      customerName: w.customerName || history?.customerName || undefined,
      customerPhoneMasked: maskPhone(w.customerPhone || history?.customerPhone),
      note: w.note || undefined,
      requestsCount: w.requestsCount ?? history?.totalRequests ?? 0,
      timeline,
    };
  },
};

export default warrantyLookupService;
