import React, { useState, useEffect, useCallback } from 'react';
import {
  Coins,
  Boxes,
  Clock,
  Layers,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
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

const AGING_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444'];

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
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Báo Cáo Định Giá Hàng Tồn Kho & Tháp Tuổi Kho (Aging)
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <Sparkles className="w-3 h-3 text-amber-600" /> Valuation & Aging
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Đánh giá quy mô vốn ứ đọng, tháp tuổi linh kiện và phân bổ dòng tiền lưu kho
          </p>
        </div>

        <button
          onClick={loadValuationData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 3 Large KPI Valuation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Tổng Vốn Hàng Tồn Kho</span>
            <p className="text-2xl font-black text-blue-600 mt-1">
              {summary ? formatVND(summary.totalInventoryValue) : '0 ₫'}
            </p>
            <span className="text-[11px] text-gray-400 font-medium">Toàn bộ serial lưu kho</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Coins className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Vốn Hàng Có Thể Bán (Sellable)</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {summary ? formatVND(summary.sellableValue) : '0 ₫'}
            </p>
            <span className="text-[11px] text-emerald-600 font-medium">
              {summary ? formatNumber(summary.sellableSerials) : 0} serial khả dụng
            </span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-7 h-7" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Vốn Hàng Lỗi / Chờ Trả NCC</span>
            <p className="text-2xl font-black text-rose-600 mt-1">
              {summary ? formatNumber(summary.defectiveSerials) : 0} serial
            </p>
            <span className="text-[11px] text-rose-500 font-medium">Cần hoàn vốn hoặc đổi mới</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <AlertTriangle className="w-7 h-7" />
          </div>
        </div>
      </div>

      {/* Aging Pyramid Chart & Brackets Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aging Chart */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="border-b pb-3 border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Tháp Tuổi Tồn Kho (Inventory Aging)</span>
            </h2>
            <p className="text-xs text-gray-500">Phân bổ giá trị vốn theo thời gian lưu kho từ ngày nhập</p>
          </div>

          <div className="h-[260px]">
            {agingBrackets.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={agingBrackets} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tickFormatter={(v) => formatCompactVND(v)} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(val: any) => [formatVND(Number(val || 0)), 'Giá trị vốn'] as any} />
                  <Bar dataKey="totalValue" name="Giá trị vốn" radius={[4, 4, 0, 0]} maxBarSize={45}>
                    {agingBrackets.map((_, index) => (
                      <Cell key={`aging-cell-${index}`} fill={AGING_COLORS[index % AGING_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-xs text-gray-400 pt-24">Chưa có dữ liệu tháp tuổi</p>
            )}
          </div>
        </div>

        {/* Aging Brackets Detailed Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="border-b pb-3 border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-600" />
              <span>Mức Độ Rủi Ro Tồn Đọng Vốn</span>
            </h2>
            <p className="text-xs text-gray-500">Đánh giá các phân khúc tuổi thọ linh kiện trong kho</p>
          </div>

          <div className="space-y-3 pt-2">
            {agingBrackets.map((b, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: AGING_COLORS[idx % AGING_COLORS.length] }}
                    />
                    <strong className="text-gray-900">{b.label}</strong>
                  </div>
                  <span className="font-bold text-gray-900">{formatVND(b.totalValue)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>Số lượng: {formatNumber(b.quantity)} serial</span>
                  <span className="font-semibold text-blue-600">{b.percentage}% tổng kho</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
