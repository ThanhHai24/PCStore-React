import { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
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
    <div className="min-h-screen bg-[#F8FAFC] space-y-5 pb-8">
      {/* ==================== PAGE HEADER ==================== */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Báo cáo bán hàng</span>
            <span className="text-slate-300">/</span>
            <span className="tabular-nums">
              Kỳ kê khai: Năm {year}
              {quarter ? ` — Quý ${quarter}` : ' (Cả năm)'}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Xuất file báo cáo &amp; hạch toán thuế
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp nghĩa vụ thuế GTGT &amp; TNCN trực tiếp theo doanh thu lũy tiến và xuất tệp Excel (.xlsx) chuẩn kiểm toán.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={loadTaxData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${downloading ? 'animate-pulse' : ''}`} />
            <span>{downloading ? 'Đang tạo file...' : 'Xuất Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* ==================== EXPORT PARAMETERS BAR ==================== */}
      <div className="bg-white border border-slate-200 rounded-md p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-medium text-slate-500">Kỳ báo cáo:</span>
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
            className="w-28"
            triggerClassName="h-8 bg-white border-slate-200 rounded-md text-xs font-medium text-slate-800 tabular-nums"
          />

          <div className="inline-flex rounded-md bg-slate-100 p-0.5 border border-slate-200">
            {[
              { label: 'Cả năm', value: undefined as number | undefined },
              { label: 'Quý 1', value: 1 },
              { label: 'Quý 2', value: 2 },
              { label: 'Quý 3', value: 3 },
              { label: 'Quý 4', value: 4 },
            ].map((qOpt) => {
              const isActive = quarter === qOpt.value;
              return (
                <button
                  key={qOpt.label}
                  type="button"
                  onClick={() => {
                    setQuarter(qOpt.value);
                    setMonth(undefined);
                    setCurrentPage(0);
                  }}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900 border border-transparent'
                  }`}
                >
                  {qOpt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span>Định dạng tệp:</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 font-medium text-[11px]">
            XLSX
          </span>
          <span className="text-slate-300">•</span>
          <span>
            Khung áp dụng:{' '}
            <strong className="font-medium text-slate-900">
              {taxSummary?.tierDescription || 'Doanh thu phân khúc'}
            </strong>
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-md flex items-center gap-2 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ==================== TAX TIER REFERENCE STRIP (FLAT) ==================== */}
      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
          <span className="font-semibold text-slate-800">
            Biểu khung thuế trực tiếp áp dụng (Năm {year})
          </span>
          <span className="text-slate-500 tabular-nums">
            Thuế suất hiện hành:{' '}
            <strong className="font-semibold text-slate-900">
              {((quarterlyData?.appliedTaxRate ?? taxSummary?.totalTaxRate ?? 0) * 100).toFixed(1)}%
            </strong>
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 text-xs tabular-nums">
          <div className="px-4 py-3">
            <span className="text-slate-500 text-[11px] block">Doanh thu &lt; 1 tỷ / năm</span>
            <p className="font-semibold text-slate-900 mt-0.5">Miễn thuế (0%)</p>
          </div>
          <div className="px-4 py-3">
            <span className="text-slate-500 text-[11px] block">Doanh thu 1 – 3 tỷ / năm</span>
            <p className="font-semibold text-slate-900 mt-0.5">GTGT 1% + TNCN 0.5% = 1.5%</p>
          </div>
          <div className="px-4 py-3">
            <span className="text-slate-500 text-[11px] block">Doanh thu 3 – 50 tỷ / năm</span>
            <p className="font-semibold text-slate-900 mt-0.5">GTGT 8% + TNCN 17% = 25%</p>
          </div>
          <div className="px-4 py-3">
            <span className="text-slate-500 text-[11px] block">Doanh thu &gt; 50 tỷ / năm</span>
            <p className="font-semibold text-slate-900 mt-0.5">GTGT 8% + TNCN 20% = 28%</p>
          </div>
        </div>
      </div>

      {/* ==================== FLAT 5-COLUMN KPI SUMMARY STRIP ==================== */}
      <div className="bg-white border border-slate-200 rounded-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Doanh thu chịu thuế</span>
          <p className="text-lg font-semibold text-slate-900 tracking-tight">
            {taxSummary ? formatVND(taxSummary.annualNetRevenue) : '0 ₫'}
          </p>
          <span className="text-[11px] text-slate-500">Căn cứ tính toán kỳ {year}</span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">
            Thuế GTGT ({taxSummary ? (taxSummary.vatRate * 100).toFixed(0) : 0}%)
          </span>
          <p className="text-lg font-semibold text-slate-900 tracking-tight">
            {taxSummary ? formatVND(taxSummary.vatAmount) : '0 ₫'}
          </p>
          <span className="text-[11px] text-slate-500">Giá trị gia tăng</span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">
            Thuế TNCN ({taxSummary ? (taxSummary.pitRate * 100).toFixed(1) : 0}%)
          </span>
          <p className="text-lg font-semibold text-slate-900 tracking-tight">
            {taxSummary ? formatVND(taxSummary.pitAmount) : '0 ₫'}
          </p>
          <span className="text-[11px] text-slate-500">Thu nhập cá nhân</span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">
            Tổng thuế phải nộp ({(taxSummary ? taxSummary.totalTaxRate * 100 : 0).toFixed(1)}%)
          </span>
          <p className="text-lg font-semibold text-rose-600 tracking-tight">
            {taxSummary ? formatVND(taxSummary.totalTaxAmount) : '0 ₫'}
          </p>
          <span className="text-[11px] text-slate-500">Nghĩa vụ ngân sách</span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Hóa đơn hợp lệ</span>
          <p className="text-lg font-semibold text-slate-900 tracking-tight">
            {taxSummary ? formatNumber(taxSummary.totalPaidInvoices) : '0'}
          </p>
          <span className="text-[11px] text-slate-500">Hóa đơn đã xuất kho</span>
        </div>
      </div>

      {/* ==================== QUARTERLY BREAKDOWN TABLE ==================== */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Bảng phân bổ nghĩa vụ thuế 4 quý năm {year}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tạm tính nghĩa vụ thuế lũy kế theo từng quý tài chính
            </p>
          </div>
          <span className="inline-flex items-center px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium tabular-nums self-start sm:self-auto">
            Thuế suất áp dụng: {((quarterlyData?.appliedTaxRate ?? 0) * 100).toFixed(1)}%
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 whitespace-nowrap">Quý</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Doanh thu quý</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Thuế GTGT</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Thuế TNCN</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Tổng nghĩa vụ thuế</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Số hóa đơn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 tabular-nums">
              {quarterlyData?.quarters && quarterlyData.quarters.length > 0 ? (
                quarterlyData.quarters.map((q) => (
                  <tr key={q.quarter} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      Quý {q.quarter} / {year}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900 whitespace-nowrap">
                      {formatVND(q.quarterRevenue)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 whitespace-nowrap">
                      {formatVND(q.vatAmount)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 whitespace-nowrap">
                      {formatVND(q.pitAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-rose-600 whitespace-nowrap">
                      {formatVND(q.totalTax)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                      {formatNumber(q.invoiceCount)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Chưa có số liệu phân bổ quý
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== TAX INVOICES PREVIEW TABLE ==================== */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Bảng kê hóa đơn chi tiết cấu thành doanh thu tính thuế
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Dữ liệu xem trước phục vụ kiểm toán và xuất tệp tờ khai Excel
            </p>
          </div>
          <span className="text-xs text-slate-500 tabular-nums shrink-0">
            Tổng cộng:{' '}
            <strong className="font-medium text-slate-900">
              {formatNumber(invoicesPage?.totalElements || 0)}
            </strong>{' '}
            hóa đơn
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 whitespace-nowrap">Hóa đơn &amp; Ngày lập</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Mã đơn hàng</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Khách hàng</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Tổng tiền</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Chiết khấu</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">DT tính thuế</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">GTGT</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">TNCN</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 tabular-nums">
              {invoicesPage?.content && invoicesPage.content.length > 0 ? (
                invoicesPage.content.map((inv: TaxInvoiceDetailDto) => (
                  <tr key={inv.invoiceId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-blue-600">{inv.invoiceCode}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {formatDate(inv.invoiceDate)}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 whitespace-nowrap">
                      {inv.orderCode}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 max-w-[180px] truncate" title={inv.customerName}>
                        {inv.customerName}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {inv.customerPhone || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 whitespace-nowrap">
                      {formatVND(inv.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 whitespace-nowrap">
                      {formatVND(inv.discountAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {formatVND(inv.amount)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 whitespace-nowrap">
                      {formatVND(inv.vatAmount)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700 whitespace-nowrap">
                      {formatVND(inv.pitAmount)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>{inv.status || 'PAID'}</span>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Không có hóa đơn nào trong kỳ khai thuế này
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {invoicesPage && invoicesPage.totalPages > 1 && (
          <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between text-xs tabular-nums">
            <span className="text-slate-500">
              Trang <strong className="font-medium text-slate-900">{invoicesPage.pageNo + 1}</strong> /{' '}
              {invoicesPage.totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={invoicesPage.pageNo === 0}
                className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                aria-label="Trang trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={invoicesPage.last}
                className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                aria-label="Trang sau"
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
