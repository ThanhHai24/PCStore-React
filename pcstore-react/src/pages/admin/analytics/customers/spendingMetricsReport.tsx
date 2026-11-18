import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  Award,
  Crown,
  DollarSign,
  Calendar,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { adminOrderService } from '../../../../services/adminOrderService';
import { adminUserService } from '../../../../services/adminUserService';
import type { OrderResponse } from '../../../../types/adminOrder';
import type { BackendUserResponse } from '../../../../types/adminUser';

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

interface CustomerTierRow {
  userId: number;
  fullName: string;
  phone: string;
  email: string;
  orderCount: number;
  totalSpent: number;
  tier: 'VIP' | 'LOYAL' | 'POTENTIAL' | 'NEW';
}

export default function SpendingMetricsReportPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [customerTiers, setCustomerTiers] = useState<CustomerTierRow[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, usersRes] = await Promise.allSettled([
        adminOrderService.getAllOrders({ size: 200 }),
        adminUserService.getAllUsers({ role: 'CUSTOMER', size: 100 }),
      ]);

      const orders: OrderResponse[] = ordersRes.status === 'fulfilled' && ordersRes.value?.content ? ordersRes.value.content : [];
      const users: BackendUserResponse[] = usersRes.status === 'fulfilled' && usersRes.value?.content ? usersRes.value.content : [];

      const map = new Map<number, CustomerTierRow>();

      users.forEach((u) => {
        map.set(u.id, {
          userId: u.id,
          fullName: u.fullName || u.username,
          phone: u.phoneNumber || 'N/A',
          email: u.email || 'N/A',
          orderCount: 0,
          totalSpent: 0,
          tier: 'NEW',
        });
      });

      orders.forEach((o) => {
        const uid = o.userId || 0;
        const cur = map.get(uid) || {
          userId: uid,
          fullName: o.customerName || 'Khách vãng lai',
          phone: o.customerPhone || 'N/A',
          email: 'N/A',
          orderCount: 0,
          totalSpent: 0,
          tier: 'NEW',
        };
        cur.orderCount += 1;
        cur.totalSpent += o.finalAmount || o.totalAmount || 0;
        map.set(uid, cur);
      });

      const list = Array.from(map.values()).map((c) => {
        let tier: 'VIP' | 'LOYAL' | 'POTENTIAL' | 'NEW' = 'NEW';
        if (c.totalSpent >= 50000000) tier = 'VIP';
        else if (c.totalSpent >= 20000000) tier = 'LOYAL';
        else if (c.totalSpent > 0) tier = 'POTENTIAL';
        return { ...c, tier };
      });

      list.sort((a, b) => b.totalSpent - a.totalSpent);
      setCustomerTiers(list);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const vipCount = customerTiers.filter((c) => c.tier === 'VIP').length;
  const loyalCount = customerTiers.filter((c) => c.tier === 'LOYAL').length;
  const potentialCount = customerTiers.filter((c) => c.tier === 'POTENTIAL').length;
  const newCount = customerTiers.filter((c) => c.tier === 'NEW').length;

  const tierChartData = [
    { name: 'VIP (> 50tr)', count: vipCount },
    { name: 'Thân thiết (20 - 50tr)', count: loyalCount },
    { name: 'Tiềm năng (< 20tr)', count: potentialCount },
    { name: 'Mới (0 đơn)', count: newCount },
  ];

  const filteredList = customerTiers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Báo Cáo Chỉ Số Chi Tiêu & Phân Hạng Khách Hàng (CLV)
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Sparkles className="w-3 h-3 text-indigo-600" /> Customer Lifetime Value
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Theo dõi tổng chi tiêu luỹ kế, xếp hạng hội viên và chính sách chăm sóc tệp khách hàng VIP
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

      {/* 4 Tier Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Hội Viên VIP (&gt; 50 triệu)</span>
            <p className="text-2xl font-black text-amber-600 mt-1">{vipCount}</p>
            <span className="text-[11px] text-gray-400">Khách hàng chi tiêu cao</span>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <Crown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Khách Hàng Thân Thiết (20 - 50tr)</span>
            <p className="text-2xl font-black text-blue-600 mt-1">{loyalCount}</p>
            <span className="text-[11px] text-gray-400">Tái mua thường xuyên</span>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Khách Tiềm Năng (&lt; 20tr)</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">{potentialCount}</p>
            <span className="text-[11px] text-gray-400">Đã phát sinh đơn mua</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-500">Khách Hàng Mới (0 đơn)</span>
            <p className="text-2xl font-black text-gray-500 mt-1">{newCount}</p>
            <span className="text-[11px] text-gray-400">Cần remarketing</span>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 text-gray-500">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Tier Distribution Chart */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900 border-b pb-3 border-gray-100">
          Phân Bổ Số Lượng Hội Viên Theo Phân Khúc Chi Tiêu
        </h2>

        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tierChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip formatter={(val: any) => [formatNumber(Number(val) || 0) + ' khách hàng', 'Số lượng'] as any} />
              <Bar dataKey="count" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={45} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer Lifetime Value Table */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3 border-gray-100">
          <h2 className="text-base font-bold text-gray-900">
            Bảng Kê Chi Tiết Chi Tiêu Luỹ Kế Từng Khách Hàng
          </h2>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo họ tên, sđt, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-xl text-xs w-64 focus:outline-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 uppercase text-[10px] font-bold border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Họ Tên Khách Hàng</th>
                <th className="py-2.5 px-3">Số Điện Thoại</th>
                <th className="py-2.5 px-3">Email</th>
                <th className="py-2.5 px-3 text-right">Số Đơn Mua</th>
                <th className="py-2.5 px-3 text-right">Tổng Chi Tiêu</th>
                <th className="py-2.5 px-3 text-center">Phân Hạng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              {filteredList.length > 0 ? (
                filteredList.map((c, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                    <td className="py-3 px-3 font-bold text-gray-400">{idx + 1}</td>
                    <td className="py-3 px-3 font-semibold text-gray-900">{c.fullName}</td>
                    <td className="py-3 px-3 font-mono text-gray-600">{c.phone}</td>
                    <td className="py-3 px-3 text-gray-500">{c.email}</td>
                    <td className="py-3 px-3 text-right font-bold text-blue-600">{formatNumber(c.orderCount)} đơn</td>
                    <td className="py-3 px-3 text-right font-black text-emerald-600">{formatVND(c.totalSpent)}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          c.tier === 'VIP'
                            ? 'bg-amber-100 text-amber-900'
                            : c.tier === 'LOYAL'
                            ? 'bg-blue-100 text-blue-900'
                            : c.tier === 'POTENTIAL'
                            ? 'bg-emerald-100 text-emerald-900'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {c.tier === 'VIP' ? 'VIP' : c.tier === 'LOYAL' ? 'Thân Thiết' : c.tier === 'POTENTIAL' ? 'Tiềm Năng' : 'Mới'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-400">
                    Không tìm thấy khách hàng nào phù hợp
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
