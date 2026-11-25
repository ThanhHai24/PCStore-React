import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { adminAnalyticsService } from '../../../../services/adminAnalyticsService';
import { adminOrderService } from '../../../../services/adminOrderService';
import { adminUserService } from '../../../../services/adminUserService';
import type { PaymentMethodBreakdownDto, DashboardKpiResponse } from '../../../../types/adminAnalytics';
import type { OrderResponse } from '../../../../types/adminOrder';
import type { BackendUserResponse } from '../../../../types/adminUser';

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

export default function PurchasingBehaviorReportPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [kpi, setKpi] = useState<DashboardKpiResponse | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodBreakdownDto[]>([]);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [customers, setCustomers] = useState<BackendUserResponse[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [kpiRes, payRes, ordersRes, usersRes] = await Promise.allSettled([
        adminAnalyticsService.getDashboardKpis(),
        adminAnalyticsService.getRevenueByPaymentMethod(),
        adminOrderService.getAllOrders({ size: 100 }),
        adminUserService.getAllUsers({ role: 'CUSTOMER', size: 100 }),
      ]);

      if (kpiRes.status === 'fulfilled') setKpi(kpiRes.value);
      if (payRes.status === 'fulfilled') setPaymentMethods(payRes.value);
      if (ordersRes.status === 'fulfilled' && ordersRes.value?.content) {
        setOrders(ordersRes.value.content);
      }
      if (usersRes.status === 'fulfilled' && usersRes.value?.content) {
        setCustomers(usersRes.value.content);
      }
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalRevenue = kpi?.totalRevenue ?? 0;
  const totalOrders = kpi?.totalPaidInvoices || orders.length || 1;
  const aov = totalRevenue > 0 && totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Aggregate customer order counts
  const customerOrderMap = new Map<number, { name: string; phone: string; count: number; spend: number }>();
  orders.forEach((o) => {
    const uid = o.userId || 0;
    const cur = customerOrderMap.get(uid) || {
      name: o.customerName || 'Khách vãng lai',
      phone: o.customerPhone || 'N/A',
      count: 0,
      spend: 0,
    };
    cur.count += 1;
    cur.spend += o.finalAmount || o.totalAmount || 0;
    customerOrderMap.set(uid, cur);
  });

  const activeCustomerStats = Array.from(customerOrderMap.values()).sort((a, b) => b.spend - a.spend);

  return (
    <div className="min-h-screen bg-[#F8FAFC] space-y-5 pb-8">
      {/* ==================== PAGE HEADER ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Phân tích khách hàng</span>
            <span className="text-slate-300">/</span>
            <span>Hành vi mua sắm</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Phân tích dữ liệu hành vi mua sắm
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Chỉ số giá trị đơn hàng trung bình (AOV), kênh thanh toán chủ đạo và tần suất phát sinh giao dịch.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* ==================== FLAT 4-COLUMN BEHAVIOR KPI STRIP ==================== */}
      <div className="bg-white border border-slate-200 rounded-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Giá trị đơn trung bình (AOV)</span>
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">{formatVND(aov)}</p>
          <span className="text-xs text-slate-500">Doanh thu / Đơn hàng</span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Tổng khách hàng đã tạo TK</span>
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">
            {formatNumber(customers.length)}
          </p>
          <span className="text-xs text-slate-500">Tài khoản vai trò khách hàng</span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Số lượng đơn đã giao dịch</span>
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">
            {formatNumber(totalOrders)}
          </p>
          <span className="text-xs text-slate-500">Hóa đơn phát sinh</span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="text-xs font-medium text-slate-500">Kênh thanh toán chủ đạo</span>
          <p className="text-xl font-semibold text-slate-900 tracking-tight truncate">
            {paymentMethods[0]?.methodName || 'Chuyển khoản'}
          </p>
          <span className="text-xs text-slate-500">
            Chiếm {paymentMethods[0]?.percentage || 0}% tổng giá trị
          </span>
        </div>
      </div>

      {/* ==================== CUSTOMER PURCHASING RANKING TABLE ==================== */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Danh sách khách hàng mua sắm nổi bật
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Xếp hạng khách hàng theo tổng giá trị chi tiêu và tần suất đặt đơn
            </p>
          </div>
          <span className="text-xs text-slate-500 tabular-nums shrink-0">
            <strong className="font-medium text-slate-900">{formatNumber(activeCustomerStats.length)}</strong> khách hàng
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 w-12">#</th>
                <th className="py-2.5 px-4 min-w-[200px]">Khách hàng</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Số lượng đơn</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Chi tiêu TB / đơn</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Tổng chi tiêu</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Phân hạng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {activeCustomerStats.length > 0 ? (
                activeCustomerStats.map((c, idx) => {
                  const avgSpend = c.count > 0 ? Math.round(c.spend / c.count) : 0;
                  const tierDot =
                    c.spend > 50000000
                      ? 'bg-amber-500'
                      : c.spend > 20000000
                        ? 'bg-blue-500'
                        : 'bg-slate-400';
                  const tierLabel =
                    c.spend > 50000000
                      ? 'VIP Kim Cương'
                      : c.spend > 20000000
                        ? 'Thân Thiết'
                        : 'Thành Viên';
                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-400 tabular-nums">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{c.name}</div>
                        <div className="text-[11px] text-slate-500 tabular-nums mt-0.5">{c.phone}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {formatNumber(c.count)} đơn
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 tabular-nums whitespace-nowrap">
                        {formatVND(avgSpend)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatVND(c.spend)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tierDot}`} />
                          <span>{tierLabel}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Chưa có giao dịch khách hàng nào được ghi nhận
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
