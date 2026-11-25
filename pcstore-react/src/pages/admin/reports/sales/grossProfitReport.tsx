import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Calendar,
  RefreshCw,
  Download,
  Search,
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
    <div className="min-h-screen bg-[#F8FAFC] space-y-5 pb-8">
      {/* ==================== PAGE HEADER ==================== */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Báo cáo bán hàng</span>
            <span className="text-slate-300">/</span>
            <span className="tabular-nums">
              Kỳ đối soát: {startDate} — {endDate}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Báo cáo lợi nhuận gộp &amp; giá vốn
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Đối soát doanh thu thuần, giá vốn hàng bán (COGS), lợi nhuận gộp và tỷ suất biên lợi nhuận từng SKU.
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

        <div className="relative w-full lg:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm theo SKU, tên sản phẩm, danh mục, hãng..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-md text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
          />
        </div>
      </div>

      {/* ==================== FLAT 4-COLUMN FINANCIAL KPI STRIP ==================== */}
      <div className="bg-white border border-slate-200 rounded-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Doanh thu thuần</span>
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">
            {formatVND(totalRevenue)}
          </p>
          <span className="text-xs text-slate-500">Doanh số thực tế ghi nhận</span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Giá vốn hàng bán (COGS)</span>
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">
            {formatVND(cogs)}
          </p>
          <span className="text-xs text-slate-500">Chi phí vốn các serial đã xuất</span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Lợi nhuận gộp</span>
          <p
            className={`text-2xl font-semibold tracking-tight ${
              grossProfit < 0 ? 'text-rose-600' : 'text-emerald-700'
            }`}
          >
            {formatVND(grossProfit)}
          </p>
          <span className="text-xs text-slate-500">Doanh thu thuần trừ giá vốn</span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Tỷ suất lợi nhuận gộp</span>
          <p
            className={`text-2xl font-semibold tracking-tight ${
              marginPct < 0
                ? 'text-rose-600'
                : marginPct < 10
                  ? 'text-amber-600'
                  : 'text-slate-900'
            }`}
          >
            {marginPct}%
          </p>
          <span className="text-xs text-slate-500">Biên sinh lời trên doanh thu</span>
        </div>
      </div>

      {/* ==================== CHARTS ROW ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Trend Composed Chart (8/12) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-md border border-slate-200 flex flex-col justify-between space-y-4">
          <div className="border-b pb-3 border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              Đối chiếu Doanh thu thuần – Giá vốn (COGS) – Lợi nhuận gộp
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Biến động cấu thành lợi nhuận gộp qua các kỳ kinh doanh
            </p>
          </div>

          {trendData.length > 0 ? (
            <div className="space-y-3">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => formatCompactVND(v)}
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        formatVND(Number(val || 0)),
                        name || '',
                      ] as any}
                      contentStyle={{
                        borderRadius: '6px',
                        borderColor: '#E2E8F0',
                        fontSize: '12px',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    />
                    <Bar
                      dataKey="revenue"
                      name="Doanh thu thuần"
                      fill="#2563EB"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="cogs"
                      name="Giá vốn (COGS)"
                      fill="#94A3B8"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={28}
                    />
                    <Line
                      type="monotone"
                      dataKey="grossProfit"
                      name="Lợi nhuận gộp"
                      stroke="#059669"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#059669' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Custom clean legend below chart */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#2563EB] shrink-0" />
                  <span>Doanh thu thuần</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#94A3B8] shrink-0" />
                  <span>Giá vốn (COGS)</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#059669] shrink-0" />
                  <span>Lợi nhuận gộp</span>
                </span>
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-xs text-slate-400">
              Chưa có dữ liệu biến động lợi nhuận
            </div>
          )}
        </div>

        {/* Top 8 Gross Profit Products (4/12) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-md border border-slate-200 flex flex-col space-y-3">
          <div className="border-b pb-3 border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              Top sản phẩm sinh lời cao nhất
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Các SKU tạo ra giá trị lợi nhuận gộp lớn nhất
            </p>
          </div>

          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[330px] pr-1">
            {topProfitProducts.length > 0 ? (
              topProfitProducts.map((p, idx) => (
                <div
                  key={p.productId ?? idx}
                  className="flex items-center justify-between gap-2 py-2.5 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xs font-medium text-slate-400 tabular-nums w-4 shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate" title={p.productName}>
                        {p.productName}
                      </p>
                      <span className="text-[11px] text-slate-500 tabular-nums block truncate">
                        {p.productCode}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 tabular-nums">
                    <span
                      className={`text-xs font-semibold block ${
                        p.grossProfit < 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {formatVND(p.grossProfit)}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Biên {p.grossMarginPercentage}%
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-slate-400 py-12">Chưa có dữ liệu sản phẩm</p>
            )}
          </div>
        </div>
      </div>

      {/* ==================== PERFORMANCE MATRIX TABLE ==================== */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Ma trận lợi nhuận gộp chi tiết theo SKU
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Đối soát sản lượng bán, doanh thu thuần, giá vốn (COGS), lợi nhuận gộp, tồn kho và lượt bảo hành
            </p>
          </div>
          <span className="text-xs text-slate-500 tabular-nums shrink-0">
            Hiển thị <strong className="font-medium text-slate-900">{formatNumber(filteredMatrix.length)}</strong> SKU
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 min-w-[260px]">Sản phẩm</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">SL bán</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Doanh thu thuần</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Giá vốn (COGS)</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Lợi nhuận gộp</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Biên LN (%)</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Tồn kho</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Bảo hành</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredMatrix.length > 0 ? (
                filteredMatrix.map((m, idx) => {
                  const isNegativeProfit = m.grossProfit < 0;
                  const isLowMargin = m.grossMarginPercentage < 10;
                  return (
                    <tr key={m.productId ?? idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-0 max-w-[340px]">
                          <div className="w-9 h-9 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div
                              className="font-medium text-slate-900 truncate"
                              title={m.productName}
                            >
                              {m.productName}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate">
                              <span className="font-medium text-blue-600 tabular-nums shrink-0">
                                {m.productCode}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="truncate">{m.categoryName}</span>
                              <span className="text-slate-300">•</span>
                              <span className="truncate">{m.brandName}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {formatNumber(m.quantitySold)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {formatVND(m.revenue)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 tabular-nums whitespace-nowrap">
                        {formatVND(m.cogs)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-semibold tabular-nums whitespace-nowrap ${
                          isNegativeProfit ? 'text-rose-600' : 'text-emerald-700'
                        }`}
                      >
                        {formatVND(m.grossProfit)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-medium tabular-nums whitespace-nowrap ${
                          isNegativeProfit
                            ? 'text-rose-600'
                            : isLowMargin
                              ? 'text-amber-600'
                              : 'text-slate-700'
                        }`}
                      >
                        {m.grossMarginPercentage}%
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 tabular-nums whitespace-nowrap">
                        {formatNumber(m.currentStock)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">
                        {m.warrantyCount > 0 ? (
                          <span className="inline-flex items-center justify-end gap-1.5 font-medium text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>{formatNumber(m.warrantyCount)}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
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
