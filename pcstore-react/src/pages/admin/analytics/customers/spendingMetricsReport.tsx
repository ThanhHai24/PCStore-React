import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Search,
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
    <div className="min-h-screen bg-[#F8FAFC] space-y-5 pb-8">
      {/* ==================== PAGE HEADER ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Phân tích khách hàng</span>
            <span className="text-slate-300">/</span>
            <span>Chỉ số chi tiêu &amp; phân hạng CLV</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Chỉ số chi tiêu &amp; phân hạng khách hàng (CLV)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi tổng chi tiêu lũy kế, giá trị đơn trung bình (AOV) và phân khúc hội viên khách hàng.
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

      {/* ==================== FLAT 4-COLUMN TIER STRIP ==================== */}
      <div className="bg-white border border-slate-200 rounded-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <span>Hội viên VIP (&gt; 50 triệu)</span>
          </span>
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">
            {formatNumber(vipCount)}
          </p>
          <span className="text-xs text-slate-500">Khách hàng chi tiêu cao</span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <span>Thân thiết (20 – 50 triệu)</span>
          </span>
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">
            {formatNumber(loyalCount)}
          </p>
          <span className="text-xs text-slate-500">Tái mua thường xuyên</span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>Tiềm năng (&lt; 20 triệu)</span>
          </span>
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">
            {formatNumber(potentialCount)}
          </p>
          <span className="text-xs text-slate-500">Đã phát sinh đơn mua</span>
        </div>

        <div className="p-4 flex flex-col justify-between gap-1.5 tabular-nums">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
            <span>Khách hàng mới (0 đơn)</span>
          </span>
          <p className="text-2xl font-semibold text-slate-900 tracking-tight">
            {formatNumber(newCount)}
          </p>
          <span className="text-xs text-slate-500">Cần chăm sóc / remarketing</span>
        </div>
      </div>

      {/* ==================== TIER DISTRIBUTION CHART ==================== */}
      <div className="bg-white p-5 rounded-md border border-slate-200 space-y-4">
        <div className="border-b pb-3 border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">
            Phân bổ số lượng hội viên theo phân khúc chi tiêu
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Cơ cấu số lượng khách hàng ở 4 mức chi tiêu lũy kế
          </p>
        </div>

        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tierChartData} margin={{ top: 8, right: 12, left: -12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                formatter={(val: any) => [formatNumber(Number(val || 0)) + ' khách hàng', 'Số lượng'] as any}
                contentStyle={{
                  borderRadius: '6px',
                  borderColor: '#E2E8F0',
                  fontSize: '12px',
                  fontVariantNumeric: 'tabular-nums',
                }}
              />
              <Bar dataKey="count" name="Số lượng" fill="#2563EB" radius={[3, 3, 0, 0]} maxBarSize={42} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ==================== CUSTOMER LIFETIME VALUE TABLE ==================== */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Bảng kê chi tiết chi tiêu lũy kế từng khách hàng
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hiển thị <strong className="font-medium text-slate-900 tabular-nums">{formatNumber(filteredList.length)}</strong> khách hàng
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Tìm theo họ tên, SĐT, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-8 pl-8 pr-3 bg-white border border-slate-200 rounded-md text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 w-12">#</th>
                <th className="py-2.5 px-4 min-w-[220px]">Khách hàng</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Tổng đơn hàng</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Giá trị đơn TB (AOV)</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Tổng chi tiêu (CLV)</th>
                <th className="py-2.5 px-4 whitespace-nowrap">Phân hạng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {filteredList.length > 0 ? (
                filteredList.map((c, idx) => {
                  const aovValue = c.orderCount > 0 ? Math.round(c.totalSpent / c.orderCount) : 0;
                  const tierDot =
                    c.tier === 'VIP'
                      ? 'bg-amber-500'
                      : c.tier === 'LOYAL'
                        ? 'bg-blue-500'
                        : c.tier === 'POTENTIAL'
                          ? 'bg-emerald-500'
                          : 'bg-slate-400';
                  const tierLabel =
                    c.tier === 'VIP'
                      ? 'VIP'
                      : c.tier === 'LOYAL'
                        ? 'Thân thiết'
                        : c.tier === 'POTENTIAL'
                          ? 'Tiềm năng'
                          : 'Mới';
                  return (
                    <tr key={c.userId ?? idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-400 tabular-nums">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{c.fullName}</div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate max-w-[280px]">
                          <span className="tabular-nums shrink-0">{c.phone}</span>
                          {c.email && c.email !== 'N/A' && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="truncate">{c.email}</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-900 tabular-nums whitespace-nowrap">
                        {formatNumber(c.orderCount)} đơn
                      </td>
                      <td className="py-3 px-4 text-right text-slate-600 tabular-nums whitespace-nowrap">
                        {formatVND(aovValue)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                        {formatVND(c.totalSpent)}
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
