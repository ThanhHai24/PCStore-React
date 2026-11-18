import React, { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  Package,
  Layers,
  Barcode,
  Calendar,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

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
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Báo Cáo Tồn Kho & Quản Lý Serial</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3 h-3 text-blue-600" /> Stock Real-time
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Tổng quan số lượng, giá trị vốn tồn kho và cơ cấu phân bổ trạng thái linh kiện
          </p>
        </div>

        <button
          onClick={loadStockData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-600 mb-2">
            <span className="text-xs font-semibold text-gray-500">Tổng Serial Trong Kho</span>
            <Boxes className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xl font-black text-gray-900">
              {summary ? formatNumber(summary.totalSerialsInStore) : '0'}
            </p>
            <span className="text-[11px] text-gray-400 mt-1 block">Tất cả trạng thái</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-xs font-semibold text-gray-500">Serial Có Thể Bán</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-black text-emerald-600">
              {summary ? formatNumber(summary.sellableSerials) : '0'}
            </p>
            <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
              Vốn: {summary ? formatCompactVND(summary.sellableValue) : '0 ₫'}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-indigo-600 mb-2">
            <span className="text-xs font-semibold text-gray-500">Tổng Giá Trị Vốn Kho</span>
            <Package className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-xl font-black text-indigo-600">
              {summary ? formatVND(summary.totalInventoryValue) : '0 ₫'}
            </p>
            <span className="text-[11px] text-gray-400 mt-1 block">Định giá theo giá nhập kho</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-xs font-semibold text-gray-500">Serial Lỗi / Chờ Trả</span>
            <RotateCcw className="w-4 h-4 text-rose-600" />
          </div>
          <div>
            <p className="text-xl font-black text-rose-600">
              {summary ? formatNumber(summary.defectiveSerials) : '0'}
            </p>
            <span className="text-[11px] text-rose-500 font-medium mt-1 block">Cần hoàn trả nhà cung cấp</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-semibold text-gray-500">Đang Đóng Gói / Giao</span>
            <Truck className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-xl font-black text-amber-600">
              {summary ? formatNumber(summary.packingAndDeliveringSerials) : '0'}
            </p>
            <span className="text-[11px] text-gray-400 mt-1 block">Đang trên luồng xuất</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Stock Distribution */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="border-b pb-3 border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Phân Bổ Tồn Kho Theo Danh Mục</span>
            </h2>
            <p className="text-xs text-gray-500">Số lượng serial có sẵn theo từng nhóm phần cứng</p>
          </div>

          <div className="h-[260px]">
            {categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categories} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="categoryName" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any) => [formatNumber(Number(val || 0)) + ' chiếc', 'Số lượng tồn'] as any} />
                  <Bar dataKey="value" name="Tồn kho" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-xs text-gray-400 pt-24">Chưa có dữ liệu danh mục</p>
            )}
          </div>
        </div>

        {/* Serial Status Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="border-b pb-3 border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Barcode className="w-4 h-4 text-purple-600" />
              <span>Cơ Cấu Trạng Thái Serial Kho</span>
            </h2>
            <p className="text-xs text-gray-500">Tỷ lệ các trạng thái vòng đời serial trong kho</p>
          </div>

          <div className="space-y-3 pt-2">
            {serialStatus.length > 0 ? (
              serialStatus.map((st, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-gray-700">{st.label}</span>
                    <span className="text-gray-900 font-semibold">
                      {formatNumber(st.count)} chiếc ({st.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-2.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${st.percentage}%`,
                        backgroundColor: COLORS[idx % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-gray-400 py-16">Chưa có dữ liệu trạng thái serial</p>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900 border-b pb-3 border-gray-100">
          Chi Tiết Tồn Kho Theo Từng Danh Mục
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Tên Danh Mục Phần Cứng</th>
                <th className="py-2.5 px-3 text-right">Số Lượng Serial Tồn</th>
                <th className="py-2.5 px-3 text-right">Tỷ Trọng (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {categories.length > 0 ? (
                categories.map((c, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-3 font-bold text-gray-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-semibold text-gray-900">{c.categoryName}</td>
                    <td className="py-3 px-3 text-right font-bold text-blue-600">{formatNumber(c.value)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-700">{c.percentage}%</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-gray-400">
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
