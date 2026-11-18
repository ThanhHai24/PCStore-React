import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  Package,
  Layers,
  Calendar,
  RefreshCw,
  Download,
  Percent,
  Coins,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
} from 'recharts';
import { adminAnalyticsService } from '../../../../services/adminAnalyticsService';
import type {
  TimeSeriesPointDto,
  TopProductDto,
  ProductMatrixDto,
  DashboardKpiResponse,
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

export default function GrossProfitReportPage() {
  const today = new Date().toISOString().slice(0, 10);
  const startOfYear = `${new Date().getFullYear()}-01-01`;

  const [startDate, setStartDate] = useState<string>(startOfYear);
  const [endDate, setEndDate] = useState<string>(today);
  const [activePreset, setActivePreset] = useState<'30D' | 'THIS_QUARTER' | 'THIS_YEAR'>('THIS_YEAR');

  const [loading, setLoading] = useState<boolean>(true);
  const [kpi, setKpi] = useState<DashboardKpiResponse | null>(null);
  const [trendData, setTrendData] = useState<TimeSeriesPointDto[]>([]);
  const [topProfitProducts, setTopProfitProducts] = useState<TopProductDto[]>([]);
  const [matrixData, setMatrixData] = useState<ProductMatrixDto[]>([]);
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
      const [kpiRes, trendRes, topProfitRes, matrixRes] = await Promise.allSettled([
        adminAnalyticsService.getDashboardKpis(filter),
        adminAnalyticsService.getRevenueTrend(filter),
        adminAnalyticsService.getTopGrossProfitProducts(filter, 8),
        adminAnalyticsService.getProductPerformanceMatrix(filter),
      ]);

      if (kpiRes.status === 'fulfilled') setKpi(kpiRes.value);
      if (trendRes.status === 'fulfilled') setTrendData(trendRes.value);
      if (topProfitRes.status === 'fulfilled') setTopProfitProducts(topProfitRes.value);
      if (matrixRes.status === 'fulfilled') setMatrixData(matrixRes.value);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalRevenue = kpi?.totalRevenue ?? 0;
  const grossProfit = kpi?.grossProfit ?? 0;
  const cogs = Math.max(0, totalRevenue - grossProfit);
  const marginPct = kpi?.grossMarginPercentage ?? 0;

  const filteredMatrix = matrixData.filter(
    (item) =>
      item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.brandName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportCSV = () => {
    const headers = [
      'Mã SKU',
      'Tên sản phẩm',
      'Danh mục',
      'Thương hiệu',
      'SL bán',
      'Doanh thu thuần',
      'Giá vốn COGS',
      'Lợi nhuận gộp',
      'Biên LN %',
      'Tồn kho hiện tại',
      'Lượt bảo hành',
    ];
    const rows = filteredMatrix.map((m) => [
      `"${m.productCode}"`,
      `"${m.productName.replace(/"/g, '""')}"`,
      `"${m.categoryName}"`,
      `"${m.brandName}"`,
      m.quantitySold,
      m.revenue,
      m.cogs,
      m.grossProfit,
      m.grossMarginPercentage,
      m.currentStock,
      m.warrantyCount,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Ma_Tran_Loi_Nhuan_SKU_${startDate}_den_${endDate}.csv`);
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
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Báo Cáo Phân Tích Lợi Nhuận Gộp & Giá Vốn</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sparkles className="w-3 h-3 text-emerald-600" /> Profitability
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Theo dõi Doanh thu thuần, Giá vốn hàng bán (COGS), Lợi nhuận gộp và Tỷ suất lợi nhuận từng SKU
          </p>
        </div>

        {/* Date Presets */}
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

      {/* 4 Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Doanh Thu Thuần</span>
            <p className="text-xl font-black text-blue-600 mt-1">{formatVND(totalRevenue)}</p>
            <span className="text-[11px] text-gray-400 font-medium">Doanh số thực tế ghi nhận</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Giá Vốn Hàng Bán (COGS)</span>
            <p className="text-xl font-black text-rose-600 mt-1">{formatVND(cogs)}</p>
            <span className="text-[11px] text-gray-400 font-medium">Chi phí vốn các serial đã xuất</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Lợi Nhuận Gộp</span>
            <p className="text-xl font-black text-emerald-600 mt-1">{formatVND(grossProfit)}</p>
            <span className="text-[11px] text-emerald-700 font-medium">Doanh thu trừ Giá vốn</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Biên Lợi Nhuận Gộp</span>
            <p className="text-xl font-black text-purple-600 mt-1">{marginPct}%</p>
            <span className="text-[11px] text-purple-700 font-medium">Tỷ suất sinh lời doanh thu</span>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <Percent className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area/Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="border-b pb-3 border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>Biến Động Doanh Thu Thuần vs Giá Vốn vs Lợi Nhuận Gộp</span>
            </h2>
            <p className="text-xs text-gray-500">Đối chiếu cấu thành dòng tiền theo các kỳ kinh doanh</p>
          </div>

          <div className="h-[320px]">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => formatCompactVND(v)} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(val: any, name: any) => [
                      formatVND(Number(val || 0)),
                      name || '',
                    ] as any}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                  <Bar dataKey="revenue" name="Doanh thu thuần" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="cogs" name="Giá vốn (COGS)" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  <Line
                    type="monotone"
                    dataKey="grossProfit"
                    name="Lợi nhuận gộp"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-xs text-gray-400 pt-28">Chưa có dữ liệu biến động lợi nhuận</p>
            )}
          </div>
        </div>

        {/* Top 8 Gross Profit Products */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="border-b pb-3 border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-600" />
              <span>Top Sản Phẩm Sinh Lời Cao Nhất</span>
            </h2>
            <p className="text-xs text-gray-500">Mặt hàng mang lại giá trị thặng dư tốt nhất</p>
          </div>

          <div className="space-y-3">
            {topProfitProducts.length > 0 ? (
              topProfitProducts.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold text-gray-900 truncate" title={p.productName}>
                      {idx + 1}. {p.productName}
                    </p>
                    <span className="text-[10px] text-gray-400 block">{p.productCode}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-emerald-600">{formatVND(p.grossProfit)}</span>
                    <span className="text-[10px] text-purple-600 font-semibold block">Biên: {p.grossMarginPercentage}%</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-gray-400 py-10">Chưa có dữ liệu sản phẩm</p>
            )}
          </div>
        </div>
      </div>

      {/* Performance Matrix Table */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Ma Trận Hiệu Quả Từng SKU Chi Tiết</span>
            </h2>
            <p className="text-xs text-gray-500">
              Tổng hợp Sản lượng bán, Doanh thu, Giá vốn, Lợi nhuận, Tồn kho và Số ca bảo hành
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Tìm theo SKU, tên, hãng..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs w-56 focus:outline-blue-500"
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
                <th className="py-2.5 px-3">Mã SKU</th>
                <th className="py-2.5 px-3">Tên Sản Phẩm</th>
                <th className="py-2.5 px-3">Danh Mục</th>
                <th className="py-2.5 px-3">Hãng</th>
                <th className="py-2.5 px-3 text-right">SL Bán</th>
                <th className="py-2.5 px-3 text-right">Doanh Thu Thuần</th>
                <th className="py-2.5 px-3 text-right">Giá Vốn (COGS)</th>
                <th className="py-2.5 px-3 text-right">Lợi Nhuận Gộp</th>
                <th className="py-2.5 px-3 text-right">Biên LN (%)</th>
                <th className="py-2.5 px-3 text-right">Tồn Kho</th>
                <th className="py-2.5 px-3 text-right">Bảo Hành</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {filteredMatrix.length > 0 ? (
                filteredMatrix.map((m, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-3 font-semibold text-blue-600">{m.productCode}</td>
                    <td className="py-3 px-3 max-w-[200px] truncate font-medium text-gray-900" title={m.productName}>
                      {m.productName}
                    </td>
                    <td className="py-3 px-3 text-gray-600">{m.categoryName}</td>
                    <td className="py-3 px-3 text-gray-600 font-semibold">{m.brandName}</td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900">{formatNumber(m.quantitySold)}</td>
                    <td className="py-3 px-3 text-right font-bold text-blue-600">{formatVND(m.revenue)}</td>
                    <td className="py-3 px-3 text-right font-medium text-rose-600">{formatVND(m.cogs)}</td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-600">{formatVND(m.grossProfit)}</td>
                    <td className="py-3 px-3 text-right font-bold text-purple-700">{m.grossMarginPercentage}%</td>
                    <td className="py-3 px-3 text-right font-medium text-gray-700">{m.currentStock}</td>
                    <td className="py-3 px-3 text-right">
                      {m.warrantyCount > 0 ? (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          <ShieldCheck className="w-3 h-3" /> {m.warrantyCount}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-gray-400">
                    Chưa có sản phẩm nào trong ma trận hiệu quả
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
