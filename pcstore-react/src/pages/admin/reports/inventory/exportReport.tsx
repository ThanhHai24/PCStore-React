import { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
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

  const snapshotDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-[#F8FAFC] space-y-5 pb-8">
      {/* ==================== PAGE HEADER ==================== */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Báo cáo kho hàng</span>
            <span className="text-slate-300">/</span>
            <span className="tabular-nums">Chốt tồn ngày: {snapshotDate}</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Xuất báo cáo tồn kho &amp; hồ sơ kiểm kê
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp số lượng tồn kho, giá trị vốn lưu động và tháp tuổi hàng hóa phục vụ kế toán kiểm kê.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            onClick={handleExportFullCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Tải báo cáo kiểm kê (.CSV)</span>
          </button>
        </div>
      </div>

      {/* ==================== EXPORT SPECIFICATION BAR ==================== */}
      <div className="bg-white border border-slate-200 rounded-md px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-2 text-slate-600">
          <span className="font-medium text-slate-900">Nội dung tệp xuất:</span>
          <span>Chỉ số tổng quan</span>
          <span className="text-slate-300">•</span>
          <span>Cơ cấu theo danh mục</span>
          <span className="text-slate-300">•</span>
          <span>Tháp tuổi tồn kho (Aging)</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 tabular-nums shrink-0">
          <span>Định dạng:</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 font-medium text-[11px]">
            CSV (UTF-8)
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
            <span className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <span>{loading ? 'Đang đồng bộ' : 'Sẵn sàng'}</span>
          </span>
        </div>
      </div>

      {/* ==================== FLAT 3-COLUMN SUMMARY STRIP ==================== */}
      <div className="bg-white border border-slate-200 rounded-md grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Tổng sản phẩm lưu kho</span>
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">
            {summary ? formatNumber(summary.totalSerialsInStore) : '0'}
          </p>
          <span className="text-xs text-slate-500">
            Khả dụng: {formatNumber(summary?.sellableSerials || 0)} serial
          </span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Tổng vốn tồn kho</span>
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">
            {summary ? formatVND(summary.totalInventoryValue) : '0 ₫'}
          </p>
          <span className="text-xs text-slate-500">Định giá theo giá vốn thực tế</span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Số nhóm ngành hàng</span>
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">
            {formatNumber(categories.length)}
          </p>
          <span className="text-xs text-slate-500">Danh mục đang có tồn kho</span>
        </div>
      </div>

      {/* ==================== SUMMARY TABLE PREVIEW ==================== */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Xem trước bảng kê tồn kho theo danh mục
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Dữ liệu phần 2 trong tệp báo cáo kiểm kê CSV
            </p>
          </div>
          <span className="text-xs text-slate-500 tabular-nums shrink-0">
            <strong className="font-medium text-slate-900">{formatNumber(categories.length)}</strong> dòng
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 w-12">#</th>
                <th className="py-2.5 px-4">Tên danh mục</th>
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
                    Chưa có dữ liệu tồn kho theo danh mục
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== AGING PREVIEW TABLE ==================== */}
      {aging.length > 0 && (
        <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Xem trước tháp tuổi tồn kho (Aging)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Dữ liệu phần 3 trong tệp báo cáo kiểm kê CSV
              </p>
            </div>
            <span className="text-xs text-slate-500 tabular-nums shrink-0">
              <strong className="font-medium text-slate-900">{formatNumber(aging.length)}</strong> phân khúc
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Khoảng tuổi tồn kho</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Số lượng serial</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Tổng giá trị vốn</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Tỷ lệ (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 tabular-nums">
                {aging.map((a, idx) => (
                  <tr key={a.bracket ?? idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900">{a.label}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                      {formatNumber(a.quantity)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {formatVND(a.totalValue)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                      {a.percentage}%
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
