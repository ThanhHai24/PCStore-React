import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Download,
  Boxes,
  CheckCircle2,
  Calendar,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { adminAnalyticsService } from '../../../../services/adminAnalyticsService';
import type {
  InventorySummaryDto,
  CategoryBreakdownDto,
  InventoryAgingBracketDto,
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

export default function InventoryExportReportPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [summary, setSummary] = useState<InventorySummaryDto | null>(null);
  const [categories, setCategories] = useState<CategoryBreakdownDto[]>([]);
  const [aging, setAging] = useState<InventoryAgingBracketDto[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, catRes, agingRes] = await Promise.allSettled([
        adminAnalyticsService.getInventorySummary(),
        adminAnalyticsService.getStockByCategory(),
        adminAnalyticsService.getInventoryAging(),
      ]);

      if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
      if (catRes.status === 'fulfilled') setCategories(catRes.value);
      if (agingRes.status === 'fulfilled') setAging(agingRes.value);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportFullCSV = () => {
    const today = new Date().toISOString().slice(0, 10);
    const lines: string[] = [];

    lines.push('BÁO CÁO TỔNG QUAN TỒN KHO VÀ ĐỊNH GIÁ');
    lines.push(`Ngày xuất báo cáo: ${today}`);
    lines.push('');
    lines.push('1. CHỈ SỐ TỔNG QUAN');
    lines.push(`Tổng serial lưu kho,${summary?.totalSerialsInStore || 0}`);
    lines.push(`Tổng giá trị vốn kho (VND),${summary?.totalInventoryValue || 0}`);
    lines.push(`Serial có thể bán,${summary?.sellableSerials || 0}`);
    lines.push(`Giá trị vốn hàng có thể bán (VND),${summary?.sellableValue || 0}`);
    lines.push(`Serial lỗi / chờ trả NCC,${summary?.defectiveSerials || 0}`);
    lines.push(`Serial đang đóng gói / giao hàng,${summary?.packingAndDeliveringSerials || 0}`);
    lines.push(`Serial kỹ thuật sử dụng,${summary?.technicalUsageSerials || 0}`);
    lines.push('');

    lines.push('2. CƠ CẤU TỒN KHO THEO DANH MỤC');
    lines.push('Danh mục,Số lượng serial,Tỷ trọng (%)');
    categories.forEach((c) => {
      lines.push(`"${c.categoryName}",${c.value},${c.percentage}%`);
    });
    lines.push('');

    lines.push('3. THÁP TUỔI TỒN KHO (AGING)');
    lines.push('Khoảng tuổi,Số lượng serial,Tổng giá trị vốn (VND),Tỷ lệ (%)');
    aging.forEach((a) => {
      lines.push(`"${a.label}",${a.quantity},${a.totalValue},${a.percentage}%`);
    });

    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Bao_Cao_Ton_Kho_Tong_Hop_${today}.csv`;
    link.click();
  };

  return (
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Xuất Báo Cáo Tồn Kho & Hồ Sơ Kiểm Kê
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sparkles className="w-3 h-3 text-emerald-600" /> Export Hub
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Tổng hợp dữ liệu tồn kho, giá trị vốn lưu động và tháp tuổi hàng hóa phục vụ kế toán kiểm kê
          </p>
        </div>

        <button
          onClick={handleExportFullCSV}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Tải Báo Cáo Kiểm Kê (.CSV)</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Tổng Sản phẩm Lưu Kho</span>
          <p className="text-2xl font-black text-gray-900 mt-1">
            {summary ? formatNumber(summary.totalSerialsInStore) : '0'}
          </p>
          <span className="text-[11px] text-gray-400">Khả dụng: {summary?.sellableSerials || 0}</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Tổng Vốn Tồn Kho</span>
          <p className="text-2xl font-black text-blue-600 mt-1">
            {summary ? formatVND(summary.totalInventoryValue) : '0 ₫'}
          </p>
          <span className="text-[11px] text-gray-400">Giá vốn thực tế</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-xs font-semibold text-gray-500">Số Nhóm Ngành Hàng</span>
          <p className="text-2xl font-black text-indigo-600 mt-1">{categories.length}</p>
          <span className="text-[11px] text-gray-400">Đang lưu hành</span>
        </div>
      </div>

      {/* Summary Table Preview */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900 border-b pb-3 border-gray-100">
          Xem Trước Bảng Kê Tồn Kho Theo Danh Mục
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Tên Danh Mục</th>
                <th className="py-2.5 px-3 text-right">Số Lượng Serial Tồn</th>
                <th className="py-2.5 px-3 text-right">Tỷ Trọng (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {categories.map((c, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                  <td className="py-3 px-3 font-bold text-gray-400">{idx + 1}</td>
                  <td className="py-3 px-3 font-semibold text-gray-900">{c.categoryName}</td>
                  <td className="py-3 px-3 text-right font-bold text-blue-600">{formatNumber(c.value)}</td>
                  <td className="py-3 px-3 text-right font-semibold text-gray-700">{c.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
