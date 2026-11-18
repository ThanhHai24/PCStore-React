import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Clock,
  ShieldAlert,
  Package,
  Calendar,
  RefreshCw,
  Building,
  PlusCircle,
  Download,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { adminAnalyticsService } from '../../../../services/adminAnalyticsService';
import type {
  LowStockProductDto,
  SlowMovingProductDto,
} from '../../../../types/adminAnalytics';

function formatNumber(num: number): string {
  return new Intl.NumberFormat('vi-VN').format(num || 0);
}

function formatDate(iso: string | undefined): string {
  if (!iso) return 'Chưa phát sinh';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export default function InventoryAlertsReportPage() {
  const [activeTab, setActiveTab] = useState<'LOW_STOCK' | 'SLOW_MOVING'>('LOW_STOCK');
  const [loading, setLoading] = useState<boolean>(true);
  const [minThreshold, setMinThreshold] = useState<number>(5);
  const [thresholdDays, setThresholdDays] = useState<number>(30);

  const [lowStockList, setLowStockList] = useState<LowStockProductDto[]>([]);
  const [slowMovingList, setSlowMovingList] = useState<SlowMovingProductDto[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const [lowRes, slowRes] = await Promise.allSettled([
        adminAnalyticsService.getLowStockAlerts({ minThreshold }),
        adminAnalyticsService.getSlowMovingProducts(thresholdDays),
      ]);

      if (lowRes.status === 'fulfilled') setLowStockList(lowRes.value);
      if (slowRes.status === 'fulfilled') setSlowMovingList(slowRes.value);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, [minThreshold, thresholdDays]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const filteredLowStock = lowStockList.filter(
    (p) =>
      p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categoryName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSlowMoving = slowMovingList.filter(
    (p) =>
      p.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categoryName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const exportCSV = () => {
    if (activeTab === 'LOW_STOCK') {
      const headers = ['Mã SKU', 'Tên sản phẩm', 'Danh mục', 'Tồn khả dụng', 'Ngưỡng tối thiểu', 'Nhà cung cấp đề xuất'];
      const rows = filteredLowStock.map((p) => [
        `"${p.productCode}"`,
        `"${p.productName.replace(/"/g, '""')}"`,
        `"${p.categoryName || ''}"`,
        p.sellableQuantity,
        p.minimumThreshold,
        `"${p.suggestedSupplier || ''}"`,
      ]);
      const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Canh_Bao_Het_Hang.csv`;
      link.click();
    } else {
      const headers = ['Mã SKU', 'Tên sản phẩm', 'Danh mục', 'Tồn khả dụng', 'Ngày bán gần nhất', 'Số ngày không bán'];
      const rows = filteredSlowMoving.map((p) => [
        `"${p.productCode}"`,
        `"${p.productName.replace(/"/g, '""')}"`,
        `"${p.categoryName || ''}"`,
        p.sellableQuantity,
        formatDate(p.lastSoldDate),
        p.daysWithoutSale,
      ]);
      const csv = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `SanPham_Ban_Cham_Ton_Dong.csv`;
      link.click();
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Trung Tâm Cảnh Báo Rủi Ro Tồn Kho
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <Sparkles className="w-3 h-3 text-rose-600" /> Early Warning
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Chủ động phát hiện hàng sắp đứt gãy tồn kho và sản phẩm ứ đọng không phát sinh đơn bán
          </p>
        </div>

        <button
          onClick={loadAlerts}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-3 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('LOW_STOCK')}
          className={`flex items-center gap-2 pb-3 px-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'LOW_STOCK'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Cảnh Báo Sắp Hết Hàng ({lowStockList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SLOW_MOVING')}
          className={`flex items-center gap-2 pb-3 px-2 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'SLOW_MOVING'
              ? 'border-amber-600 text-amber-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Sản Phẩm Bán Chậm / Tồn Đọng ({slowMovingList.length})</span>
        </button>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Tìm theo mã SKU, tên SP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs w-60 focus:outline-blue-500"
          />

          {activeTab === 'LOW_STOCK' ? (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span>Ngưỡng tồn &le;:</span>
              <input
                type="number"
                min={1}
                max={50}
                value={minThreshold}
                onChange={(e) => setMinThreshold(Number(e.target.value))}
                className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-blue-500"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-gray-600">
              <span>Ngưỡng không bán &ge;:</span>
              <input
                type="number"
                min={7}
                max={365}
                value={thresholdDays}
                onChange={(e) => setThresholdDays(Number(e.target.value))}
                className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-blue-500"
              />
              <span>ngày</span>
            </div>
          )}
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-semibold transition-colors self-start"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Xuất CSV</span>
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {activeTab === 'LOW_STOCK' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Mã SKU</th>
                  <th className="py-3 px-4">Tên Sản Phẩm</th>
                  <th className="py-3 px-4">Danh Mục</th>
                  <th className="py-3 px-4 text-center">Tồn Khả Dụng</th>
                  <th className="py-3 px-4 text-center">Ngưỡng Tối Thiểu</th>
                  <th className="py-3 px-4">Nhà Cung Cấp Gợi Ý</th>
                  <th className="py-3 px-4 text-center">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filteredLowStock.length > 0 ? (
                  filteredLowStock.map((item, idx) => (
                    <tr key={idx} className="hover:bg-rose-50/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-rose-600">{item.productCode}</td>
                      <td className="py-3 px-4 font-medium text-gray-900 max-w-[280px] truncate" title={item.productName}>
                        {item.productName}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{item.categoryName || 'N/A'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800">
                          {item.sellableQuantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-gray-500">{item.minimumThreshold}</td>
                      <td className="py-3 px-4 text-gray-700">
                        <span className="inline-flex items-center gap-1 text-gray-600">
                          <Building className="w-3.5 h-3.5 text-gray-400" />
                          {item.suggestedSupplier || 'NCC mặc định'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
                          to="/admin/import"
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Tạo đơn nhập</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      Không có sản phẩm nào chạm ngưỡng cảnh báo hết hàng!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Mã SKU</th>
                  <th className="py-3 px-4">Tên Sản Phẩm</th>
                  <th className="py-3 px-4">Danh Mục</th>
                  <th className="py-3 px-4 text-center">Tồn Khả Dụng</th>
                  <th className="py-3 px-4">Lần Bán Thành Công Cuối</th>
                  <th className="py-3 px-4 text-center">Số Ngày Tồn Đọng</th>
                  <th className="py-3 px-4 text-center">Đề Xuất Xử Lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filteredSlowMoving.length > 0 ? (
                  filteredSlowMoving.map((item, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/20 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-amber-600">{item.productCode}</td>
                      <td className="py-3 px-4 font-medium text-gray-900 max-w-[280px] truncate" title={item.productName}>
                        {item.productName}
                      </td>
                      <td className="py-3 px-4 text-gray-600">{item.categoryName || 'N/A'}</td>
                      <td className="py-3 px-4 text-center font-bold text-gray-900">{item.sellableQuantity}</td>
                      <td className="py-3 px-4 text-gray-600">{formatDate(item.lastSoldDate)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-900">
                          {item.daysWithoutSale} ngày
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          Giảm giá / Bundle PC
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      Không có sản phẩm nào tồn đọng lâu vượt ngưỡng!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
