import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  AlertTriangle,
  RefreshCw,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Link } from 'react-router-dom';
import { adminAnalyticsService } from '../../services/adminAnalyticsService';
import type {
  DashboardKpiResponse,
  TimeSeriesPointDto,
  CategoryBreakdownDto,
  OrderStatusDistributionDto,
  TopProductDto,
  LowStockProductDto,
} from '../../types/adminAnalytics';

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatCompactVND(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2).replace(/\.00$/, '')} tỷ`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')} tr`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}k`;
  }
  return String(value || 0);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('vi-VN').format(num || 0);
}

const PIE_COLORS = ['#2563EB', '#0EA5E9', '#0D9488', '#6366F1', '#64748B', '#D97706', '#E11D48', '#8B5CF6'];

export const AdminDashboard: React.FC = () => {
  // Preset dates
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState<string>(thirtyDaysAgo);
  const [endDate, setEndDate] = useState<string>(today);
  const [activePreset, setActivePreset] = useState<'7D' | '30D' | 'THIS_QUARTER' | 'THIS_YEAR'>('30D');

  const [loading, setLoading] = useState<boolean>(true);
  const [kpi, setKpi] = useState<DashboardKpiResponse | null>(null);
  const [trendData, setTrendData] = useState<TimeSeriesPointDto[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryBreakdownDto[]>([]);
  const [orderStatusData, setOrderStatusData] = useState<OrderStatusDistributionDto[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductDto[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockProductDto[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectPreset = (preset: '7D' | '30D' | 'THIS_QUARTER' | 'THIS_YEAR') => {
    setActivePreset(preset);
    const now = new Date();
    const endStr = now.toISOString().slice(0, 10);
    setEndDate(endStr);

    if (preset === '7D') {
      const start = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
      setStartDate(start);
    } else if (preset === '30D') {
      const start = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
      setStartDate(start);
    } else if (preset === 'THIS_QUARTER') {
      const currentMonth = now.getMonth();
      const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
      const start = new Date(now.getFullYear(), quarterStartMonth, 1).toISOString().slice(0, 10);
      setStartDate(start);
    } else if (preset === 'THIS_YEAR') {
      const start = `${now.getFullYear()}-01-01`;
      setStartDate(start);
    }
  };

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const filter = { startDate, endDate };

      const [kpiRes, trendRes, catRes, statusRes, topProdRes, lowStockRes] = await Promise.allSettled([
        adminAnalyticsService.getDashboardKpis(filter),
        adminAnalyticsService.getRevenueAndOrderTrend(filter),
        adminAnalyticsService.getRevenueByCategory(filter),
        adminAnalyticsService.getOrderStatusDistribution(),
        adminAnalyticsService.getTopSellingProducts(filter, 5),
        adminAnalyticsService.getLowStockAlerts(),
      ]);

      if (kpiRes.status === 'fulfilled') {
        setKpi(kpiRes.value);
      }
      if (trendRes.status === 'fulfilled') {
        setTrendData(trendRes.value);
      }
      if (catRes.status === 'fulfilled') {
        setCategoryData(catRes.value);
      }
      if (statusRes.status === 'fulfilled') {
        setOrderStatusData(statusRes.value);
      }
      if (topProdRes.status === 'fulfilled') {
        setTopProducts(topProdRes.value);
      }
      if (lowStockRes.status === 'fulfilled') {
        setLowStockAlerts(lowStockRes.value);
      }

      if (kpiRes.status === 'rejected') {
        setErrorMsg('Không thể kết nối API thống kê từ Backend. Vui lòng kiểm tra lại dịch vụ Backend.');
      }
    } catch {
      setErrorMsg('Đã xảy ra lỗi khi tải dữ liệu báo cáo thống kê.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] space-y-4 pb-8">
      {/* ==================== TOP HEADER & DATE FILTERS ==================== */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Bảng điều khiển</span>
            <span className="text-slate-300">/</span>
            <span className="tabular-nums">
              {startDate} — {endDate}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Tổng quan hoạt động kinh doanh
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp doanh thu, đơn hàng, lợi nhuận gộp và tình trạng kho hàng PC Store theo thời gian thực.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Preset Buttons */}
          <div className="inline-flex rounded-md bg-slate-100 p-0.5 border border-slate-200">
            {(
              [
                { id: '7D', label: '7 ngày' },
                { id: '30D', label: '30 ngày' },
                { id: 'THIS_QUARTER', label: 'Quý này' },
                { id: 'THIS_YEAR', label: 'Năm nay' },
              ] as const
            ).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activePreset === preset.id
                    ? 'bg-white text-slate-900 border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 border border-transparent'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Date range pickers */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-md px-2.5 h-8 text-xs tabular-nums">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-slate-700 focus:outline-none"
            />
            <span className="text-slate-300">—</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-slate-700 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={loadDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={loadDashboardData}
            className="underline font-medium text-amber-900 hover:text-amber-700 shrink-0 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ==================== FLAT 2-ROW KPI METRIC STRIP ==================== */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        {/* Top Row: 4 Primary Sales KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
            <span className="text-xs font-medium text-slate-500">Doanh thu thuần</span>
            <p className="text-2xl font-semibold text-slate-900 tracking-tight">
              {kpi ? formatVND(kpi.totalRevenue) : '0 ₫'}
            </p>
            <span className="text-xs text-slate-500">
              Quy đổi: {kpi ? formatCompactVND(kpi.totalRevenue) : '0 ₫'}
            </span>
          </div>

          <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
            <span className="text-xs font-medium text-slate-500">Lợi nhuận gộp</span>
            <p className="text-2xl font-semibold text-emerald-700 tracking-tight">
              {kpi ? formatVND(kpi.grossProfit) : '0 ₫'}
            </p>
            <span className="text-xs text-slate-500">
              Biên lợi nhuận: <strong className="font-medium text-slate-700">{kpi?.grossMarginPercentage ?? 0}%</strong>
            </span>
          </div>

          <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
            <span className="text-xs font-medium text-slate-500">Hóa đơn hoàn tất</span>
            <p className="text-2xl font-semibold text-slate-900 tracking-tight">
              {kpi ? formatNumber(kpi.totalPaidInvoices) : '0'}
            </p>
            <span className="text-xs text-slate-500">Đơn đã thanh toán</span>
          </div>

          <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
            <span className="text-xs font-medium text-slate-500">Sản phẩm đã bán</span>
            <p className="text-2xl font-semibold text-slate-900 tracking-tight">
              {kpi ? formatNumber(kpi.totalProductsSold) : '0'}
            </p>
            <span className="text-xs text-slate-500">Chiếc / linh kiện</span>
          </div>
        </div>

        {/* Bottom Row: 3 Operational & Inventory KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border-t border-slate-200">
          <div className="px-4 py-3.5 flex items-center justify-between gap-2 tabular-nums">
            <div>
              <span className="text-xs font-medium text-slate-500 block">Giá trị kho hàng</span>
              <span className="text-[11px] text-slate-400">Giá vốn khả dụng</span>
            </div>
            <span className="text-lg font-semibold text-slate-900">
              {kpi ? formatCompactVND(kpi.totalInventoryValue) : '0 ₫'}
            </span>
          </div>

          <div className="px-4 py-3.5 flex items-center justify-between gap-2 tabular-nums">
            <div>
              <span className="text-xs font-medium text-slate-500 block">Sắp hết hàng</span>
              <span className="text-[11px] text-slate-400">Mã SKU cần nhập</span>
            </div>
            <span
              className={`text-lg font-semibold ${
                (kpi?.lowStockProductCount ?? 0) > 0 ? 'text-rose-600' : 'text-slate-900'
              }`}
            >
              {kpi ? formatNumber(kpi.lowStockProductCount) : '0'}
            </span>
          </div>

          <div className="px-4 py-3.5 flex items-center justify-between gap-2 tabular-nums">
            <div>
              <span className="text-xs font-medium text-slate-500 block">Đơn đang xử lý</span>
              <span className="text-[11px] text-slate-400">Chưa hoàn tất giao</span>
            </div>
            <span className="text-lg font-semibold text-blue-600">
              {kpi ? formatNumber(kpi.processingOrderCount) : '0'}
            </span>
          </div>
        </div>
      </div>

      {/* ==================== MAIN CHARTS ROW ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left 8/12: Combo Revenue and Orders Trend */}
        <div className="lg:col-span-8 bg-white p-5 rounded-md border border-slate-200 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-2 border-b pb-3 border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Biểu đồ doanh thu &amp; số lượng đơn hàng
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Xu hướng biến động theo từng mốc thời gian
              </p>
            </div>
            <Link
              to="/admin/reports/sales/trends"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5 shrink-0"
            >
              <span>Xem chi tiết</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {trendData.length > 0 ? (
            <div className="space-y-3">
              <div className="h-[290px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      width={56}
                      tickFormatter={(v) => formatCompactVND(v)}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      width={36}
                      orientation="right"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => {
                        const numVal = Number(val || 0);
                        if (name === 'Doanh thu') return [formatVND(numVal), name] as any;
                        return [formatNumber(numVal) + ' đơn', name || ''] as any;
                      }}
                      contentStyle={{
                        borderRadius: '6px',
                        borderColor: '#E2E8F0',
                        fontSize: '12px',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="revenue"
                      name="Doanh thu"
                      fill="#2563EB"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={32}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orderCount"
                      name="Số đơn hàng"
                      stroke="#059669"
                      strokeWidth={2.25}
                      dot={{ r: 3, fill: '#059669' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#2563EB] shrink-0" />
                  <span>Doanh thu (VND)</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#059669] shrink-0" />
                  <span>Số đơn hàng</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-400 text-xs">
              Chưa có dữ liệu giao dịch trong khoảng thời gian này
            </div>
          )}
        </div>

        {/* Right 4/12: Revenue by Category Donut */}
        <div className="lg:col-span-4 bg-white p-5 rounded-md border border-slate-200 flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between gap-2 border-b pb-3 border-slate-100">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Cơ cấu theo danh mục</h2>
              <p className="text-xs text-slate-500 mt-0.5">Tỷ trọng doanh thu ngành hàng</p>
            </div>
            <Link
              to="/admin/reports/sales/structure"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5 shrink-0"
            >
              <span>Chi tiết</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-[195px] w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="categoryName"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={2}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cat-cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => formatVND(Number(val || 0)) as any}
                    contentStyle={{
                      borderRadius: '6px',
                      borderColor: '#E2E8F0',
                      fontSize: '12px',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                Chưa có dữ liệu danh mục
              </div>
            )}
          </div>

          <div className="divide-y divide-slate-100 border-t border-slate-100 max-h-[130px] overflow-y-auto pr-1">
            {categoryData.map((cat, idx) => (
              <div key={cat.categoryId ?? idx} className="flex items-center justify-between gap-2 text-xs py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-slate-700 truncate">{cat.categoryName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 tabular-nums">
                  <span className="font-medium text-slate-900">{formatCompactVND(cat.value)}</span>
                  <span className="text-[11px] text-slate-500 w-9 text-right">{cat.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== ROW 2: ORDER STATUS, TOP PRODUCTS, LOW STOCK ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Order Status Breakdown */}
        <div className="bg-white rounded-md border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Phân bổ trạng thái đơn hàng</h2>
              <p className="text-xs text-slate-500 mt-0.5">Tỷ lệ xử lý các đơn hàng hiện tại</p>
            </div>
            <Link
              to="/admin/reports/sales/orders"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5 shrink-0"
            >
              <span>Xem đơn</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="p-5 space-y-3.5 flex-1">
            {orderStatusData.length > 0 ? (
              orderStatusData.map((st, idx) => {
                const statusColor =
                  st.status === 'COMPLETED'
                    ? '#059669'
                    : st.status === 'DELIVERING'
                      ? '#2563EB'
                      : st.status === 'PENDING'
                        ? '#D97706'
                        : st.status === 'CANCELLED'
                          ? '#E11D48'
                          : '#64748B';
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="inline-flex items-center gap-2 text-slate-700 font-medium">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: statusColor }}
                        />
                        <span>{st.label}</span>
                      </span>
                      <span className="text-slate-900 font-semibold tabular-nums whitespace-nowrap">
                        {formatNumber(st.count)} đơn{' '}
                        <span className="text-slate-500 font-normal">({st.percentage}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-sm h-1.5 overflow-hidden">
                      <div
                        className="h-1.5 rounded-sm transition-all duration-300"
                        style={{
                          width: `${Math.min(100, st.percentage)}%`,
                          backgroundColor: statusColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-xs text-slate-400 py-10">Chưa có dữ liệu trạng thái đơn</p>
            )}
          </div>
        </div>

        {/* Top 5 Selling Products */}
        <div className="bg-white rounded-md border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Top sản phẩm bán chạy</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sản lượng tiêu thụ cao nhất</p>
            </div>
            <Link
              to="/admin/reports/sales/gross-profit"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5 shrink-0"
            >
              <span>Ma trận SKU</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {topProducts.length > 0 ? (
              topProducts.map((p, idx) => (
                <div
                  key={p.productId ?? idx}
                  className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                      <Package className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate" title={p.productName}>
                        {p.productName}
                      </p>
                      <span className="text-[11px] text-slate-500 tabular-nums block truncate">
                        #{idx + 1} • {p.productCode}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <span className="text-xs font-semibold text-slate-900 block">
                      {formatNumber(p.quantitySold)} chiếc
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      {formatCompactVND(p.revenue)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-slate-400 py-12">Chưa có dữ liệu sản phẩm</p>
            )}
          </div>
        </div>

        {/* Low Stock Alerts Quick View */}
        <div className="bg-white rounded-md border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Cảnh báo hết hàng</h2>
              <p className="text-xs text-slate-500 mt-0.5">Sản phẩm chạm ngưỡng tối thiểu</p>
            </div>
            <Link
              to="/admin/reports/inventory/alerts"
              className="text-xs font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-0.5 shrink-0"
            >
              <span>Toàn bộ</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {lowStockAlerts.length > 0 ? (
              lowStockAlerts.slice(0, 5).map((item, idx) => (
                <div
                  key={item.productId ?? idx}
                  className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          item.sellableQuantity <= 0 ? 'bg-rose-500' : 'bg-amber-500'
                        }`}
                      />
                      <p className="text-xs font-medium text-slate-900 truncate" title={item.productName}>
                        {item.productName}
                      </p>
                    </div>
                    <span className="text-[11px] text-slate-500 tabular-nums block pl-3 mt-0.5">
                      Tồn: <strong className="font-semibold text-rose-600">{item.sellableQuantity}</strong> / Tối thiểu{' '}
                      {item.minimumThreshold}
                    </span>
                  </div>
                  <Link
                    to="/admin/import"
                    className="px-2.5 py-1 bg-white text-slate-700 hover:text-blue-600 border border-slate-200 hover:bg-slate-50 rounded-md text-[11px] font-medium shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                  >
                    Nhập hàng
                  </Link>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                Kho hàng đang ở trạng thái an toàn
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== QUICK NAVIGATION TO REPORTS (FLAT STRIP) ==================== */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200">
          <h2 className="text-xs font-semibold text-slate-700">
            Truy cập nhanh báo cáo chuyên sâu
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          {[
            { to: '/admin/reports/sales/revenue', title: 'Doanh thu', desc: 'Doanh thu & đối chiếu' },
            { to: '/admin/reports/sales/structure', title: 'Cơ cấu SP', desc: 'Theo ngành hàng / hãng' },
            { to: '/admin/reports/sales/gross-profit', title: 'Lợi nhuận gộp', desc: 'Giá vốn & biên LN' },
            { to: '/admin/reports/inventory/stock', title: 'Báo cáo kho', desc: 'Tồn kho & serial' },
            { to: '/admin/reports/inventory/movements', title: 'Nhập hàng NCC', desc: 'Hiệu suất nhà cung cấp' },
            { to: '/admin/reports/sales/export', title: 'Khai thuế & Excel', desc: 'Hạch toán & tờ khai' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 group"
            >
              <div className="min-w-0">
                <span className="text-xs font-medium text-slate-900 group-hover:text-blue-600 block truncate">
                  {item.title}
                </span>
                <span className="text-[11px] text-slate-500 block truncate mt-0.5">{item.desc}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
