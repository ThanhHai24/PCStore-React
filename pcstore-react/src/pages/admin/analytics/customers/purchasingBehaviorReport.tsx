import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Users,
  ShoppingBag,
  CreditCard,
  DollarSign,
  RefreshCw,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
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
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Phân Tích Dữ Liệu Hành Vi Mua Sắm Khách Hàng
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3 h-3 text-blue-600" /> Behavior Intelligence
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Chỉ số giá trị đơn hàng trung bình (AOV), kênh thanh toán ưa chuộng và tần suất phát sinh giao dịch
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 4 Behavior Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Giá Trị Đơn Trung Bình (AOV)</span>
            <p className="text-2xl font-black text-blue-600 mt-1">{formatVND(aov)}</p>
            <span className="text-[11px] text-gray-400">Doanh thu / Đơn hàng</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Tổng Khách Hàng Đã Tạo TK</span>
            <p className="text-2xl font-black text-indigo-600 mt-1">{formatNumber(customers.length)}</p>
            <span className="text-[11px] text-gray-400">Người dùng có vai trò CUSTOMER</span>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Số Lượng Đơn Đã Giao Dịch</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">{formatNumber(totalOrders)}</p>
            <span className="text-[11px] text-emerald-700 font-medium">Hóa đơn phát sinh</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Kênh Thanh Toán Chủ Đạo</span>
            <p className="text-xl font-bold text-purple-600 mt-1">
              {paymentMethods[0]?.methodName || 'Chuyển khoản'}
            </p>
            <span className="text-[11px] text-purple-700 font-medium">
              Chiếm {paymentMethods[0]?.percentage || 0}% giá trị
            </span>
          </div>
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Customer Purchasing Ranking Table */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900 border-b pb-3 border-gray-100 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          <span>Danh Sách Khách Hàng Mua Sắm Nổi Bật</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Tên Khách Hàng</th>
                <th className="py-2.5 px-3">Số Điện Thoại</th>
                <th className="py-2.5 px-3 text-right">Số Lượng Đơn Hàng</th>
                <th className="py-2.5 px-3 text-right">Tổng Chi Tiêu</th>
                <th className="py-2.5 px-3 text-center">Phân Hạng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {activeCustomerStats.length > 0 ? (
                activeCustomerStats.map((c, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-3 font-bold text-gray-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-semibold text-gray-900">{c.name}</td>
                    <td className="py-3 px-3 font-mono text-gray-600">{c.phone}</td>
                    <td className="py-3 px-3 text-right font-bold text-blue-600">{formatNumber(c.count)} đơn</td>
                    <td className="py-3 px-3 text-right font-black text-emerald-600">{formatVND(c.spend)}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          c.spend > 50000000
                            ? 'bg-amber-100 text-amber-900'
                            : c.spend > 20000000
                            ? 'bg-blue-100 text-blue-900'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {c.spend > 50000000 ? 'VIP Kim Cương' : c.spend > 20000000 ? 'Thân Thiết' : 'Thành Viên'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
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
