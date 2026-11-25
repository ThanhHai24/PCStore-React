import { useState, useEffect, useCallback } from 'react';
import {
  Package,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
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

const HABIT_COLORS = ['#2563EB', '#0EA5E9', '#0D9488', '#6366F1', '#64748B', '#D97706'];

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
    <div className="min-h-screen bg-[#F8FAFC] space-y-4 pb-8">
      {/* ==================== PAGE HEADER ==================== */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Phân tích khách hàng</span>
            <span className="text-slate-300">/</span>
            <span>Thói quen &amp; xu hướng tiêu dùng</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-1">
            Phân tích thói quen mua sắm
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Nhận diện nhóm linh kiện ưa chuộng, thói quen chọn phương thức thanh toán và các sản phẩm mua nhiều nhất.
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

      {/* ==================== ROW 1: CATEGORY & PAYMENT PREFERENCES ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Preferred Categories */}
        <div className="bg-white p-5 rounded-md border border-slate-200 flex flex-col justify-between space-y-4">
          <div className="border-b pb-3 border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              Ngành hàng được quan tâm nhiều nhất
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tỷ trọng các nhóm linh kiện cấu thành giỏ hàng
            </p>
          </div>

          <div className="h-[210px]">
            {categories.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories}
                    dataKey="value"
                    nameKey="categoryName"
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={78}
                    paddingAngle={2}
                  >
                    {categories.map((_, index) => (
                      <Cell key={`habit-cat-${index}`} fill={HABIT_COLORS[index % HABIT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => formatVND(Number(val || 0)) as any}
                    contentStyle={{
                      borderRadius: '6px',
                      borderColor: '#E2E8F0',
                      fontSize: '12px',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Chưa có dữ liệu danh mục
              </div>
            )}
          </div>

          <div className="divide-y divide-slate-100 border-t border-slate-100 max-h-[160px] overflow-y-auto pr-1">
            {categories.map((c, i) => (
              <div key={c.categoryId ?? i} className="flex items-center justify-between gap-2 text-xs py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: HABIT_COLORS[i % HABIT_COLORS.length] }}
                  />
                  <span className="text-slate-700 truncate">{c.categoryName}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 tabular-nums">
                  <span className="text-slate-500">{formatVND(c.value)}</span>
                  <span className="font-semibold text-slate-900 w-10 text-right">{c.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Methods (flat divide-y, no card-in-card) */}
        <div className="bg-white rounded-md border border-slate-200 overflow-hidden flex flex-col">
          <div className="px-5 py-3.5 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">
              Thói quen thanh toán của người mua
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Xu hướng lựa chọn phương thức thanh toán khi chốt đơn
            </p>
          </div>

          <div className="divide-y divide-slate-100 flex-1">
            {paymentMethods.length > 0 ? (
              paymentMethods.map((p, idx) => (
                <div key={p.methodId ?? idx} className="px-5 py-4 space-y-2 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-center justify-between gap-2 text-xs tabular-nums">
                    <span className="font-medium text-slate-900">{p.methodName}</span>
                    <span className="font-semibold text-slate-900">{p.percentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-sm h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-sm bg-blue-600 transition-all duration-300"
                      style={{ width: `${Math.min(100, p.percentage)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                    <span>Tổng doanh số qua phương thức này</span>
                    <span className="font-medium text-slate-700">{formatVND(p.amount)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center text-xs text-slate-400">
                Chưa có dữ liệu thanh toán
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== ROW 2: TOP PURCHASED PRODUCTS TABLE ==================== */}
      <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Sản phẩm được khách hàng mua nhiều nhất
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Danh sách các linh kiện có tần suất lựa chọn và doanh thu cao nhất
            </p>
          </div>
          <span className="text-xs text-slate-500 tabular-nums shrink-0">
            Top <strong className="font-medium text-slate-900">{formatNumber(topProducts.length)}</strong> sản phẩm
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[11px] font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 w-12">#</th>
                <th className="py-2.5 px-4 min-w-[260px]">Sản phẩm</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Đã tiêu thụ</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Doanh thu</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Lợi nhuận gộp</th>
                <th className="py-2.5 px-4 text-right whitespace-nowrap">Biên LN (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {topProducts.length > 0 ? (
                topProducts.map((p, idx) => (
                  <tr key={p.productId ?? idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-400 tabular-nums">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3 min-w-0 max-w-[360px]">
                        <div className="w-9 h-9 rounded-md border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 text-slate-400">
                          <Package className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-slate-900 truncate" title={p.productName}>
                            {p.productName}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5 truncate">
                            <span className="font-medium text-blue-600 tabular-nums shrink-0">
                              {p.productCode}
                            </span>
                            {p.categoryName && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="truncate">{p.categoryName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900 tabular-nums whitespace-nowrap">
                      {formatNumber(p.quantitySold)} chiếc
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {formatVND(p.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-emerald-700 tabular-nums whitespace-nowrap">
                      {formatVND(p.grossProfit)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700 tabular-nums whitespace-nowrap">
                      {p.grossMarginPercentage}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Chưa có dữ liệu sản phẩm bán chạy
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
