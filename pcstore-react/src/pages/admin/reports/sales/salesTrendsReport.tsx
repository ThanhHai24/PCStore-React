import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart as LineChartIcon,
  TrendingUp,
  Calendar,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  DollarSign,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Biểu Đồ Xu Hướng Kinh Doanh & Tăng Trưởng</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3 h-3 text-blue-600" /> Time-series Velocity
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Phân tích tốc độ tăng trưởng, đối chiếu chu kỳ so sánh và xu thế dòng tiền
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* GroupBy */}
          <SelectDropdown
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupByTime)}
            options={[
              { label: 'Nhóm theo Ngày', value: 'DAY' },
              { label: 'Nhóm theo Tuần', value: 'WEEK' },
              { label: 'Nhóm theo Tháng', value: 'MONTH' },
              { label: 'Nhóm theo Năm', value: 'YEAR' },
            ]}
            size="sm"
            className="w-40"
            triggerClassName="bg-gray-50 border-gray-200 rounded-xl text-xs font-semibold text-gray-700"
          />

          {/* CompareWith */}
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
            triggerClassName="bg-gray-50 border-gray-200 rounded-xl text-xs font-semibold text-gray-700"
          />

          {/* Date Picker */}
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
            onClick={loadTrends}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Lọc</span>
          </button>
        </div>
      </div>

      {/* Period Comparison Card */}
      {comparison && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-6 rounded-2xl shadow-md">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-wider text-blue-200 font-semibold">
                Đối Chiếu Đa Kỳ ({comparison.currentPeriodLabel} vs {comparison.comparedPeriodLabel})
              </span>
              <div className="flex items-baseline gap-3">
                <h3 className="text-3xl font-black">{formatVND(comparison.currentRevenue)}</h3>
                <div
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                    isGrowthPositive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {isGrowthPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  <span>{isGrowthPositive ? '+' : ''}{comparison.growthRatePercentage}%</span>
                </div>
              </div>
              <p className="text-xs text-blue-200">
                Chênh lệch tuyệt đối:{' '}
                <strong className={isGrowthPositive ? 'text-emerald-300' : 'text-rose-300'}>
                  {formatVND(comparison.growthAmount)}
                </strong>{' '}
                so với mức {formatVND(comparison.comparedRevenue)} của kỳ đối chiếu.
              </p>
            </div>

            <div className="flex items-center gap-4 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-6">
              <div>
                <span className="text-[11px] text-blue-300 block">Kỳ này ({comparison.currentPeriodLabel})</span>
                <span className="text-lg font-bold">{formatVND(comparison.currentRevenue)}</span>
              </div>
              <div className="text-blue-300 text-xl font-thin">/</div>
              <div>
                <span className="text-[11px] text-blue-300 block">Kỳ trước ({comparison.comparedPeriodLabel})</span>
                <span className="text-lg font-bold">{formatVND(comparison.comparedRevenue)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Trends Chart */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <LineChartIcon className="w-4 h-4 text-blue-600" />
              <span>Biểu Đồ Xu Hướng Doanh Thu Thuần & Đơn Hàng</span>
            </h2>
            <p className="text-xs text-gray-500">Đường cong diễn biến liên tục theo thời gian thực</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors self-start"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>
        </div>

        <div className="h-[360px] w-full">
          {trendPoints.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendPoints} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                    if (name === 'Doanh thu thuần' || name === 'Lợi nhuận gộp') return [formatVND(numVal), name] as any;
                    return [formatNumber(numVal) + ' đơn', name || ''] as any;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  name="Doanh thu thuần"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#trendRevenueGrad)"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="grossProfit"
                  name="Lợi nhuận gộp"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Bar
                  yAxisId="right"
                  dataKey="orderCount"
                  name="Số đơn hàng"
                  fill="#F59E0B"
                  maxBarSize={24}
                  radius={[4, 4, 0, 0]}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-xs text-gray-400 pt-32">Chưa có dữ liệu xu hướng trong khoảng thời gian này</p>
          )}
        </div>
      </div>

      {/* Detail Points Table */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900 border-b pb-3 border-gray-100">
          Chi Tiết Dữ Liệu Từng Mốc Thời Gian
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3">Mốc Thời Gian</th>
                <th className="py-2.5 px-3">Nhãn</th>
                <th className="py-2.5 px-3 text-right">Doanh Thu Thuần</th>
                <th className="py-2.5 px-3 text-right">Giá Vốn COGS</th>
                <th className="py-2.5 px-3 text-right">Lợi Nhuận Gộp</th>
                <th className="py-2.5 px-3 text-right">Số Đơn Hàng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {trendPoints.length > 0 ? (
                trendPoints.map((p, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-gray-600">{p.timeBucket}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-900">{p.label}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-blue-600">{formatVND(p.revenue)}</td>
                    <td className="py-2.5 px-3 text-right text-rose-600 font-medium">{formatVND(p.cogs || 0)}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-600 font-bold">{formatVND(p.grossProfit || 0)}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-600">{formatNumber(p.orderCount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
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
