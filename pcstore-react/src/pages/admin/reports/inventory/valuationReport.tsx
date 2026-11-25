import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { adminAnalyticsService } from '../../../../services/adminAnalyticsService';
import type {
  InventorySummaryDto,
  InventoryAgingBracketDto,
  CategoryBreakdownDto,
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

const AGING_COLORS = ['#059669', '#2563EB', '#D97706', '#E11D48'];

export default function InventoryValuationReportPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<InventorySummaryDto | null>(null);
  const [agingBrackets, setAgingBrackets] = useState<InventoryAgingBracketDto[]>([]);
  const [categoryValues, setCategoryValues] = useState<CategoryBreakdownDto[]>([]);

  const loadValuationData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, agingRes, catRes] = await Promise.allSettled([
        adminAnalyticsService.getInventorySummary(),
        adminAnalyticsService.getInventoryAging(),
        adminAnalyticsService.getStockByCategory(),
      ]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
      if (agingRes.status === 'fulfilled') setAgingBrackets(agingRes.value);
      if (catRes.status === 'fulfilled') setCategoryValues(catRes.value);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadValuationData();
  }, [loadValuationData]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] space-y-5 pb-8">
      {/* ==================== PAGE HEADER ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Báo cáo kho hàng</span>
            <span className="text-slate-300">/</span>
            <span>Định giá &amp; tuổi tồn kho</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Báo cáo định giá hàng tồn kho
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi tổng giá trị vốn tồn kho, vốn khả dụng, tuổi thọ lưu kho và phân bổ theo danh mục linh kiện.
          </p>
        </div>

        <button
          type="button"
          onClick={loadValuationData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* ==================== FLAT 3-COLUMN KPI VALUATION STRIP ==================== */}
      <div className="bg-white border border-slate-200 rounded-md grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Tổng vốn hàng tồn kho</span>
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">
            {summary ? formatVND(summary.totalInventoryValue) : '0 ₫'}
          </p>
          <span className="text-xs text-slate-500">
            {summary ? formatNumber(summary.totalSerialsInStore) : 0} sản phẩm lưu kho
          </span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Vốn hàng có thể bán</span>
          <p className="text-2xl font-semibold text-emerald-700 tracking-tight">
            {summary ? formatVND(summary.sellableValue) : '0 ₫'}
          </p>
          <span className="text-xs text-slate-500">
            {summary ? formatNumber(summary.sellableSerials) : 0} sản phẩm khả dụng
          </span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Hàng lỗi / Chờ trả NCC</span>
          <p
            className={`text-2xl font-semibold tracking-tight ${
              (summary?.defectiveSerials ?? 0) > 0 ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {summary ? formatNumber(summary.defectiveSerials) : 0} sản phẩm
          </p>
          <span className="text-xs text-slate-500">Cần hoàn vốn hoặc đổi mới</span>
        </div>
      </div>

      {/* ==================== AGING CHART & RISK BREAKDOWN ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Aging Chart */}
        <div className="bg-white p-5 rounded-md border border-slate-200 flex flex-col justify-between space-y-4">
          <div className="border-b pb-3 border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">Tháp tuổi tồn kho</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân bổ giá trị vốn theo thời gian lưu kho từ ngày nhập
            </p>
          </div>

          <div className="h-[260px]">
            {agingBrackets.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingBrackets} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                  />
                  <YAxis
                    width={56}
                    tickFormatter={(v) => formatCompactVND(v)}
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatVND(Number(val || 0)), 'Giá trị vốn'] as any}
                    contentStyle={{
                      borderRadius: '6px',
                      borderColor: '#E2E8F0',
                      fontSize: '12px',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                  <Bar dataKey="totalValue" name="Giá trị vốn" radius={[3, 3, 0, 0]} maxBarSize={42}>
                    {agingBrackets.map((_, index) => (
                      <Cell key={`aging-cell-${index}`} fill={AGING_COLORS[index % AGING_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Chưa có dữ liệu tháp tuổi
              </div>
            )}
          </div>
        </div>

        {/* Aging Brackets Detailed Breakdown (flat divide-y, no card-in-card) */}
        <div className="bg-white rounded-md border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">Mức độ rủi ro tồn đọng vốn</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Đánh giá các phân khúc tuổi thọ linh kiện trong kho
            </p>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {agingBrackets.length > 0 ? (
              agingBrackets.map((b, idx) => (
                <div key={b.bracket ?? idx} className="px-5 py-3.5 space-y-1.5 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: AGING_COLORS[idx % AGING_COLORS.length] }}
                      />
                      <span className="font-medium text-slate-900 truncate">{b.label}</span>
                    </div>
                    <span className="font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatVND(b.totalValue)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500 tabular-nums">
                    <span>{formatNumber(b.quantity)} serial</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-slate-100 rounded-sm overflow-hidden">
                        <div
                          className="h-full rounded-sm"
                          style={{
                            width: `${Math.min(100, b.percentage)}%`,
                            backgroundColor: AGING_COLORS[idx % AGING_COLORS.length],
                          }}
                        />
                      </div>
                      <span className="font-medium text-slate-700 w-10 text-right">{b.percentage}%</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center text-xs text-slate-400">
                Chưa có dữ liệu phân khúc tuổi kho
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== CATEGORY BREAKDOWN TABLE ==================== */}
      {categoryValues.length > 0 && (
        <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Cơ cấu tồn kho theo danh mục linh kiện
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Phân bổ số lượng và tỷ trọng tồn kho giữa các nhóm phần cứng
              </p>
            </div>
            <span className="text-xs text-slate-500 tabular-nums shrink-0">
              <strong className="font-medium text-slate-900">{formatNumber(categoryValues.length)}</strong> danh mục
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 w-12">#</th>
                  <th className="py-2.5 px-4">Danh mục linh kiện</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Số lượng tồn</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap min-w-[160px]">Tỷ trọng (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 tabular-nums">
                {categoryValues.map((c, idx) => (
                  <tr key={c.categoryId ?? idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-400">{idx + 1}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{c.categoryName}</td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {formatNumber(c.value)}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2.5">
                        <div className="w-20 h-1.5 bg-slate-100 rounded-sm overflow-hidden shrink-0">
                          <div
                            className="h-full bg-blue-600 rounded-sm"
                            style={{ width: `${Math.min(100, c.percentage)}%` }}
                          />
                        </div>
                        <span className="font-medium text-slate-700 w-10 text-right">
                          {c.percentage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
