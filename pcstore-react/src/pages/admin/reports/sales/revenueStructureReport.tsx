import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  RefreshCw,
  Package,
  Download,
  Search,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { adminAnalyticsService } from '../../../../services/adminAnalyticsService';
import type {
  CategoryBreakdownDto,
  BrandBreakdownDto,
  PaymentMethodBreakdownDto,
  TopProductDto,
} from '../../../../types/adminAnalytics';

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

const COLORS = ['#2563EB', '#0EA5E9', '#0D9488', '#6366F1', '#64748B', '#F59E0B', '#E11D48', '#8B5CF6'];

export default function RevenueStructureReportPage() {
  const today = new Date().toISOString().slice(0, 10);
  const startOfYear = `${new Date().getFullYear()}-01-01`;

  const [startDate, setStartDate] = useState<string>(startOfYear);
  const [endDate, setEndDate] = useState<string>(today);
  const [activePreset, setActivePreset] = useState<'30D' | 'THIS_QUARTER' | 'THIS_YEAR'>('THIS_YEAR');

  const [loading, setLoading] = useState<boolean>(true);
  const [categories, setCategories] = useState<CategoryBreakdownDto[]>([]);
  const [brands, setBrands] = useState<BrandBreakdownDto[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodBreakdownDto[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductDto[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSelectPreset = (preset: '30D' | 'THIS_QUARTER' | 'THIS_YEAR') => {
    setActivePreset(preset);
    const now = new Date();
    setEndDate(now.toISOString().slice(0, 10));

    if (preset === '30D') {
      setStartDate(new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10));
    } else if (preset === 'THIS_QUARTER') {
      const qStart = Math.floor(now.getMonth() / 3) * 3;
      setStartDate(new Date(now.getFullYear(), qStart, 1).toISOString().slice(0, 10));
    } else if (preset === 'THIS_YEAR') {
      setStartDate(`${now.getFullYear()}-01-01`);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filter = { startDate, endDate };
      const [catRes, brandRes, payRes, topRes] = await Promise.allSettled([
        adminAnalyticsService.getRevenueByCategory(filter),
        adminAnalyticsService.getRevenueByBrand(filter, 10),
        adminAnalyticsService.getRevenueByPaymentMethod(filter),
        adminAnalyticsService.getTopSellingProducts(filter, 10),
      ]);

      if (catRes.status === 'fulfilled') setCategories(catRes.value);
      if (brandRes.status === 'fulfilled') setBrands(brandRes.value);
      if (payRes.status === 'fulfilled') setPaymentMethods(payRes.value);
      if (topRes.status === 'fulfilled') setTopProducts(topRes.value);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalCatRevenue = categories.reduce((s, c) => s + c.value, 0);
  const totalBrandRevenue = brands.reduce((s, b) => s + b.revenue, 0);
  const totalPayRevenue = paymentMethods.reduce((s, p) => s + p.amount, 0);
  const totalTopProductsRevenue = topProducts.reduce((s, p) => s + p.revenue, 0);

  const filteredTopProducts = topProducts.filter(
    (p) =>
      p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.productCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportCSV = () => {
    const headers = ['Mã SKU', 'Tên sản phẩm', 'Danh mục', 'Số lượng bán', 'Doanh thu (VND)', 'Lợi nhuận gộp (VND)'];
    const rows = filteredTopProducts.map((p) => [
      `"${p.productCode}"`,
      `"${p.productName.replace(/"/g, '""')}"`,
      `"${p.categoryName || ''}"`,
      p.quantitySold,
      p.revenue,
      p.grossProfit,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Co_Cau_Doanh_Thu_SP_${startDate}_den_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] space-y-5 pb-8">
      {/* ==================== PAGE HEADER ==================== */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Báo cáo bán hàng</span>
            <span className="text-slate-300">/</span>
            <span className="tabular-nums">
              Kỳ phân tích: {startDate} — {endDate}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Báo cáo cơ cấu doanh thu sản phẩm
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Phân bổ doanh thu theo danh mục linh kiện, thương hiệu, phương thức thanh toán và xếp hạng SKU chủ lực.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Xuất CSV</span>
          </button>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ==================== COMPACT FILTER BAR ==================== */}
      <div className="bg-white border border-slate-200 rounded-md p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md bg-slate-100 p-0.5 border border-slate-200">
            <button
              type="button"
              onClick={() => handleSelectPreset('30D')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                activePreset === '30D'
                  ? 'bg-white text-slate-900 border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 border border-transparent'
              }`}
            >
              30 ngày
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('THIS_QUARTER')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                activePreset === 'THIS_QUARTER'
                  ? 'bg-white text-slate-900 border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 border border-transparent'
              }`}
            >
              Quý này
            </button>
            <button
              type="button"
              onClick={() => handleSelectPreset('THIS_YEAR')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                activePreset === 'THIS_YEAR'
                  ? 'bg-white text-slate-900 border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 border border-transparent'
              }`}
            >
              Năm nay
            </button>
          </div>

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
        </div>

        <div className="relative w-full lg:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm sản phẩm hoặc mã SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-md text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
          />
        </div>
      </div>

      {/* ==================== FLAT 3-COLUMN KPI STRIP ==================== */}
      <div className="bg-white border border-slate-200 rounded-md grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Doanh thu theo danh mục</span>
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">
            {formatVND(totalCatRevenue)}
          </p>
          <span className="text-xs text-slate-500">
            {formatNumber(categories.length)} danh mục phát sinh
          </span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Doanh thu theo thương hiệu</span>
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">
            {formatVND(totalBrandRevenue)}
          </p>
          <span className="text-xs text-slate-500">
            {formatNumber(brands.length)} thương hiệu đối tác
          </span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Doanh thu theo thanh toán</span>
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">
            {formatVND(totalPayRevenue)}
          </p>
          <span className="text-xs text-slate-500">
            {formatNumber(paymentMethods.length)} cổng thanh toán
          </span>
        </div>
      </div>

      {/* ==================== CHARTS GRID (3 COLUMNS) ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart 1: Donut Category Breakdown */}
        <div className="bg-white p-5 rounded-md border border-slate-200 flex flex-col justify-between space-y-4">
          <div className="border-b pb-3 border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Cơ cấu theo danh mục</h2>
            <p className="text-xs text-slate-500 mt-0.5">Tỷ trọng doanh thu giữa các nhóm phần cứng</p>
          </div>

          <div className="h-[200px]">
            {categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="value"
                    nameKey="categoryName"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={2}
                  >
                    {categories.map((_, index) => (
                      <Cell key={`cell-cat-${index}`} fill={COLORS[index % COLORS.length]} />
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
              <p className="text-center text-xs text-slate-400 pt-16">Chưa có dữ liệu danh mục</p>
            )}
          </div>

          <div className="space-y-1 pt-2 border-t border-slate-100 max-h-[145px] overflow-y-auto pr-1">
            {categories.map((c, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs py-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="text-slate-700 truncate">{c.categoryName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 tabular-nums">
                  <span className="font-medium text-slate-900">{formatCompactVND(c.value)}</span>
                  <span className="text-[11px] text-slate-500 w-10 text-right">{c.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Bar Brand Breakdown */}
        <div className="bg-white p-5 rounded-md border border-slate-200 flex flex-col justify-between space-y-4">
          <div className="border-b pb-3 border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Top thương hiệu đóng góp</h2>
            <p className="text-xs text-slate-500 mt-0.5">Doanh thu theo các hãng công nghệ</p>
          </div>

          <div className="h-[200px]">
            {brands.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={brands} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatCompactVND(v)}
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="brandName"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    axisLine={false}
                    tickLine={false}
                    width={78}
                  />
                  <Tooltip
                    formatter={(val: any) => formatVND(Number(val || 0)) as any}
                    contentStyle={{
                      borderRadius: '6px',
                      borderColor: '#E2E8F0',
                      fontSize: '12px',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                  <Bar dataKey="revenue" name="Doanh thu" fill="#2563EB" radius={[0, 3, 3, 0]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-xs text-slate-400 pt-16">Chưa có dữ liệu thương hiệu</p>
            )}
          </div>

          <div className="space-y-1 pt-2 border-t border-slate-100 max-h-[145px] overflow-y-auto pr-1">
            {brands.map((b, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs py-0.5">
                <span className="text-slate-700 truncate min-w-0">{b.brandName}</span>
                <div className="flex items-center gap-2 shrink-0 tabular-nums">
                  <span className="font-medium text-slate-900">{formatCompactVND(b.revenue)}</span>
                  <span className="text-[11px] text-slate-500 w-10 text-right">{b.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Payment Method Breakdown */}
        <div className="bg-white p-5 rounded-md border border-slate-200 flex flex-col justify-between space-y-4">
          <div className="border-b pb-3 border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Phương thức thanh toán</h2>
            <p className="text-xs text-slate-500 mt-0.5">Tỷ lệ thanh toán trực tuyến và tiền mặt</p>
          </div>

          <div className="h-[200px]">
            {paymentMethods.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    dataKey="amount"
                    nameKey="methodName"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={76}
                    paddingAngle={2}
                  >
                    {paymentMethods.map((_, index) => (
                      <Cell key={`cell-pay-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
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
              <p className="text-center text-xs text-slate-400 pt-16">Chưa có dữ liệu thanh toán</p>
            )}
          </div>

          <div className="space-y-1 pt-2 border-t border-slate-100 max-h-[145px] overflow-y-auto pr-1">
            {paymentMethods.map((p, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs py-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[(i + 2) % COLORS.length] }}
                  />
                  <span className="text-slate-700 truncate">{p.methodName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 tabular-nums">
                  <span className="font-medium text-slate-900">{formatCompactVND(p.amount)}</span>
                  <span className="text-[11px] text-slate-500 w-10 text-right">{p.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ==================== TOP PRODUCTS TABLE ==================== */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Top sản phẩm đóng góp doanh thu cao nhất
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Xếp hạng các SKU chủ lực mang lại nguồn thu và biên lợi nhuận gộp chính
            </p>
          </div>
          <span className="text-xs text-slate-500 tabular-nums shrink-0">
            Hiển thị <strong className="font-medium text-slate-900">{formatNumber(filteredTopProducts.length)}</strong> SKU
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 w-10">#</th>
                <th className="py-2.5 px-4 min-w-[260px]">Sản phẩm</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">SL bán</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Doanh thu thuần</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap min-w-[140px]">Tỷ trọng</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Lợi nhuận gộp</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Biên LN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredTopProducts.length > 0 ? (
                filteredTopProducts.map((p, idx) => {
                  const sharePercent =
                    totalTopProductsRevenue > 0
                      ? Number(((p.revenue / totalTopProductsRevenue) * 100).toFixed(1))
                      : 0;
                  return (
                    <tr key={p.productId ?? idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-400 tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-0 max-w-[340px]">
                          <div className="w-9 h-9 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div
                              className="font-medium text-slate-900 truncate"
                              title={p.productName}
                            >
                              {p.productName}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate">
                              <span className="font-medium text-blue-600 tabular-nums shrink-0">
                                {p.productCode}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="truncate">{p.categoryName || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {formatNumber(p.quantitySold)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatVND(p.revenue)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-sm overflow-hidden shrink-0">
                            <div
                              className="h-full bg-blue-600 rounded-sm"
                              style={{ width: `${Math.min(100, sharePercent)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-700 w-10 text-right">
                            {sharePercent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-700 tabular-nums whitespace-nowrap">
                        {formatVND(p.grossProfit)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700 tabular-nums whitespace-nowrap">
                        {p.grossMarginPercentage}%
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Không có sản phẩm nào phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
