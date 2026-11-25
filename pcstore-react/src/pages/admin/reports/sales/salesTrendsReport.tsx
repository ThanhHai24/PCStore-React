import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { SelectDropdown } from '../../../../components/admin/common/selectDropdown';
import { adminAnalyticsService } from '../../../../services/adminAnalyticsService';
import type {
  TimeSeriesPointDto,
  PeriodComparisonDto,
  GroupByTime,
  ComparePeriod,
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

export default function SalesTrendsReportPage() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState<string>(thirtyDaysAgo);
  const [endDate, setEndDate] = useState<string>(today);
  const [groupBy, setGroupBy] = useState<GroupByTime>('DAY');
  const [compareWith, setCompareWith] = useState<ComparePeriod>('PREVIOUS_PERIOD');

  const [loading, setLoading] = useState<boolean>(true);
  const [trendPoints, setTrendPoints] = useState<TimeSeriesPointDto[]>([]);
  const [comparison, setComparison] = useState<PeriodComparisonDto | null>(null);

  const loadTrends = useCallback(async () => {
    setLoading(true);
    try {
      const filter = {
        startDate,
        endDate,
        groupBy,
        compareWith,
      };

      const [trendRes, compRes] = await Promise.allSettled([
        adminAnalyticsService.getRevenueTrend(filter),
        adminAnalyticsService.compareRevenue(filter),
      ]);

      if (trendRes.status === 'fulfilled') setTrendPoints(trendRes.value);
      if (compRes.status === 'fulfilled') setComparison(compRes.value);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, groupBy, compareWith]);

  useEffect(() => {
    loadTrends();
  }, [loadTrends]);

  const exportCSV = () => {
    const headers = ['Mốc thời gian', 'Nhãn hiển thị', 'Doanh thu thuần (VND)', 'Giá vốn COGS (VND)', 'Lợi nhuận gộp (VND)', 'Số đơn hàng'];
    const rows = trendPoints.map((p) => [
      `"${p.timeBucket}"`,
      `"${p.label}"`,
      p.revenue,
      p.cogs || 0,
      p.grossProfit || 0,
      p.orderCount,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Xu_Huong_Kinh_Doanh_${startDate}_den_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isGrowthPositive = (comparison?.growthRatePercentage ?? 0) >= 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] space-y-4 pb-8">
      {/* ==================== PAGE HEADER ==================== */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Báo cáo bán hàng</span>
            <span className="text-slate-300">/</span>
            <span className="tabular-nums">
              Khoảng thời gian: {startDate} — {endDate}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Biểu đồ xu hướng kinh doanh &amp; tăng trưởng
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Phân tích tốc độ tăng trưởng, đối chiếu chu kỳ so sánh và diễn biến doanh thu, lợi nhuận, đơn hàng.
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
            onClick={loadTrends}
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
        {/* GroupBy Segmented Control */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Nhóm theo:</span>
          <div className="inline-flex rounded-md bg-slate-100 p-0.5 border border-slate-200">
            {(
              [
                { label: 'Ngày', value: 'DAY' as GroupByTime },
                { label: 'Tuần', value: 'WEEK' as GroupByTime },
                { label: 'Tháng', value: 'MONTH' as GroupByTime },
                { label: 'Năm', value: 'YEAR' as GroupByTime },
              ]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setGroupBy(opt.value)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  groupBy === opt.value
                    ? 'bg-white text-slate-900 border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900 border border-transparent'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* CompareWith & Date Range */}
        <div className="flex flex-wrap items-center gap-2">
          <SelectDropdown
            value={compareWith}
            onChange={(e) => setCompareWith(e.target.value as ComparePeriod)}
            options={[
              { label: 'So với kỳ liền trước', value: 'PREVIOUS_PERIOD' },
              { label: 'So với cùng kỳ năm ngoái', value: 'SAME_PERIOD_LAST_YEAR' },
              { label: 'Không đối chiếu', value: 'NONE' },
            ]}
            size="sm"
            className="w-52"
            triggerClassName="h-8 bg-white border-slate-200 rounded-md text-xs font-medium text-slate-800"
          />

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
      </div>

      {/* ==================== FLAT PERIOD COMPARISON STRIP ==================== */}
      {comparison && (
        <div className="bg-white border border-slate-200 rounded-md grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
            <span className="text-xs font-medium text-slate-500">
              Doanh thu kỳ này ({comparison.currentPeriodLabel})
            </span>
            <div className="flex items-baseline gap-2.5">
              <p className="text-2xl font-semibold text-slate-900 tracking-tight">
                {formatVND(comparison.currentRevenue)}
              </p>
              <span
                className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                  isGrowthPositive ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {isGrowthPositive ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {isGrowthPositive ? '+' : ''}
                {comparison.growthRatePercentage}%
              </span>
            </div>
            <span className="text-xs text-slate-500">Tốc độ tăng trưởng so với kỳ đối chiếu</span>
          </div>

          <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
            <span className="text-xs font-medium text-slate-500">
              Kỳ đối chiếu ({comparison.comparedPeriodLabel})
            </span>
            <p className="text-2xl font-semibold text-slate-900 tracking-tight">
              {formatVND(comparison.comparedRevenue)}
            </p>
            <span className="text-xs text-slate-500">Mốc doanh thu cơ sở để so sánh</span>
          </div>

          <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
            <span className="text-xs font-medium text-slate-500">Chênh lệch tuyệt đối</span>
            <p
              className={`text-2xl font-semibold tracking-tight ${
                isGrowthPositive ? 'text-emerald-700' : 'text-rose-600'
              }`}
            >
              {isGrowthPositive && comparison.growthAmount > 0 ? '+' : ''}
              {formatVND(comparison.growthAmount)}
            </p>
            <span className="text-xs text-slate-500">Biến động doanh thu ròng giữa hai kỳ</span>
          </div>
        </div>
      )}

      {/* ==================== MAIN TRENDS CHART ==================== */}
      <div className="bg-white p-5 rounded-md border border-slate-200 space-y-4">
        <div className="border-b pb-3 border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">
            Xu hướng doanh thu thuần, lợi nhuận gộp &amp; số lượng đơn hàng
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Chuỗi thời gian liên tục theo đơn vị đã chọn (trục trái: VND, trục phải: số đơn)
          </p>
        </div>

        {trendPoints.length > 0 ? (
          <div className="space-y-3">
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendPoints} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
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
                      if (name === 'Doanh thu thuần' || name === 'Lợi nhuận gộp') {
                        return [formatVND(numVal), name] as any;
                      }
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
                    yAxisId="right"
                    dataKey="orderCount"
                    name="Số đơn hàng"
                    fill="#CBD5E1"
                    maxBarSize={22}
                    radius={[3, 3, 0, 0]}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="Doanh thu thuần"
                    stroke="#2563EB"
                    strokeWidth={2.25}
                    dot={{ r: 3, fill: '#2563EB' }}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="grossProfit"
                    name="Lợi nhuận gộp"
                    stroke="#059669"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={{ r: 2.5, fill: '#059669' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Custom responsive legend below chart (never overlaps at 768px) */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#2563EB] shrink-0" />
                <span>Doanh thu thuần</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#059669] shrink-0" />
                <span>Lợi nhuận gộp</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#CBD5E1] shrink-0" />
                <span>Số đơn hàng</span>
              </span>
            </div>
          </div>
        ) : (
          <div className="h-[320px] flex items-center justify-center text-xs text-slate-400">
            Chưa có dữ liệu xu hướng trong khoảng thời gian này
          </div>
        )}
      </div>

      {/* ==================== DETAIL TIME-SERIES TABLE ==================== */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Chi tiết dữ liệu từng mốc thời gian
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Bảng đối chiếu doanh thu thuần, giá vốn, lợi nhuận gộp và sản lượng đơn theo từng kỳ
            </p>
          </div>
          <span className="text-xs text-slate-500 tabular-nums shrink-0">
            <strong className="font-medium text-slate-900">{formatNumber(trendPoints.length)}</strong> mốc
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 whitespace-nowrap">Mốc thời gian</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Nhãn kỳ</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Doanh thu thuần</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Giá vốn (COGS)</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Lợi nhuận gộp</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Số đơn hàng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 tabular-nums">
              {trendPoints.length > 0 ? (
                trendPoints.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-medium text-slate-600 whitespace-nowrap">
                      {p.timeBucket}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900 whitespace-nowrap">
                      {p.label}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {formatVND(p.revenue)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-600 whitespace-nowrap">
                      {formatVND(p.cogs || 0)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-semibold text-emerald-700 whitespace-nowrap">
                      {formatVND(p.grossProfit || 0)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-900 whitespace-nowrap">
                      {formatNumber(p.orderCount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Chưa có điểm dữ liệu nào
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
