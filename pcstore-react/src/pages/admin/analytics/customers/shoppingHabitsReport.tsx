import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  ShoppingBag,
  Layers,
  CreditCard,
  RefreshCw,
  Heart,
  Calendar,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { adminAnalyticsService } from '../../../../services/adminAnalyticsService';
import type {
  CategoryBreakdownDto,
  PaymentMethodBreakdownDto,
  TopProductDto,
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

const HABIT_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6', '#06B6D4'];

export default function ShoppingHabitsReportPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [categories, setCategories] = useState<CategoryBreakdownDto[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodBreakdownDto[]>([]);
  const [topProducts, setTopProducts] = useState<TopProductDto[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [catRes, payRes, topRes] = await Promise.allSettled([
        adminAnalyticsService.getRevenueByCategory(),
        adminAnalyticsService.getRevenueByPaymentMethod(),
        adminAnalyticsService.getTopSellingProducts(undefined, 8),
      ]);

      if (catRes.status === 'fulfilled') setCategories(catRes.value);
      if (payRes.status === 'fulfilled') setPaymentMethods(payRes.value);
      if (topRes.status === 'fulfilled') setTopProducts(topRes.value);
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="max-w-[1400px] mx-auto px-2 sm:px-4 py-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              Phân Tích Thói Quen & Xu Hướng Tiêu Dùng
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-50 text-pink-700 border border-pink-200">
              <Sparkles className="w-3 h-3 text-pink-600" /> Consumer Habits
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Nhận diện sở thích phần cứng, danh mục yêu thích và phương thức thanh toán quen thuộc của khách hàng
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

      {/* Row 1: Category Preference vs Payment Preference */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Preferred Categories */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="border-b pb-3 border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Ngành Hàng Được Quan Tâm Nhiều Nhất</span>
            </h2>
            <p className="text-xs text-gray-500">Tỷ trọng các nhóm linh kiện cấu thành giỏ hàng</p>
          </div>

          <div className="h-[240px]">
            {categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="value"
                    nameKey="categoryName"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    paddingAngle={2}
                  >
                    {categories.map((_, index) => (
                      <Cell key={`habit-cat-${index}`} fill={HABIT_COLORS[index % HABIT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatVND(Number(val) || 0) as any} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-xs text-gray-400 pt-24">Chưa có dữ liệu danh mục</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
            {categories.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded-lg bg-gray-50">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: HABIT_COLORS[i % HABIT_COLORS.length] }} />
                <span className="text-gray-700 truncate">{c.categoryName}</span>
                <span className="font-bold text-gray-900 ml-auto shrink-0">{c.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="border-b pb-3 border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <span>Thói Quen Thanh Toán Của Người Mua</span>
            </h2>
            <p className="text-xs text-gray-500">Xu hướng chọn lựa hình thức thanh toán khi chốt đơn</p>
          </div>

          <div className="space-y-4 pt-4">
            {paymentMethods.length > 0 ? (
              paymentMethods.map((p, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-800">{p.methodName}</span>
                    <span className="text-purple-600 font-bold">{p.percentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-purple-600 transition-all duration-500"
                      style={{ width: `${p.percentage}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-gray-500 block">
                    Tổng doanh số qua kênh này: <strong>{formatVND(p.amount)}</strong>
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-gray-400 py-16">Chưa có dữ liệu thanh toán</p>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Most Loved Hardware Products */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900 border-b pb-3 border-gray-100 flex items-center gap-2">
          <Heart className="w-4 h-4 text-rose-500" />
          <span>Sản Phẩm Được Mua Nhiều Nhất (Customer Favorites)</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {topProducts.map((p, idx) => (
            <div
              key={idx}
              className="p-4 rounded-2xl border border-gray-100 bg-gray-50/40 hover:border-blue-200 transition-colors flex flex-col justify-between space-y-3"
            >
              <div>
                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 mb-1.5">
                  Top #{idx + 1} Best Seller
                </span>
                <p className="text-xs font-bold text-gray-900 line-clamp-2" title={p.productName}>
                  {p.productName}
                </p>
                <span className="text-[10px] text-gray-400 font-mono">{p.productCode}</span>
              </div>
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 block">Đã tiêu thụ:</span>
                  <span className="text-xs font-black text-blue-600">{formatNumber(p.quantitySold)} chiếc</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-500 block">Doanh thu:</span>
                  <span className="text-xs font-bold text-gray-900">{formatVND(p.revenue)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
