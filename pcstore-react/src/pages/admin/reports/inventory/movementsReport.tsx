import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  RefreshCw,
  Download,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { adminAnalyticsService } from '../../../../services/adminAnalyticsService';
import type {
  TimeSeriesPointDto,
  SupplierPerformanceDto,
  ReceiptQualityDto,
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

export default function InventoryMovementsReportPage() {
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState<string>(thirtyDaysAgo);
  const [endDate, setEndDate] = useState<string>(today);

  const [loading, setLoading] = useState<boolean>(true);
  const [procurementTrends, setProcurementTrends] = useState<TimeSeriesPointDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierPerformanceDto[]>([]);
  const [qualityChecks, setQualityChecks] = useState<ReceiptQualityDto[]>([]);
  const [receiptStatuses, setReceiptStatuses] = useState<OrderStatusDistributionDto[]>([]);

  const loadMovementsData = useCallback(async () => {
    setLoading(true);
    try {
      const filter = { startDate, endDate };
      const [trendRes, supRes, qualRes, statRes] = await Promise.allSettled([
        adminAnalyticsService.getPurchasingTrend(filter),
        adminAnalyticsService.getPurchasingBySupplier(filter, 10),
        adminAnalyticsService.getQualityInspection(filter),
        adminAnalyticsService.getReceiptStatusDistribution(filter),
      ]);

      if (trendRes.status === 'fulfilled') setProcurementTrends(trendRes.value);
      if (supRes.status === 'fulfilled') setSuppliers(supRes.value);
      if (qualRes.status === 'fulfilled') setQualityChecks(qualRes.value);
      if (statRes.status === 'fulfilled') setReceiptStatuses(statRes.value);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadMovementsData();
  }, [loadMovementsData]);

  const totalImportValue = suppliers.reduce((sum, s) => sum + s.totalImportValue, 0);
  const totalReceivedQty = suppliers.reduce((sum, s) => sum + s.totalQuantityReceived, 0);
  const totalDefectiveQty = suppliers.reduce((sum, s) => sum + s.defectiveQuantity, 0);
  const overallDefectRate = totalReceivedQty > 0 ? ((totalDefectiveQty / totalReceivedQty) * 100).toFixed(2) : '0';

  const exportCSV = () => {
    const headers = ['Mã NCC', 'Tên nhà cung cấp', 'Số phiếu nhập', 'Tổng giá trị (VND)', 'Tổng SL nhận', 'SL đạt', 'SL lỗi', 'Tỷ lệ lỗi %'];
    const rows = suppliers.map((s) => [
      `"${s.supplierCode}"`,
      `"${s.supplierName.replace(/"/g, '""')}"`,
      s.receiptCount,
      s.totalImportValue,
      s.totalQuantityReceived,
      s.acceptedQuantity,
      s.defectiveQuantity,
      s.defectRatePercentage,
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Hieu_Suat_Nha_Cung_Cap_${startDate}_den_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] space-y-5 pb-8">
      {/* ==================== PAGE HEADER ==================== */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Báo cáo kho hàng</span>
            <span className="text-slate-300">/</span>
            <span className="tabular-nums">
              Kỳ theo dõi: {startDate} — {endDate}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Biến động tồn kho &amp; hiệu suất nhập hàng NCC
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi lưu lượng nhập kho, chất lượng kiểm hàng và đánh giá tỷ lệ lỗi theo từng nhà cung cấp.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-md px-2.5 h-9 text-xs tabular-nums">
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

          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Xuất CSV</span>
          </button>

          <button
            type="button"
            onClick={loadMovementsData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Lọc</span>
          </button>
        </div>
      </div>

      {/* ==================== PROCUREMENT TRENDS CHART ==================== */}
      <div className="bg-white p-5 rounded-md border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Lưu lượng giá trị nhập kho theo thời gian
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Giá trị tiền hàng nhập từ nhà cung cấp qua từng mốc thời gian
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 tabular-nums">
            <span>
              Tổng nhập: <strong className="font-semibold text-slate-900">{formatVND(totalImportValue)}</strong>
            </span>
            <span>
              SL nhận: <strong className="font-semibold text-slate-900">{formatNumber(totalReceivedQty)}</strong>
            </span>
            <span>
              Hàng lỗi:{' '}
              <strong className={`font-semibold ${totalDefectiveQty > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {formatNumber(totalDefectiveQty)} ({overallDefectRate}%)
              </strong>
            </span>
          </div>
        </div>

        <div className="h-[280px]">
          {procurementTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={procurementTrends} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
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
                  formatter={(val: any) => [formatVND(Number(val || 0)), 'Giá trị nhập'] as any}
                  contentStyle={{
                    borderRadius: '6px',
                    borderColor: '#E2E8F0',
                    fontSize: '12px',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                />
                <Bar dataKey="revenue" name="Giá trị nhập" fill="#2563EB" radius={[3, 3, 0, 0]} maxBarSize={30} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Chưa có dữ liệu nhập hàng trong kỳ
            </div>
          )}
        </div>
      </div>

      {/* ==================== SUPPLIER PERFORMANCE TABLE ==================== */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Bảng đánh giá hiệu suất &amp; chất lượng nhà cung cấp
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Xếp hạng theo giá trị nhập, sản lượng đạt chuẩn và tỷ lệ hàng lỗi kỹ thuật
            </p>
          </div>
          <span className="text-xs text-slate-500 tabular-nums shrink-0">
            <strong className="font-medium text-slate-900">{formatNumber(suppliers.length)}</strong> đối tác NCC
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 whitespace-nowrap">Mã NCC</th>
                <th className="py-2.5 px-4 min-w-[200px]">Tên nhà cung cấp</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Số phiếu nhập</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Tổng giá trị</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Tổng nhận</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Đạt chuẩn</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Hàng lỗi</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Tỷ lệ lỗi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 tabular-nums">
              {suppliers.length > 0 ? (
                suppliers.map((s, idx) => {
                  const dotColor =
                    s.defectRatePercentage > 3
                      ? 'bg-rose-500'
                      : s.defectRatePercentage > 1
                        ? 'bg-amber-500'
                        : 'bg-emerald-500';
                  const rateColor =
                    s.defectRatePercentage > 3
                      ? 'text-rose-600'
                      : s.defectRatePercentage > 1
                        ? 'text-amber-700'
                        : 'text-slate-700';
                  return (
                    <tr key={s.supplierCode ?? idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-semibold text-blue-600 whitespace-nowrap">
                        {s.supplierCode}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {s.supplierName}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatNumber(s.receiptCount)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900 whitespace-nowrap">
                        {formatVND(s.totalImportValue)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-700 whitespace-nowrap">
                        {formatNumber(s.totalQuantityReceived)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-700 whitespace-nowrap">
                        {formatNumber(s.acceptedQuantity)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-medium whitespace-nowrap ${
                          s.defectiveQuantity > 0 ? 'text-rose-600' : 'text-slate-400'
                        }`}
                      >
                        {formatNumber(s.defectiveQuantity)}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className={`inline-flex items-center justify-end gap-1.5 font-medium ${rateColor}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                          <span>{s.defectRatePercentage}%</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    Chưa có giao dịch nhập hàng nào
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
