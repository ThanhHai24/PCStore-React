import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Package,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Boxes,
  FileCheck,
  ChevronRight,
  Sparkles,
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
  Legend,
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

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

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
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 py-4 space-y-6">
      {/* Top Header & Date Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tổng Quan Hoạt Động Kinh Doanh</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3 h-3 text-blue-600" /> Real-time Analytics
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Dữ liệu tổng hợp trực tiếp từ hệ thống API phân tích kinh doanh PC Store
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Buttons */}
          <div className="inline-flex rounded-xl bg-gray-100 p-1">
            <button
              onClick={() => handleSelectPreset('7D')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activePreset === '7D' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              7 ngày
            </button>
            <button
              onClick={() => handleSelectPreset('30D')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activePreset === '30D' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              30 ngày
            </button>
            <button
              onClick={() => handleSelectPreset('THIS_QUARTER')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activePreset === 'THIS_QUARTER' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Quý này
            </button>
            <button
              onClick={() => handleSelectPreset('THIS_YEAR')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activePreset === 'THIS_YEAR' ? 'bg-white text-blue-600 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Năm nay
            </button>
          </div>

          {/* Date range pickers */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1 text-xs">
            <Calendar className="w-3.5 h-3.5 text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-xs text-gray-700 focus:outline-none"
            />
            <span className="text-gray-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-xs text-gray-700 focus:outline-none"
            />
          </div>

          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={loadDashboardData}
            className="underline font-semibold text-amber-900 hover:text-amber-700"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 7 KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {/* KPI 1: Doanh thu thuần */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between hover:border-blue-200 transition-colors">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-semibold text-gray-500">Doanh Thu Thuần</span>
            <div className="p-1.5 rounded-lg bg-blue-50">
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div>
            <p className="text-lg font-black text-gray-900">
              {kpi ? formatVND(kpi.totalRevenue) : '0 ₫'}
            </p>
            <span className="text-[11px] text-blue-600 font-medium flex items-center gap-1 mt-1">
              {kpi ? formatCompactVND(kpi.totalRevenue) : '0 ₫'}
            </span>
          </div>
        </div>

        {/* KPI 2: Lợi nhuận gộp & Biên */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between hover:border-emerald-200 transition-colors">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-semibold text-gray-500">Lợi Nhuận Gộp</span>
            <div className="p-1.5 rounded-lg bg-emerald-50">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div>
            <p className="text-lg font-black text-gray-900">
              {kpi ? formatVND(kpi.grossProfit) : '0 ₫'}
            </p>
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-0.5 mt-1">
              Biên LN: {kpi?.grossMarginPercentage ?? 0}%
            </span>
          </div>
        </div>

        {/* KPI 3: Hóa đơn đã thanh toán */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between hover:border-indigo-200 transition-colors">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-xs font-semibold text-gray-500">Hóa Đơn Hoàn Tất</span>
            <div className="p-1.5 rounded-lg bg-indigo-50">
              <FileCheck className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
          <div>
            <p className="text-lg font-black text-gray-900">
              {kpi ? formatNumber(kpi.totalPaidInvoices) : '0'}
            </p>
            <span className="text-[11px] text-gray-500 mt-1 block">Đã thanh toán</span>
          </div>
        </div>

        {/* KPI 4: Sản phẩm đã bán */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between hover:border-purple-200 transition-colors">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-xs font-semibold text-gray-500">Sản Phẩm Đã Bán</span>
            <div className="p-1.5 rounded-lg bg-purple-50">
              <Package className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div>
            <p className="text-lg font-black text-gray-900">
              {kpi ? formatNumber(kpi.totalProductsSold) : '0'}
            </p>
            <span className="text-[11px] text-gray-500 mt-1 block">Chiếc / Linh kiện</span>
          </div>
        </div>

        {/* KPI 5: Giá trị vốn tồn kho */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between hover:border-amber-200 transition-colors">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-semibold text-gray-500">Giá Trị Kho Hàng</span>
            <div className="p-1.5 rounded-lg bg-amber-50">
              <Boxes className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div>
            <p className="text-lg font-black text-gray-900">
              {kpi ? formatCompactVND(kpi.totalInventoryValue) : '0 ₫'}
            </p>
            <span className="text-[11px] text-gray-500 mt-1 block">Giá vốn khả dụng</span>
          </div>
        </div>

        {/* KPI 6: Cảnh báo sắp hết hàng */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between hover:border-rose-200 transition-colors">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-semibold text-gray-500">Sắp Hết Hàng</span>
            <div className="p-1.5 rounded-lg bg-rose-50">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <div>
            <p className="text-lg font-black text-rose-600">
              {kpi ? formatNumber(kpi.lowStockProductCount) : '0'}
            </p>
            <span className="text-[11px] text-rose-500 mt-1 block">Mã SKU cần nhập</span>
          </div>
        </div>

        {/* KPI 7: Đơn đang xử lý */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between hover:border-cyan-200 transition-colors">
          <div className="flex items-center justify-between text-cyan-600 mb-2">
            <span className="text-xs font-semibold text-gray-500">Đơn Đang Xử Lý</span>
            <div className="p-1.5 rounded-lg bg-cyan-50">
              <ShoppingBag className="w-4 h-4 text-cyan-600" />
            </div>
          </div>
          <div>
            <p className="text-lg font-black text-cyan-700">
              {kpi ? formatNumber(kpi.processingOrderCount) : '0'}
            </p>
            <span className="text-[11px] text-gray-500 mt-1 block">Chưa kết thúc</span>
          </div>
        </div>
      </div>

      {/* Main Charts Row: Combo Revenue/Orders & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Combo Revenue and Orders Trend */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900">Biểu Đồ Doanh Thu & Số Lượng Đơn Hàng</h2>
              <p className="text-xs text-gray-500">Xu hướng biến động theo từng mốc thời gian</p>
            </div>
            <Link
              to="/admin/reports/sales/trends"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Xem chi tiết <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-[320px] w-full">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={(v) => formatCompactVND(v)}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(val: any, name: any) => {
                      const numVal = Number(val || 0);
                      if (name === 'Doanh thu') return [formatVND(numVal), name] as any;
                      return [formatNumber(numVal) + ' đơn', name || ''] as any;
                    }}
                    labelStyle={{ fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar
                    yAxisId="left"
                    dataKey="revenue"
                    name="Doanh thu"
                    fill="#3B82F6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="orderCount"
                    name="Số đơn hàng"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                <Calendar className="w-8 h-8 text-gray-300 mb-2" />
                <p>Chưa có dữ liệu giao dịch trong khoảng thời gian này</p>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Revenue by Category Donut */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900">Cơ Cấu Theo Danh Mục</h2>
              <p className="text-xs text-gray-500">Tỷ trọng doanh thu theo ngành hàng</p>
            </div>
            <Link
              to="/admin/reports/sales/structure"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Chi tiết <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-[220px] w-full">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="categoryName"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cat-cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => formatVND(Number(val || 0)) as any}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-xs">
                <Layers className="w-8 h-8 text-gray-300 mb-2" />
                <p>Chưa có dữ liệu danh mục</p>
              </div>
            )}
          </div>

          <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
            {categoryData.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <span className="text-gray-700 truncate">{cat.categoryName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-gray-900">{formatCompactVND(cat.value)}</span>
                  <span className="text-[11px] text-gray-400">{cat.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Order Status Distribution, Top Selling Products, Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Status Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900">Phân Bổ Trạng Thái Đơn Hàng</h2>
              <p className="text-xs text-gray-500">Tỷ lệ xử lý các đơn hàng hiện tại</p>
            </div>
            <Link
              to="/admin/reports/sales/orders"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Xem đơn <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 pt-2">
            {orderStatusData.length > 0 ? (
              orderStatusData.map((st, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-700">{st.label}</span>
                    <span className="text-gray-900 font-semibold">
                      {st.count} đơn ({st.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${st.percentage}%`,
                        backgroundColor:
                          st.status === 'COMPLETED'
                            ? '#10B981'
                            : st.status === 'DELIVERING'
                            ? '#3B82F6'
                            : st.status === 'PENDING'
                            ? '#F59E0B'
                            : st.status === 'CANCELLED'
                            ? '#EF4444'
                            : '#64748B',
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-gray-400 py-6">Chưa có dữ liệu trạng thái đơn</p>
            )}
          </div>
        </div>

        {/* Top 5 Selling Products */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900">Top Sản Phẩm Bán Chạy</h2>
              <p className="text-xs text-gray-500">Sản lượng tiêu thụ cao nhất</p>
            </div>
            <Link
              to="/admin/reports/sales/gross-profit"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Ma trận SKU <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {topProducts.length > 0 ? (
              topProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <p className="text-xs font-semibold text-gray-900 truncate" title={p.productName}>
                        {p.productName}
                      </p>
                    </div>
                    <span className="text-[10px] text-gray-400 pl-6 block">{p.productCode}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-blue-600">{formatNumber(p.quantitySold)} chiếc</span>
                    <span className="text-[10px] text-gray-500 block">{formatCompactVND(p.revenue)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-gray-400 py-6">Chưa có dữ liệu sản phẩm</p>
            )}
          </div>
        </div>

        {/* Low Stock Alerts Quick View */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-gray-100">
            <div>
              <h2 className="text-base font-bold text-gray-900">Cảnh Báo Hết Hàng</h2>
              <p className="text-xs text-gray-500">Sản phẩm chạm ngưỡng tồn tối thiểu</p>
            </div>
            <Link
              to="/admin/reports/inventory/alerts"
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1"
            >
              Toàn bộ <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {lowStockAlerts.length > 0 ? (
              lowStockAlerts.slice(0, 5).map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-rose-50/50 border border-rose-100"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-gray-900 truncate" title={item.productName}>
                      {item.productName}
                    </p>
                    <span className="text-[10px] text-rose-700">
                      Tồn: <strong className="text-rose-900">{item.sellableQuantity}</strong> / Tối thiểu {item.minimumThreshold}
                    </span>
                  </div>
                  <Link
                    to="/admin/import"
                    className="px-2 py-1 bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 rounded-lg text-[10px] font-bold shrink-0 transition-colors"
                  >
                    Nhập hàng
                  </Link>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <span className="inline-block p-2 rounded-full bg-emerald-50 text-emerald-600 mb-1">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <p className="text-xs text-gray-500 font-medium">Kho hàng đang ở trạng thái an toàn</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Navigation to Reports */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span>Truy Cập Nhanh Các Báo Cáo Chuyên Sâu</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <Link
            to="/admin/reports/sales/revenue"
            className="p-3 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all text-center group"
          >
            <DollarSign className="w-5 h-5 text-blue-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-gray-800 block">Doanh Thu</span>
            <span className="text-[10px] text-gray-400">Doanh thu & đối chiếu</span>
          </Link>

          <Link
            to="/admin/reports/sales/structure"
            className="p-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition-all text-center group"
          >
            <Layers className="w-5 h-5 text-indigo-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-gray-800 block">Cơ Cấu SP</span>
            <span className="text-[10px] text-gray-400">Theo ngành hàng/hãng</span>
          </Link>

          <Link
            to="/admin/reports/sales/gross-profit"
            className="p-3 rounded-xl border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all text-center group"
          >
            <TrendingUp className="w-5 h-5 text-emerald-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-gray-800 block">Lợi Nhuận Gộp</span>
            <span className="text-[10px] text-gray-400">Giá vốn & biên lợi nhuận</span>
          </Link>

          <Link
            to="/admin/reports/inventory/stock"
            className="p-3 rounded-xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50/40 transition-all text-center group"
          >
            <Boxes className="w-5 h-5 text-amber-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-gray-800 block">Báo Cáo Kho</span>
            <span className="text-[10px] text-gray-400">Tồn kho & tuổi kho</span>
          </Link>

          <Link
            to="/admin/reports/inventory/movements"
            className="p-3 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50/40 transition-all text-center group"
          >
            <ArrowUpRight className="w-5 h-5 text-purple-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-gray-800 block">Nhập Hàng NCC</span>
            <span className="text-[10px] text-gray-400">Hiệu suất nhà cung cấp</span>
          </Link>

          <Link
            to="/admin/reports/sales/export"
            className="p-3 rounded-xl border border-gray-200 hover:border-rose-300 hover:bg-rose-50/40 transition-all text-center group"
          >
            <FileCheck className="w-5 h-5 text-rose-600 mx-auto mb-1 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-bold text-gray-800 block">Khai Thuế & Excel</span>
            <span className="text-[10px] text-gray-400">Hoạch toán & Tờ khai</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
