import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import MainLayout from './layouts/mainLayout';
import Home from './pages/storePage/home/home';
import ProductDetail from './pages/storePage/detail/detail';
import BuildPc from './pages/storePage/builder/builder';
import Cart from './pages/storePage/cart/cart';
import PaymentResult from './pages/storePage/cart/paymentResult';
import ProductCompare from './pages/storePage/compare/compare';
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
import SupplierList from './pages/admin/supplier/list';
import PurchaseOrderList from './pages/admin/purchaseOrder/list';
import GoodsReceiptList from './pages/admin/goodsReceipt/list';
import ProductSerialList from './pages/admin/serial/list';
import WarehouseInventoryList from './pages/admin/inventory/list';
import SupplierReturnList from './pages/admin/supplierReturn/list';
import OrderList from './pages/admin/order/list';

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
              <Route path="category" element={<CategoryList />} />
              <Route path="categories" element={<CategoryList />} />
              <Route path="brand" element={<BrandList />} />
              <Route path="brands" element={<BrandList />} />
              <Route path="product" element={<ProductList />} />
              <Route path="products" element={<ProductList />} />
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
              <Route path="warehouse/serials" element={<ProductSerialList />} />
              <Route path="warehouse/serial" element={<ProductSerialList />} />
              <Route path="serials" element={<ProductSerialList />} />
              <Route path="serial" element={<ProductSerialList />} />
            </Route>
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
