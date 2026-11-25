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
} from 'recharts';
import { adminAnalyticsService } from '../../../../services/adminAnalyticsService';
import type {
  InventorySummaryDto,
  CategoryBreakdownDto,
  OrderStatusDistributionDto,
} from '../../../../types/adminAnalytics';

function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('vi-VN').format(num || 0);
}

const COLORS = ['#2563EB', '#059669', '#0EA5E9', '#64748B', '#D97706', '#E11D48', '#6366F1', '#0D9488'];

export default function InventoryStockReportPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<InventorySummaryDto | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdownDto[]>([]);
  const [serialStatus, setSerialStatus] = useState<OrderStatusDistributionDto[]>([]);

  const loadStockData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, catRes, statusRes] = await Promise.allSettled([
        adminAnalyticsService.getInventorySummary(),
        adminAnalyticsService.getStockByCategory(),
        adminAnalyticsService.getSerialStatusDistribution(),
      ]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
      if (catRes.status === 'fulfilled') setCategories(catRes.value);
      if (statusRes.status === 'fulfilled') setSerialStatus(statusRes.value);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStockData();
  }, [loadStockData]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] space-y-5 pb-8">
      {/* ==================== PAGE HEADER ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Báo cáo kho hàng</span>
            <span className="text-slate-300">/</span>
            <span>Tồn kho thời gian thực</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Báo cáo tồn kho &amp; quản lý serial
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tổng quan số lượng khả dụng, giá trị vốn tồn kho và cơ cấu phân bổ trạng thái linh kiện theo danh mục.
          </p>
        </div>

        <button
          type="button"
          onClick={loadStockData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* ==================== FLAT 5-COLUMN KPI STRIP ==================== */}
      <div className="bg-white border border-slate-200 rounded-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Tổng sản phẩm trong kho</span>
          <p className="text-xl font-semibold text-slate-900 tracking-tight">
            {summary ? formatNumber(summary.totalSerialsInStore) : '0'}
          </p>
          <span className="text-[11px] text-slate-500">Tổng serial đang quản lý</span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Sản phẩm có thể bán</span>
          <p className="text-xl font-semibold text-emerald-700 tracking-tight">
            {summary ? formatNumber(summary.sellableSerials) : '0'}
          </p>
          <span className="text-[11px] text-slate-500">Sẵn sàng xuất bán ngay</span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Tổng giá trị vốn kho</span>
          <p className="text-xl font-semibold text-slate-900 tracking-tight">
            {summary ? formatVND(summary.totalInventoryValue) : '0 ₫'}
          </p>
          <span className="text-[11px] text-slate-500">Định giá theo giá vốn nhập</span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Hàng lỗi / Chờ trả</span>
          <p
            className={`text-xl font-semibold tracking-tight ${
              (summary?.defectiveSerials ?? 0) > 0 ? 'text-rose-600' : 'text-slate-900'
            }`}
          >
            {summary ? formatNumber(summary.defectiveSerials) : '0'}
          </p>
          <span className="text-[11px] text-slate-500">Cần xử lý bảo hành / NCC</span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Đang đóng gói / Giao</span>
          <p className="text-xl font-semibold text-slate-900 tracking-tight">
            {summary ? formatNumber(summary.packingAndDeliveringSerials) : '0'}
          </p>
          <span className="text-[11px] text-slate-500">Đang giữ chỗ cho đơn hàng</span>
        </div>
      </div>

      {/* ==================== CHARTS GRID ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Category Stock Distribution */}
        <div className="bg-white p-5 rounded-md border border-slate-200 flex flex-col justify-between space-y-4">
          <div className="border-b pb-3 border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              Phân bổ tồn kho theo danh mục
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Số lượng serial có sẵn theo từng nhóm phần cứng
            </p>
          </div>

          <div className="h-[260px]">
            {categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories} margin={{ top: 8, right: 12, left: -8, bottom: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="categoryName"
                    tick={{ fontSize: 10, fill: '#64748B' }}
                    axisLine={{ stroke: '#E2E8F0' }}
                    tickLine={false}
                    interval={0}
                    angle={-22}
                    textAnchor="end"
                    height={48}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748B' }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    formatter={(val: any) => [formatNumber(Number(val || 0)) + ' chiếc', 'Số lượng tồn'] as any}
                    contentStyle={{
                      borderRadius: '6px',
                      borderColor: '#E2E8F0',
                      fontSize: '12px',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                  <Bar dataKey="value" name="Tồn kho" fill="#2563EB" radius={[3, 3, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Chưa có dữ liệu danh mục
              </div>
            )}
          </div>
        </div>

        {/* Serial Status Breakdown */}
        <div className="bg-white p-5 rounded-md border border-slate-200 flex flex-col space-y-4">
          <div className="border-b pb-3 border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              Cơ cấu trạng thái serial kho
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tỷ lệ các trạng thái vòng đời serial trong hệ thống kho
            </p>
          </div>

          <div className="space-y-3.5 pt-1 flex-1">
            {serialStatus.length > 0 ? (
              serialStatus.map((st, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="inline-flex items-center gap-2 text-slate-700 font-medium">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span>{st.label}</span>
                    </span>
                    <span className="text-slate-900 font-semibold tabular-nums whitespace-nowrap">
                      {formatNumber(st.count)} chiếc{' '}
                      <span className="text-slate-500 font-normal">({st.percentage}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-sm h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-sm transition-all duration-300"
                      style={{
                        width: `${Math.min(100, st.percentage)}%`,
                        backgroundColor: COLORS[idx % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="h-[220px] flex items-center justify-center text-xs text-slate-400">
                Chưa có dữ liệu trạng thái serial
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== CATEGORY BREAKDOWN TABLE ==================== */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Chi tiết tồn kho theo từng danh mục
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tổng hợp số lượng serial tồn và tỷ trọng đóng góp trên toàn kho
            </p>
          </div>
          <span className="text-xs text-slate-500 tabular-nums shrink-0">
            <strong className="font-medium text-slate-900">{formatNumber(categories.length)}</strong> danh mục
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 w-12">#</th>
                <th className="py-2.5 px-4">Danh mục phần cứng</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Số lượng serial tồn</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap min-w-[160px]">Tỷ trọng (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 tabular-nums">
              {categories.length > 0 ? (
                categories.map((c, idx) => (
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
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400">
                    Chưa có dữ liệu phân bổ
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
