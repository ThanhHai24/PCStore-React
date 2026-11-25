import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  RefreshCw,
  PlusCircle,
  Download,
  Search,
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
    <div className="min-h-screen bg-[#F8FAFC] space-y-5 pb-8">
      {/* ==================== PAGE HEADER ==================== */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Báo cáo kho hàng</span>
            <span className="text-slate-300">/</span>
            <span>Cảnh báo định mức &amp; tồn đọng</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Cảnh báo rủi ro tồn kho
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Phát hiện sớm các sản phẩm chạm định mức tối thiểu và mặt hàng bán chậm không phát sinh đơn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Xuất CSV</span>
          </button>
          <button
            type="button"
            onClick={loadAlerts}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* ==================== COMPACT TOOLBAR & SEGMENTED TABS ==================== */}
      <div className="bg-white border border-slate-200 rounded-md p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Segmented Control Tabs */}
        <div className="inline-flex rounded-md bg-slate-100 p-0.5 border border-slate-200 self-start">
          <button
            type="button"
            onClick={() => setActiveTab('LOW_STOCK')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer tabular-nums ${
              activeTab === 'LOW_STOCK'
                ? 'bg-white text-slate-900 border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 border border-transparent'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <span>Sắp hết hàng</span>
            <span className="text-[11px] text-slate-500">({formatNumber(lowStockList.length)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SLOW_MOVING')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer tabular-nums ${
              activeTab === 'SLOW_MOVING'
                ? 'bg-white text-slate-900 border border-slate-200'
                : 'text-slate-600 hover:text-slate-900 border border-transparent'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>Bán chậm / Tồn đọng</span>
            <span className="text-[11px] text-slate-500">({formatNumber(slowMovingList.length)})</span>
          </button>
        </div>

        {/* Search & Threshold Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm mã SKU, tên sản phẩm, danh mục..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-md text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
            />
          </div>

          {activeTab === 'LOW_STOCK' ? (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 shrink-0">
              <span>Ngưỡng tồn &le;</span>
              <input
                type="number"
                min={1}
                max={50}
                value={minThreshold}
                onChange={(e) => setMinThreshold(Number(e.target.value))}
                className="w-16 h-8 px-2 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-800 text-right tabular-nums focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
              />
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-slate-600 shrink-0">
              <span>Không bán &ge;</span>
              <input
                type="number"
                min={7}
                max={365}
                value={thresholdDays}
                onChange={(e) => setThresholdDays(Number(e.target.value))}
                className="w-16 h-8 px-2 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-800 text-right tabular-nums focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
              />
              <span>ngày</span>
            </div>
          )}
        </div>
      </div>

      {/* ==================== MAIN TABLE ==================== */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        {activeTab === 'LOW_STOCK' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 min-w-[280px]">Sản phẩm</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Mức cảnh báo</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Tồn khả dụng</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Định mức tối thiểu</th>
                  <th className="py-2.5 px-4 whitespace-nowrap">Nhà cung cấp gợi ý</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredLowStock.length > 0 ? (
                  filteredLowStock.map((item, idx) => {
                    const isOutOfStock = item.sellableQuantity <= 0;
                    return (
                      <tr key={item.productId ?? idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3 min-w-0 max-w-[360px]">
                            <div className="w-9 h-9 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                              <Package className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div
                                className="font-medium text-slate-900 truncate"
                                title={item.productName}
                              >
                                {item.productName}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate">
                                <span className="font-medium text-blue-600 tabular-nums shrink-0">
                                  {item.productCode}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="truncate">{item.categoryName || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isOutOfStock ? 'bg-rose-500' : 'bg-amber-500'
                              }`}
                            />
                            <span>{isOutOfStock ? 'Hết hàng' : 'Dưới định mức'}</span>
                          </span>
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-semibold tabular-nums whitespace-nowrap ${
                            isOutOfStock ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {formatNumber(item.sellableQuantity)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-600 tabular-nums whitespace-nowrap">
                          {formatNumber(item.minimumThreshold)}
                        </td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          {item.suggestedSupplier || 'NCC mặc định'}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Link
                            to="/admin/import"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-blue-600 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                          >
                            <PlusCircle className="w-3.5 h-3.5" />
                            <span>Tạo đơn nhập</span>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      Không có sản phẩm nào chạm ngưỡng cảnh báo hết hàng.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 min-w-[280px]">Sản phẩm</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Tồn khả dụng</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Lần bán gần nhất</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Số ngày tồn đọng</th>
                  <th className="py-2.5 px-4 text-right whitespace-nowrap">Đề xuất xử lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredSlowMoving.length > 0 ? (
                  filteredSlowMoving.map((item, idx) => (
                    <tr key={item.productId ?? idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3 min-w-0 max-w-[360px]">
                          <div className="w-9 h-9 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                            <Package className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div
                              className="font-medium text-slate-900 truncate"
                              title={item.productName}
                            >
                              {item.productName}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate">
                              <span className="font-medium text-blue-600 tabular-nums shrink-0">
                                {item.productCode}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="truncate">{item.categoryName || 'N/A'}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatNumber(item.sellableQuantity)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 tabular-nums whitespace-nowrap">
                        {formatDate(item.lastSoldDate)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums whitespace-nowrap">
                        <span className="inline-flex items-center justify-end gap-1.5 font-semibold text-amber-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span>{formatNumber(item.daysWithoutSale)} ngày</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-[11px] font-medium">
                          Giảm giá / Bundle PC
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      Không có sản phẩm nào tồn đọng lâu vượt ngưỡng.
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
