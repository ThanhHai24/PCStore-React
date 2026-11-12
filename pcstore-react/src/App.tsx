import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import MainLayout from './layouts/mainLayout';
import Home from './pages/storePage/home/home';
import ProductDetail from './pages/storePage/detail/detail';
import BuildPc from './pages/storePage/builder/builder';
import Cart from './pages/storePage/cart/cart';
import PaymentResult from './pages/storePage/cart/paymentResult';
import ProductCompare from './pages/storePage/compare/compare';
import WarrantyLookup from './pages/storePage/warranty/warrantyLookup';
import Login from './pages/auth/login';
import Account from './pages/auth/account';
import Register from './pages/auth/register';
import ForgotPassword from './pages/auth/forgotPassword';
import NotFound from './pages/storePage/notFound/notFound';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import AdminDashboard from './pages/admin/dashboard';
import AdminLayout from './layouts/adminLayout';
import UserList from './pages/admin/user/list';
import CategoryList from './pages/admin/category/list';
import BrandList from './pages/admin/brand/list';
import ProductList from './pages/admin/product/list';
import PCConfigList from './pages/admin/pcconfig/list';
import SupplierList from './pages/admin/supplier/list';
import PurchaseOrderList from './pages/admin/purchaseOrder/list';
import GoodsReceiptList from './pages/admin/goodsReceipt/list';
import ProductSerialList from './pages/admin/serial/list';
import WarehouseInventoryList from './pages/admin/inventory/list';
import SupplierReturnList from './pages/admin/supplierReturn/list';
import OrderList from './pages/admin/order/list';
import PackagingList from './pages/admin/packaging/list';
import HandoverList from './pages/admin/handover/list';
import DeliveryList from './pages/admin/shipping/list';
import WarrantyPolicyList from './pages/admin/warranty/policyList';
import ProductWarrantyList from './pages/admin/warranty/productWarrantyList';
import WarrantyRequestList from './pages/admin/warranty/requestList';
import TechnicalHandlingList from './pages/admin/warranty/technicalHandlingList';
import SparePartsList from './pages/admin/warranty/sparePartsList';
import WarrantyHistoryList from './pages/admin/warranty/warrantyHistoryList';
import ReviewCommentList from './pages/admin/review/list';
import RevenueReportPage from './pages/admin/reports/sales/revenueReport';
import OrderStatusReportPage from './pages/admin/reports/sales/orderStatusReport';
import SystemLogList from './pages/admin/systemLog/list';

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <ScrollToTop />
          <Routes>
            {/* User Storefront Routes */}
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Home />} />
              <Route path="product" element={<ProductDetail />} />
              <Route path="product/:id" element={<ProductDetail />} />
              <Route path="compare" element={<ProductCompare />} />
              <Route path="build-pc" element={<BuildPc />} />
              <Route path="warranty" element={<WarrantyLookup />} />
              <Route path="warranty-lookup" element={<WarrantyLookup />} />
              <Route path="tra-cuu-bao-hanh" element={<WarrantyLookup />} />
              <Route path="bao-hanh" element={<WarrantyLookup />} />
              <Route path="cart" element={<Cart />} />
              <Route path="vnpay-return" element={<PaymentResult />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="account" element={<Account />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="*" element={<NotFound />} />

            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="users" element={<UserList />} />
              <Route path="user" element={<UserList />} />
              <Route path="sales/customers" element={<UserList defaultTab="CUSTOMER" />} />
              <Route path="customers" element={<UserList defaultTab="CUSTOMER" />} />
              <Route path="logs" element={<SystemLogList />} />
              <Route path="system-logs" element={<SystemLogList />} />
              <Route path="log" element={<SystemLogList />} />
              <Route path="category" element={<CategoryList />} />
              <Route path="categories" element={<CategoryList />} />
              <Route path="brand" element={<BrandList />} />
              <Route path="brands" element={<BrandList />} />
              <Route path="product" element={<ProductList />} />
              <Route path="products" element={<ProductList />} />
              <Route path="pcconfig" element={<PCConfigList />} />
              <Route path="pc-config" element={<PCConfigList />} />
              <Route path="reviews" element={<ReviewCommentList />} />
              <Route path="review" element={<ReviewCommentList />} />
              <Route path="comments" element={<ReviewCommentList />} />
              <Route path="supplier" element={<SupplierList />} />
              <Route path="suppliers" element={<SupplierList />} />
              <Route path="import" element={<PurchaseOrderList />} />
              <Route path="imports" element={<PurchaseOrderList />} />
              <Route path="purchase-orders" element={<PurchaseOrderList />} />
              <Route path="purchase-order" element={<PurchaseOrderList />} />
              <Route path="import-ticket" element={<GoodsReceiptList />} />
              <Route path="import-tickets" element={<GoodsReceiptList />} />
              <Route path="goods-receipt" element={<GoodsReceiptList />} />
              <Route path="goods-receipts" element={<GoodsReceiptList />} />
              <Route path="warehouse/inbound" element={<GoodsReceiptList />} />
              <Route path="warehouse/supplier-returns" element={<SupplierReturnList />} />
              <Route path="warehouse/supplier-return" element={<SupplierReturnList />} />
              <Route path="supplier-returns" element={<SupplierReturnList />} />
              <Route path="supplier-return" element={<SupplierReturnList />} />
              <Route path="sales/orders" element={<OrderList />} />
              <Route path="order" element={<OrderList />} />
              <Route path="orders" element={<OrderList />} />
              <Route path="warehouse/inventory" element={<WarehouseInventoryList />} />
              <Route path="warehouse/products" element={<WarehouseInventoryList />} />
              <Route path="inventory" element={<WarehouseInventoryList />} />
              <Route path="warehouse/packaging" element={<PackagingList />} />
              <Route path="packaging" element={<PackagingList />} />
              <Route path="warehouse/handover" element={<HandoverList />} />
              <Route path="handover" element={<HandoverList />} />
              <Route path="shipping/deliveries" element={<DeliveryList />} />
              <Route path="shipping/delivery" element={<DeliveryList />} />
              <Route path="shipping/customer-returns" element={<DeliveryList />} />
              <Route path="deliveries" element={<DeliveryList />} />
              <Route path="delivery" element={<DeliveryList />} />
              <Route path="warehouse/serials" element={<ProductSerialList />} />
              <Route path="warehouse/serial" element={<ProductSerialList />} />
              <Route path="serials" element={<ProductSerialList />} />
              <Route path="serial" element={<ProductSerialList />} />

              {/* Warranty & Technical Service Routes */}
              <Route path="warranty/policies" element={<WarrantyPolicyList />} />
              <Route path="warranty/policy" element={<WarrantyPolicyList />} />
              <Route path="warranty-policies" element={<WarrantyPolicyList />} />
              <Route path="warranty/products" element={<ProductWarrantyList />} />
              <Route path="warranty/product" element={<ProductWarrantyList />} />
              <Route path="warranty-products" element={<ProductWarrantyList />} />
              <Route path="warranty/requests" element={<WarrantyRequestList />} />
              <Route path="warranty/request" element={<WarrantyRequestList />} />
              <Route path="warranty-requests" element={<WarrantyRequestList />} />
              <Route path="warranty/technical-handling" element={<TechnicalHandlingList />} />
              <Route path="warranty/spare-parts" element={<SparePartsList />} />
              <Route path="warranty/history" element={<WarrantyHistoryList />} />

              {/* Sales Reports Routes */}
              <Route path="reports/sales/revenue" element={<RevenueReportPage />} />
              <Route path="reports/revenue" element={<RevenueReportPage />} />
              <Route path="reports/sales/orders" element={<OrderStatusReportPage />} />
              <Route path="reports/orders" element={<OrderStatusReportPage />} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
