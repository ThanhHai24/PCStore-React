import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeftRight,
  Truck,
  Building2,
  Calendar,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Biến Động Tồn Kho & Hiệu Suất Nhập Hàng NCC
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3 h-3 text-indigo-600" /> Procurement Inbound
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Theo dõi lưu lượng nhập kho, chất lượng kiểm hàng và đánh giá mức độ uy tín của Nhà cung cấp
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            onClick={loadMovementsData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Lọc</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Tổng Giá Trị Nhập Hàng</span>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatVND(totalImportValue)}</p>
            <span className="text-[11px] text-gray-400">Chi phí nhập từ NCC</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Tổng Số Lượng Nhập</span>
            <p className="text-xl font-bold text-emerald-600 mt-1">{formatNumber(totalReceivedQty)}</p>
            <span className="text-[11px] text-gray-400">Linh kiện đã kiểm tra</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Số Lượng Hàng Lỗi</span>
            <p className="text-xl font-bold text-rose-600 mt-1">{formatNumber(totalDefectiveQty)}</p>
            <span className="text-[11px] text-rose-500 font-semibold">Tỷ lệ lỗi: {overallDefectRate}%</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Số Đối Tác NCC</span>
            <p className="text-xl font-bold text-indigo-600 mt-1">{suppliers.length}</p>
            <span className="text-[11px] text-gray-400">Phát sinh giao dịch</span>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Procurement Trends Chart */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="border-b pb-3 border-gray-100">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-blue-600" />
            <span>Biểu Đồ Lưu Lượng Giá Trị Nhập Kho Theo Thời Gian</span>
          </h2>
          <p className="text-xs text-gray-500">Giá trị tiền hàng nhập kho theo từng mốc thời gian</p>
        </div>

        <div className="h-[280px]">
          {procurementTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={procurementTrends} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => formatCompactVND(v)} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(val: any) => [formatVND(Number(val || 0)), 'Giá trị nhập'] as any} />
                <Bar dataKey="revenue" name="Giá trị nhập" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-xs text-gray-400 pt-28">Chưa có dữ liệu nhập hàng trong kỳ</p>
          )}
        </div>
      </div>

      {/* Supplier Performance Table */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-gray-100">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>Bảng Đánh Giá Hiệu Suất & Chất Lượng Nhà Cung Cấp</span>
            </h2>
            <p className="text-xs text-gray-500">Xếp hạng theo giá trị nhập, số lượng đạt chuẩn và tỷ lệ lỗi kỹ thuật</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors self-start"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất CSV</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3">Mã NCC</th>
                <th className="py-2.5 px-3">Tên Nhà Cung Cấp</th>
                <th className="py-2.5 px-3 text-right">Số Phiếu Nhập</th>
                <th className="py-2.5 px-3 text-right">Tổng Giá Trị</th>
                <th className="py-2.5 px-3 text-right">Tổng Nhận</th>
                <th className="py-2.5 px-3 text-right">Đạt Chuẩn</th>
                <th className="py-2.5 px-3 text-right">Hàng Lỗi</th>
                <th className="py-2.5 px-3 text-right">Tỷ Lệ Lỗi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {suppliers.length > 0 ? (
                suppliers.map((s, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-blue-600">{s.supplierCode}</td>
                    <td className="py-3 px-3 font-medium text-gray-900">{s.supplierName}</td>
                    <td className="py-3 px-3 text-right font-semibold text-gray-700">{formatNumber(s.receiptCount)}</td>
                    <td className="py-3 px-3 text-right font-bold text-gray-900">{formatVND(s.totalImportValue)}</td>
                    <td className="py-3 px-3 text-right text-gray-700">{formatNumber(s.totalQuantityReceived)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-600">{formatNumber(s.acceptedQuantity)}</td>
                    <td className="py-3 px-3 text-right font-semibold text-rose-600">{formatNumber(s.defectiveQuantity)}</td>
                    <td className="py-3 px-3 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          s.defectRatePercentage > 3
                            ? 'bg-rose-100 text-rose-800'
                            : s.defectRatePercentage > 1
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {s.defectRatePercentage}%
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-400">
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
