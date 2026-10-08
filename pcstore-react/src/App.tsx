import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import MainLayout from './layouts/mainLayout';
import Home from './pages/storePage/home/home';
import ProductDetail from './pages/storePage/detail/detail';
import BuildPc from './pages/storePage/builder/builder';
import Cart from './pages/storePage/cart/cart';
import PaymentResult from './pages/storePage/cart/paymentResult';
import ProductCompare from './pages/storePage/compare/compare';
import Account from './pages/auth/login';
import Register from './pages/auth/register';
import ForgotPassword from './pages/auth/forgotPassword';
import NotFound from './pages/storePage/notFound/notFound';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import AdminDashboard from './pages/admin/dashboard';
import AdminLayout from './layouts/adminLayout';
import UserList from './pages/admin/user/list';

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
              <Route path="login" element={<Account />} />
              <Route path="register" element={<Register />} />
              <Route path="account" element={<Account />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="admin" element={<AdminDashboard />} />
              <Route path="users" element={<UserList />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
