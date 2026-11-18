import React, { useState, useEffect, useCallback } from 'react';
import {
  PieChart as PieChartIcon,
  BarChart3,
  Calendar,
  RefreshCw,
  Layers,
  Award,
  CreditCard,
  Package,
  Download,
  Sparkles,
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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#14B8A6'];

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
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Báo Cáo Cơ Cấu Doanh Thu Sản Phẩm</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3 h-3 text-indigo-600" /> Structure Analytics
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Phân bổ doanh thu theo Danh mục, Thương hiệu, Phương thức thanh toán và Top sản phẩm
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl bg-gray-100 p-1">
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
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Lọc</span>
          </button>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Doanh Thu Danh Mục</span>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatVND(totalCatRevenue)}</p>
            <span className="text-[11px] text-blue-600 font-medium">{categories.length} danh mục phát sinh</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Doanh Thu Thương Hiệu</span>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatVND(totalBrandRevenue)}</p>
            <span className="text-[11px] text-emerald-600 font-medium">{brands.length} thương hiệu đối tác</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Doanh Thu Theo Thanh Toán</span>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatVND(totalPayRevenue)}</p>
            <span className="text-[11px] text-purple-600 font-medium">{paymentMethods.length} cổng thanh toán</span>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Donut Category Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="border-b pb-3 border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-blue-600" />
              <span>Cơ Cấu Theo Danh Mục</span>
            </h2>
            <p className="text-xs text-gray-500">Tỷ trọng doanh thu giữa các nhóm phần cứng</p>
          </div>

          <div className="h-[220px]">
            {categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="value"
                    nameKey="categoryName"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {categories.map((_, index) => (
                      <Cell key={`cell-cat-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatVND(Number(val || 0)) as any} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-xs text-gray-400 pt-16">Chưa có dữ liệu danh mục</p>
            )}
          </div>

          <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
            {categories.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-700 truncate">{c.categoryName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-gray-900">{formatCompactVND(c.value)}</span>
                  <span className="text-[11px] text-gray-400">{c.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Bar Brand Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="border-b pb-3 border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              <span>Top Thương Hiệu Đóng Góp</span>
            </h2>
            <p className="text-xs text-gray-500">Doanh thu theo các hãng công nghệ lớn</p>
          </div>

          <div className="h-[220px]">
            {brands.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={brands} layout="vertical" margin={{ top: 5, right: 10, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={(v) => formatCompactVND(v)} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="brandName" tick={{ fontSize: 10 }} width={70} />
                  <Tooltip formatter={(val: any) => formatVND(Number(val || 0)) as any} />
                  <Bar dataKey="revenue" name="Doanh thu" fill="#10B981" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-xs text-gray-400 pt-16">Chưa có dữ liệu thương hiệu</p>
            )}
          </div>

          <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
            {brands.map((b, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-0.5">
                <span className="text-gray-700 truncate">{b.brandName}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-gray-900">{formatCompactVND(b.revenue)}</span>
                  <span className="text-[11px] text-gray-400">{b.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Payment Method Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="border-b pb-3 border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <span>Phương Thức Thanh Toán</span>
            </h2>
            <p className="text-xs text-gray-500">Tỷ lệ thanh toán online vs tiền mặt</p>
          </div>

          <div className="h-[220px]">
            {paymentMethods.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentMethods}
                    dataKey="amount"
                    nameKey="methodName"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {paymentMethods.map((_, index) => (
                      <Cell key={`cell-pay-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatVND(Number(val || 0)) as any} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-xs text-gray-400 pt-16">Chưa có dữ liệu thanh toán</p>
            )}
          </div>

          <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
            {paymentMethods.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-0.5">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[(i + 3) % COLORS.length] }}
                  />
                  <span className="text-gray-700 truncate">{p.methodName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-semibold text-gray-900">{formatCompactVND(p.amount)}</span>
                  <span className="text-[11px] text-gray-400">{p.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              <span>Top Sản Phẩm Đóng Góp Doanh Thu Cao Nhất</span>
            </h2>
            <p className="text-xs text-gray-500">Danh sách các SKU chủ lực mang lại nguồn thu chính</p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Tìm theo tên SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs w-48 focus:outline-blue-500"
            />
            <button
              onClick={exportCSV}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Mã SKU</th>
                <th className="py-2.5 px-3">Tên Sản Phẩm</th>
                <th className="py-2.5 px-3">Danh Mục</th>
                <th className="py-2.5 px-3 text-right">Số Lượng Bán</th>
                <th className="py-2.5 px-3 text-right">Doanh Thu Thuần</th>
                <th className="py-2.5 px-3 text-right">Lợi Nhuận Gộp</th>
                <th className="py-2.5 px-3 text-right">Biên Lợi Nhuận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {filteredTopProducts.length > 0 ? (
                filteredTopProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-3 font-bold text-gray-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-semibold text-blue-600">{p.productCode}</td>
                    <td className="py-3 px-3 max-w-[240px] truncate font-medium text-gray-900" title={p.productName}>
                      {p.productName}
                    </td>
                    <td className="py-3 px-3 text-gray-600">{p.categoryName || 'N/A'}</td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900">{formatNumber(p.quantitySold)}</td>
                    <td className="py-3 px-3 text-right font-bold text-blue-600">{formatVND(p.revenue)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-600">{formatVND(p.grossProfit)}</td>
                    <td className="py-3 px-3 text-right font-bold text-gray-700">{p.grossMarginPercentage}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
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
