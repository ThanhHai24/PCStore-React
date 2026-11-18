import { API_ENDPOINTS } from '../config/api';
import { fetchWithAuth } from './apiClient';
import type {
  DashboardKpiResponse,
  TimeSeriesPointDto,
  CategoryBreakdownDto,
  OrderStatusDistributionDto,
  PeriodComparisonDto,
  BrandBreakdownDto,
  PaymentMethodBreakdownDto,
  InventorySummaryDto,
  InventoryAgingBracketDto,
  LowStockProductDto,
  SlowMovingProductDto,
  TopProductDto,
  ProductMatrixDto,
  SupplierPerformanceDto,
  ReceiptQualityDto,
  TaxSummaryResponse,
  TaxQuarterlyResponse,
  TaxInvoiceDetailDto,
  DateRangeFilterRequest,
  InventoryFilterRequest,
  PurchaseFilterRequest,
  TaxReportFilterRequest,
  PageResponse,
} from '../types/adminAnalytics';

function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });
  const qs = query.toString();
  return qs ? `?${qs}` : '';
}

export const adminAnalyticsService = {
  // ==================== DASHBOARD ANALYTICS ====================
  async getDashboardKpis(filter?: DateRangeFilterRequest): Promise<DashboardKpiResponse> {
    const qs = buildQueryString({
      startDate: filter?.startDate,
      endDate: filter?.endDate,
      groupBy: filter?.groupBy,
      categoryId: filter?.categoryId,
      brandId: filter?.brandId,
      compareWith: filter?.compareWith,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.DASHBOARD.KPI}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải KPI Dashboard (${res.status})`);
    }
    return res.json();
  },

  async getRevenueAndOrderTrend(filter?: DateRangeFilterRequest): Promise<TimeSeriesPointDto[]> {
    const qs = buildQueryString({
      startDate: filter?.startDate,
      endDate: filter?.endDate,
      groupBy: filter?.groupBy,
      categoryId: filter?.categoryId,
      brandId: filter?.brandId,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.DASHBOARD.TREND}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải biểu đồ doanh thu và đơn hàng (${res.status})`);
    }
    return res.json();
  },

  async getRevenueByCategory(filter?: DateRangeFilterRequest): Promise<CategoryBreakdownDto[]> {
    const qs = buildQueryString({
      startDate: filter?.startDate,
      endDate: filter?.endDate,
      groupBy: filter?.groupBy,
      categoryId: filter?.categoryId,
      brandId: filter?.brandId,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.DASHBOARD.BY_CATEGORY}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải cơ cấu doanh thu theo danh mục (${res.status})`);
    }
    return res.json();
  },

  async getOrderStatusDistribution(): Promise<OrderStatusDistributionDto[]> {
    const res = await fetchWithAuth(API_ENDPOINTS.ANALYTICS.DASHBOARD.ORDER_STATUS);
    if (!res.ok) {
      throw new Error(`Lỗi tải cơ cấu trạng thái đơn hàng (${res.status})`);
    }
    return res.json();
  },

  // ==================== REVENUE ANALYTICS ====================
  async getRevenueTrend(filter?: DateRangeFilterRequest): Promise<TimeSeriesPointDto[]> {
    const qs = buildQueryString({
      startDate: filter?.startDate,
      endDate: filter?.endDate,
      groupBy: filter?.groupBy,
      categoryId: filter?.categoryId,
      brandId: filter?.brandId,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.REVENUE.TREND}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải xu hướng doanh thu thuần & lợi nhuận (${res.status})`);
    }
    return res.json();
  },

  async compareRevenue(filter?: DateRangeFilterRequest): Promise<PeriodComparisonDto> {
    const qs = buildQueryString({
      startDate: filter?.startDate,
      endDate: filter?.endDate,
      compareWith: filter?.compareWith || 'PREVIOUS_PERIOD',
      categoryId: filter?.categoryId,
      brandId: filter?.brandId,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.REVENUE.COMPARE}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi đối chiếu doanh thu đa kỳ (${res.status})`);
    }
    return res.json();
  },

  async getRevenueByBrand(filter?: DateRangeFilterRequest, limit: number = 10): Promise<BrandBreakdownDto[]> {
    const qs = buildQueryString({
      startDate: filter?.startDate,
      endDate: filter?.endDate,
      limit,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.REVENUE.BY_BRAND}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải cơ cấu doanh thu theo thương hiệu (${res.status})`);
    }
    return res.json();
  },

  async getRevenueByPaymentMethod(filter?: DateRangeFilterRequest): Promise<PaymentMethodBreakdownDto[]> {
    const qs = buildQueryString({
      startDate: filter?.startDate,
      endDate: filter?.endDate,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.REVENUE.BY_PAYMENT_METHOD}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải cơ cấu phương thức thanh toán (${res.status})`);
    }
    return res.json();
  },

  // ==================== PRODUCT ANALYTICS ====================
  async getTopSellingProducts(filter?: DateRangeFilterRequest, limit: number = 10): Promise<TopProductDto[]> {
    const qs = buildQueryString({
      startDate: filter?.startDate,
      endDate: filter?.endDate,
      categoryId: filter?.categoryId,
      brandId: filter?.brandId,
      limit,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.PRODUCTS.TOP_SELLING}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải top sản phẩm bán chạy (${res.status})`);
    }
    return res.json();
  },

  async getTopGrossProfitProducts(filter?: DateRangeFilterRequest, limit: number = 10): Promise<TopProductDto[]> {
    const qs = buildQueryString({
      startDate: filter?.startDate,
      endDate: filter?.endDate,
      categoryId: filter?.categoryId,
      brandId: filter?.brandId,
      limit,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.PRODUCTS.TOP_PROFIT}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải top sản phẩm sinh lời gộp (${res.status})`);
    }
    return res.json();
  },

  async getProductPerformanceMatrix(filter?: DateRangeFilterRequest): Promise<ProductMatrixDto[]> {
    const qs = buildQueryString({
      startDate: filter?.startDate,
      endDate: filter?.endDate,
      categoryId: filter?.categoryId,
      brandId: filter?.brandId,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.PRODUCTS.PERFORMANCE_MATRIX}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải bảng ma trận hiệu quả SKU (${res.status})`);
    }
    return res.json();
  },

  // ==================== INVENTORY ANALYTICS ====================
  async getInventorySummary(filter?: InventoryFilterRequest): Promise<InventorySummaryDto> {
    const qs = buildQueryString({
      asOfDate: filter?.asOfDate,
      categoryId: filter?.categoryId,
      brandId: filter?.brandId,
      supplierId: filter?.supplierId,
      minThreshold: filter?.minThreshold,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.INVENTORY.SUMMARY}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải tổng quan tồn kho (${res.status})`);
    }
    return res.json();
  },

  async getStockByCategory(filter?: InventoryFilterRequest): Promise<CategoryBreakdownDto[]> {
    const qs = buildQueryString({
      asOfDate: filter?.asOfDate,
      categoryId: filter?.categoryId,
      brandId: filter?.brandId,
      supplierId: filter?.supplierId,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.INVENTORY.BY_CATEGORY}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải tồn kho theo danh mục (${res.status})`);
    }
    return res.json();
  },

  async getSerialStatusDistribution(): Promise<OrderStatusDistributionDto[]> {
    const res = await fetchWithAuth(API_ENDPOINTS.ANALYTICS.INVENTORY.STATUS_DISTRIBUTION);
    if (!res.ok) {
      throw new Error(`Lỗi tải phân bổ trạng thái Serial (${res.status})`);
    }
    return res.json();
  },

  async getInventoryAging(): Promise<InventoryAgingBracketDto[]> {
    const res = await fetchWithAuth(API_ENDPOINTS.ANALYTICS.INVENTORY.AGING);
    if (!res.ok) {
      throw new Error(`Lỗi tải tháp tuổi tồn kho Aging (${res.status})`);
    }
    return res.json();
  },

  async getLowStockAlerts(filter?: InventoryFilterRequest): Promise<LowStockProductDto[]> {
    const qs = buildQueryString({
      minThreshold: filter?.minThreshold,
      categoryId: filter?.categoryId,
      brandId: filter?.brandId,
      supplierId: filter?.supplierId,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.INVENTORY.LOW_STOCK_ALERT}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải cảnh báo sắp hết hàng (${res.status})`);
    }
    return res.json();
  },

  async getSlowMovingProducts(thresholdDays: number = 30): Promise<SlowMovingProductDto[]> {
    const qs = buildQueryString({ thresholdDays });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.INVENTORY.SLOW_MOVING}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải danh sách sản phẩm bán chậm (${res.status})`);
    }
    return res.json();
  },

  // ==================== PURCHASING ANALYTICS ====================
  async getPurchasingTrend(filter?: PurchaseFilterRequest): Promise<TimeSeriesPointDto[]> {
    const qs = buildQueryString({
      startDate: filter?.startDate,
      endDate: filter?.endDate,
      groupBy: filter?.groupBy,
      supplierId: filter?.supplierId,
      categoryId: filter?.categoryId,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.PURCHASING.TREND}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải xu hướng nhập hàng (${res.status})`);
    }
    return res.json();
  },

  async getPurchasingBySupplier(filter?: PurchaseFilterRequest, limit: number = 10): Promise<SupplierPerformanceDto[]> {
    const qs = buildQueryString({
      startDate: filter?.startDate,
      endDate: filter?.endDate,
      supplierId: filter?.supplierId,
      categoryId: filter?.categoryId,
      limit,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.PURCHASING.BY_SUPPLIER}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải hiệu suất nhà cung cấp (${res.status})`);
    }
    return res.json();
  },

  async getQualityInspection(filter?: PurchaseFilterRequest): Promise<ReceiptQualityDto[]> {
    const qs = buildQueryString({
      startDate: filter?.startDate,
      endDate: filter?.endDate,
      supplierId: filter?.supplierId,
      categoryId: filter?.categoryId,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.PURCHASING.QUALITY_CHECK}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải thống kê kiểm hàng Đạt vs Lỗi (${res.status})`);
    }
    return res.json();
  },

  async getReceiptStatusDistribution(filter?: PurchaseFilterRequest): Promise<OrderStatusDistributionDto[]> {
    const qs = buildQueryString({
      startDate: filter?.startDate,
      endDate: filter?.endDate,
      supplierId: filter?.supplierId,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.PURCHASING.RECEIPT_STATUS}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải cơ cấu phiếu nhập theo trạng thái (${res.status})`);
    }
    return res.json();
  },

  // ==================== TAX REPORT ANALYTICS ====================
  async getTaxSummary(filter: TaxReportFilterRequest): Promise<TaxSummaryResponse> {
    const qs = buildQueryString({
      year: filter.year,
      quarter: filter.quarter,
      month: filter.month,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.TAX.SUMMARY}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải bảng tổng hợp nghĩa vụ thuế (${res.status})`);
    }
    return res.json();
  },

  async getTaxQuarterlyBreakdown(year: number): Promise<TaxQuarterlyResponse> {
    const qs = buildQueryString({ year });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.TAX.QUARTERLY}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải bảng phân bổ thuế theo Quý (${res.status})`);
    }
    return res.json();
  },

  async getTaxInvoices(
    filter: TaxReportFilterRequest,
    page: number = 0,
    size: number = 20,
    sort: string = 'invoiceDate,desc'
  ): Promise<PageResponse<TaxInvoiceDetailDto>> {
    const qs = buildQueryString({
      year: filter.year,
      quarter: filter.quarter,
      month: filter.month,
      page,
      size,
      sort,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.TAX.INVOICES}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi tải danh sách hóa đơn tính thuế (${res.status})`);
    }
    return res.json();
  },

  async downloadTaxExcel(filter: TaxReportFilterRequest): Promise<Blob> {
    const qs = buildQueryString({
      year: filter.year,
      quarter: filter.quarter,
      month: filter.month,
    });
    const res = await fetchWithAuth(`${API_ENDPOINTS.ANALYTICS.TAX.EXPORT_EXCEL}${qs}`);
    if (!res.ok) {
      throw new Error(`Lỗi xuất file Excel báo cáo thuế (${res.status})`);
    }
    return res.blob();
  },
};
