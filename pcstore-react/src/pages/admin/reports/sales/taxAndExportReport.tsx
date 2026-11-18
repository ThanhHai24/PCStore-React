import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  RefreshCw,
  Coins,
  Receipt,
  FileCheck,
  AlertCircle,
  Building,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { SelectDropdown } from '../../../../components/admin/common/selectDropdown';
import { adminAnalyticsService } from '../../../../services/adminAnalyticsService';
import type {
  TaxSummaryResponse,
  TaxQuarterlyResponse,
  TaxInvoiceDetailDto,
  PageResponse,
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

function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TaxAndExportReportPage() {
  const currentYear = new Date().getFullYear();

  const [year, setYear] = useState<number>(currentYear);
  const [quarter, setQuarter] = useState<number | undefined>(undefined);
  const [month, setMonth] = useState<number | undefined>(undefined);

  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [taxSummary, setTaxSummary] = useState<TaxSummaryResponse | null>(null);
  const [quarterlyData, setQuarterlyData] = useState<TaxQuarterlyResponse | null>(null);
  const [invoicesPage, setInvoicesPage] = useState<PageResponse<TaxInvoiceDetailDto> | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize] = useState<number>(10);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadTaxData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const filter = {
        year,
        quarter: quarter || undefined,
        month: month || undefined,
      };

      const [summaryRes, quarterlyRes, invoicesRes] = await Promise.allSettled([
        adminAnalyticsService.getTaxSummary(filter),
        adminAnalyticsService.getTaxQuarterlyBreakdown(year),
        adminAnalyticsService.getTaxInvoices(filter, currentPage, pageSize),
      ]);

      if (summaryRes.status === 'fulfilled') setTaxSummary(summaryRes.value);
      if (quarterlyRes.status === 'fulfilled') setQuarterlyData(quarterlyRes.value);
      if (invoicesRes.status === 'fulfilled') setInvoicesPage(invoicesRes.value);

      if (summaryRes.status === 'rejected') {
        setErrorMsg('Không thể kết nối API Báo cáo thuế từ Backend.');
      }
    } catch {
      setErrorMsg('Đã xảy ra lỗi khi tải dữ liệu báo cáo thuế.');
    } finally {
      setLoading(false);
    }
  }, [year, quarter, month, currentPage, pageSize]);

  useEffect(() => {
    loadTaxData();
  }, [loadTaxData]);

  const handleDownloadExcel = async () => {
    setDownloading(true);
    try {
      const filter = {
        year,
        quarter: quarter || undefined,
        month: month || undefined,
      };
      const blob = await adminAnalyticsService.downloadTaxExcel(filter);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bao_Cao_Hoach_Toan_Thue_${year}${quarter ? `_Q${quarter}` : ''}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message || 'Lỗi khi tải file Excel báo cáo thuế');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Báo Cáo Hoạch Toán Thuế & Xuất Tờ Khai Doanh Nghiệp
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sparkles className="w-3 h-3 text-emerald-600" /> Tax Compliance
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Tính toán nghĩa vụ thuế GTGT & TNCN trực tiếp theo doanh thu luỹ tiến và xuất file Excel chuẩn kiểm toán
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year selector */}
          <SelectDropdown
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setCurrentPage(0);
            }}
            options={[2024, 2025, 2026, 2027].map((y) => ({
              label: `Năm ${y}`,
              value: y,
            }))}
            size="sm"
            className="w-32"
            triggerClassName="bg-gray-50 border-gray-200 rounded-xl text-xs font-semibold text-gray-700"
          />

          {/* Quarter selector */}
          <SelectDropdown
            value={quarter ?? ''}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : undefined;
              setQuarter(val);
              setMonth(undefined);
              setCurrentPage(0);
            }}
            options={[
              { label: 'Cả Năm', value: '' },
              { label: 'Quý 1', value: '1' },
              { label: 'Quý 2', value: '2' },
              { label: 'Quý 3', value: '3' },
              { label: 'Quý 4', value: '4' },
            ]}
            size="sm"
            className="w-32"
            triggerClassName="bg-gray-50 border-gray-200 rounded-xl text-xs font-semibold text-gray-700"
          />

          {/* Download Excel Button */}
          <button
            onClick={handleDownloadExcel}
            disabled={downloading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-xs"
          >
            <FileSpreadsheet className={`w-4 h-4 ${downloading ? 'animate-bounce' : ''}`} />
            <span>{downloading ? 'Đang xuất Excel...' : 'Xuất File Excel (.xlsx)'}</span>
          </button>

          <button
            onClick={loadTaxData}
            disabled={loading}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs transition-colors disabled:opacity-50"
            title="Làm mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Tax Tier Information Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-400" />
            <span className="text-xs uppercase tracking-wider font-bold text-gray-300">
              Chính Sách Khung Thuế Trực Tiếp Áp Dụng (Năm {year})
            </span>
          </div>
          <span className="text-xs text-emerald-400 font-bold">
            Khung hiện tại: {taxSummary?.tierDescription || 'Doanh thu phân khúc'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
            <span className="text-gray-400 text-[10px] block">Doanh thu &lt; 1 Tỷ / năm</span>
            <p className="font-bold text-white mt-0.5">Miễn thuế (0%)</p>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
            <span className="text-gray-400 text-[10px] block">Doanh thu 1 - 3 Tỷ / năm</span>
            <p className="font-bold text-white mt-0.5">GTGT 1% + TNCN 0.5% = 1.5%</p>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
            <span className="text-gray-400 text-[10px] block">Doanh thu 3 - 50 Tỷ / năm</span>
            <p className="font-bold text-emerald-300 mt-0.5">GTGT 8% + TNCN 17% = 25%</p>
          </div>
          <div className="bg-white/5 p-2.5 rounded-xl border border-white/5">
            <span className="text-gray-400 text-[10px] block">Doanh thu &gt; 50 Tỷ / năm</span>
            <p className="font-bold text-amber-300 mt-0.5">GTGT 8% + TNCN 20% = 28%</p>
          </div>
        </div>
      </div>

      {/* 5 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-500">Doanh Thu Chịu Thuế</span>
          <p className="text-lg font-black text-gray-900 mt-2">
            {taxSummary ? formatVND(taxSummary.annualNetRevenue) : '0 ₫'}
          </p>
          <span className="text-[11px] text-gray-400 mt-1">Căn cứ tính toán kỳ {year}</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-500">
            Thuế GTGT ({taxSummary ? (taxSummary.vatRate * 100).toFixed(0) : 0}%)
          </span>
          <p className="text-lg font-black text-blue-600 mt-2">
            {taxSummary ? formatVND(taxSummary.vatAmount) : '0 ₫'}
          </p>
          <span className="text-[11px] text-blue-500 mt-1">Giá trị gia tăng</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-500">
            Thuế TNCN ({taxSummary ? (taxSummary.pitRate * 100).toFixed(1) : 0}%)
          </span>
          <p className="text-lg font-black text-indigo-600 mt-2">
            {taxSummary ? formatVND(taxSummary.pitAmount) : '0 ₫'}
          </p>
          <span className="text-[11px] text-indigo-500 mt-1">Thu nhập cá nhân</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-500">
            Tổng Thuế Phải Nộp ({(taxSummary ? taxSummary.totalTaxRate * 100 : 0).toFixed(1)}%)
          </span>
          <p className="text-lg font-black text-rose-600 mt-2">
            {taxSummary ? formatVND(taxSummary.totalTaxAmount) : '0 ₫'}
          </p>
          <span className="text-[11px] text-rose-500 font-bold mt-1">Nghĩa vụ ngân sách</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between">
          <span className="text-xs font-semibold text-gray-500">Hóa Đơn Hợp Lệ</span>
          <p className="text-lg font-black text-emerald-600 mt-2">
            {taxSummary ? formatNumber(taxSummary.totalPaidInvoices) : '0'}
          </p>
          <span className="text-[11px] text-gray-400 mt-1">Hóa đơn đã xuất kho</span>
        </div>
      </div>

      {/* Quarterly Breakdown Table */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Bảng Phân Bổ Nghĩa Vụ Thuế 4 Quý Trong Năm {year}</span>
            </h2>
            <p className="text-xs text-gray-500">Tạm tính nghĩa vụ thuế luỹ kế theo quý tài chính</p>
          </div>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
            Thuế suất áp dụng: {((quarterlyData?.appliedTaxRate ?? 0) * 100).toFixed(1)}%
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3">Quý</th>
                <th className="py-2.5 px-3 text-right">Doanh Thu Quý</th>
                <th className="py-2.5 px-3 text-right">Thuế GTGT</th>
                <th className="py-2.5 px-3 text-right">Thuế TNCN</th>
                <th className="py-2.5 px-3 text-right">Tổng Nghĩa Vụ Thuế</th>
                <th className="py-2.5 px-3 text-right">Số Lượng Hóa Đơn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {quarterlyData?.quarters && quarterlyData.quarters.length > 0 ? (
                quarterlyData.quarters.map((q) => (
                  <tr key={q.quarter} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-3 font-bold text-blue-600">Quý {q.quarter} / {year}</td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900">{formatVND(q.quarterRevenue)}</td>
                    <td className="py-3 px-3 text-right text-blue-600 font-medium">{formatVND(q.vatAmount)}</td>
                    <td className="py-3 px-3 text-right text-indigo-600 font-medium">{formatVND(q.pitAmount)}</td>
                    <td className="py-3 px-3 text-right font-black text-rose-600">{formatVND(q.totalTax)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-700">{formatNumber(q.invoiceCount)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-400">
                    Chưa có số liệu phân bổ quý
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tax Invoices Table */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-purple-600" />
              <span>Bảng Kê Hóa Đơn Chi Tiết Cấu Thành Doanh Thu Tính Thuế</span>
            </h2>
            <p className="text-xs text-gray-500">Danh sách các hóa đơn phát sinh doanh thu phục vụ kiểm toán</p>
          </div>
          <span className="text-xs text-gray-500 font-medium">
            Tổng cộng: <strong>{invoicesPage?.totalElements || 0}</strong> hóa đơn
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3">Mã Hóa Đơn</th>
                <th className="py-2.5 px-3">Ngày Lập</th>
                <th className="py-2.5 px-3">Mã Đơn Hàng</th>
                <th className="py-2.5 px-3">Khách Hàng</th>
                <th className="py-2.5 px-3">Số Điện Thoại</th>
                <th className="py-2.5 px-3 text-right">Tổng Tiền</th>
                <th className="py-2.5 px-3 text-right">Chiết Khấu</th>
                <th className="py-2.5 px-3 text-right">Doanh Thu Tính Thuế</th>
                <th className="py-2.5 px-3 text-right">Thuế GTGT</th>
                <th className="py-2.5 px-3 text-right">Thuế TNCN</th>
                <th className="py-2.5 px-3 text-center">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {invoicesPage?.content && invoicesPage.content.length > 0 ? (
                invoicesPage.content.map((inv: TaxInvoiceDetailDto) => (
                  <tr key={inv.invoiceId} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-blue-600">{inv.invoiceCode}</td>
                    <td className="py-3 px-3 text-gray-600">{formatDate(inv.invoiceDate)}</td>
                    <td className="py-3 px-3 font-semibold text-gray-900">{inv.orderCode}</td>
                    <td className="py-3 px-3 font-medium text-gray-800">{inv.customerName}</td>
                    <td className="py-3 px-3 text-gray-500 font-mono">{inv.customerPhone || 'N/A'}</td>
                    <td className="py-3 px-3 text-right text-gray-700">{formatVND(inv.totalAmount)}</td>
                    <td className="py-3 px-3 text-right text-rose-500">{formatVND(inv.discountAmount)}</td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900">{formatVND(inv.amount)}</td>
                    <td className="py-3 px-3 text-right text-blue-600 font-medium">{formatVND(inv.vatAmount)}</td>
                    <td className="py-3 px-3 text-right text-indigo-600 font-medium">{formatVND(inv.pitAmount)}</td>
                    <td className="py-3 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {inv.status || 'PAID'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-gray-400">
                    Không có hóa đơn nào trong kỳ khai thuế này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {invoicesPage && invoicesPage.totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
            <span className="text-gray-500">
              Trang {invoicesPage.pageNo + 1} / {invoicesPage.totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={invoicesPage.pageNo === 0}
                className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={invoicesPage.last}
                className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
