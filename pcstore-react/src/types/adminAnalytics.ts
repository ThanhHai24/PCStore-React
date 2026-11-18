export type GroupByTime = 'AUTO' | 'HOUR' | 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export interface PageResponse<T> {
  content: T[];
  pageNo: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export type ComparePeriod = 'NONE' | 'PREVIOUS_PERIOD' | 'SAME_PERIOD_LAST_YEAR';

export interface DateRangeFilterRequest {
  startDate?: string;
  endDate?: string;
  groupBy?: GroupByTime;
  categoryId?: number;
  brandId?: number;
  compareWith?: ComparePeriod;
}

export interface InventoryFilterRequest {
  asOfDate?: string;
  categoryId?: number;
  brandId?: number;
  supplierId?: number;
  minThreshold?: number;
}

export interface PurchaseFilterRequest {
  startDate?: string;
  endDate?: string;
  groupBy?: GroupByTime;
  supplierId?: number;
  categoryId?: number;
}

export interface TaxReportFilterRequest {
  year: number;
  quarter?: number;
  month?: number;
}

export interface DashboardKpiResponse {
  totalRevenue: number;
  totalPaidInvoices: number;
  totalProductsSold: number;
  grossProfit: number;
  grossMarginPercentage: number;
  totalInventoryValue: number;
  lowStockProductCount: number;
  processingOrderCount: number;
  asOfDate?: string;
}

export interface TimeSeriesPointDto {
  timeBucket: string;
  label: string;
  revenue: number;
  cogs?: number;
  grossProfit?: number;
  orderCount: number;
}

export interface CategoryBreakdownDto {
  categoryId?: number;
  categoryName: string;
  value: number;
  percentage: number;
}

export interface OrderStatusDistributionDto {
  status: string;
  label: string;
  count: number;
  percentage: number;
}

export interface PeriodComparisonDto {
  currentRevenue: number;
  comparedRevenue: number;
  growthAmount: number;
  growthRatePercentage: number;
  currentPeriodLabel: string;
  comparedPeriodLabel: string;
  comparisonPoints: TimeSeriesPointDto[];
}

export interface BrandBreakdownDto {
  brandId?: number;
  brandName: string;
  revenue: number;
  percentage: number;
}

export interface PaymentMethodBreakdownDto {
  methodId?: number;
  methodName: string;
  amount: number;
  percentage: number;
}

export interface InventorySummaryDto {
  totalSerialsInStore: number;
  totalInventoryValue: number;
  sellableSerials: number;
  sellableValue: number;
  defectiveSerials: number;
  packingAndDeliveringSerials: number;
  technicalUsageSerials: number;
}

export interface InventoryAgingBracketDto {
  bracket: string;
  label: string;
  quantity: number;
  totalValue: number;
  percentage: number;
}

export interface LowStockProductDto {
  productId: number;
  productCode: string;
  productName: string;
  categoryName: string;
  sellableQuantity: number;
  minimumThreshold: number;
  suggestedSupplier?: string;
}

export interface SlowMovingProductDto {
  productId: number;
  productCode: string;
  productName: string;
  categoryName: string;
  sellableQuantity: number;
  lastSoldDate?: string;
  daysWithoutSale: number;
}

export interface TopProductDto {
  productId: number;
  productCode: string;
  productName: string;
  categoryName: string;
  quantitySold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercentage: number;
}

export interface ProductMatrixDto {
  productId: number;
  productCode: string;
  productName: string;
  categoryName: string;
  brandName: string;
  quantitySold: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercentage: number;
  currentStock: number;
  warrantyCount: number;
}

export interface SupplierPerformanceDto {
  supplierId: number;
  supplierName: string;
  supplierCode: string;
  totalImportValue: number;
  receiptCount: number;
  totalQuantityReceived: number;
  acceptedQuantity: number;
  defectiveQuantity: number;
  defectRatePercentage: number;
}

export interface ReceiptQualityDto {
  label: string;
  acceptedQuantity: number;
  defectiveQuantity: number;
  totalQuantity: number;
  defectRatePercentage: number;
}

export interface TaxSummaryResponse {
  taxYear: number;
  quarter?: number;
  annualNetRevenue: number;
  appliedTier?: string;
  tierDescription?: string;
  vatRate: number;
  vatAmount: number;
  pitRate: number;
  pitAmount: number;
  totalTaxRate: number;
  totalTaxAmount: number;
  totalPaidInvoices: number;
  generatedAt?: string;
}

export interface TaxQuarterDto {
  quarter: number;
  quarterRevenue: number;
  vatAmount: number;
  pitAmount: number;
  totalTax: number;
  invoiceCount: number;
}

export interface TaxQuarterlyResponse {
  taxYear: number;
  annualNetRevenue: number;
  appliedTaxRate: number;
  quarters: TaxQuarterDto[];
}

export interface TaxInvoiceDetailDto {
  invoiceId: number;
  invoiceCode: string;
  invoiceDate?: string;
  orderCode: string;
  customerName: string;
  customerPhone?: string;
  totalAmount: number;
  discountAmount: number;
  amount: number;
  vatAmount: number;
  pitAmount: number;
  status?: string;
}
