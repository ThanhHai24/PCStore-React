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

function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
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
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
