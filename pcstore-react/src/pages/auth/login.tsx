import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    User as UserIcon,
    Lock,
    Eye,
    EyeOff,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Login: React.FC = () => {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as any)?.from;

    // If already logged in, redirect to appropriate page
    useEffect(() => {
        if (user) {
            if (
                user.role === 'ADMIN' ||
                user.role === 'MANAGER' ||
                user.role.startsWith('STAFF')
            ) {
                const target = from && typeof from === 'string' && from.startsWith('/admin') ? from : '/admin';
                navigate(target, { replace: true });
            } else {
                const target = from && typeof from === 'string' && !from.startsWith('/admin') ? from : '/account';
                navigate(target, { replace: true });
            }
        }
    }, [user, navigate, from]);

    // Login Form state
    const [identifier, setIdentifier] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        if (!identifier.trim() || !loginPassword.trim()) {
            setLoginError('Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu');
            return;
        }

        setIsLoggingIn(true);
        try {
            const loggedUser = await login({
                username: identifier.trim(),
                password: loginPassword,
            });

            // Redirect admin, manager, or staff to /admin; customers to /account
            if (
                loggedUser.role === 'ADMIN' ||
                loggedUser.role === 'MANAGER' ||
                loggedUser.role.startsWith('STAFF')
            ) {
                const target = from && typeof from === 'string' && from.startsWith('/admin') ? from : '/admin';
                navigate(target, { replace: true });
            } else {
                const target = from && typeof from === 'string' && !from.startsWith('/admin') ? from : '/account';
                navigate(target, { replace: true });
            }
        } catch (err: any) {
            setLoginError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    return (
        <div className="max-w-[450px] mx-auto px-4 py-12">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                <div className="text-center space-y-1">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                        <UserIcon className="w-7 h-7" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Đăng Nhập Tài Khoản</h1>
                    <p className="text-xs text-gray-500">Nhập thông tin tài khoản của bạn để tiếp tục</p>
                </div>

                {loginError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-red-600 text-xs animate-in fade-in duration-200">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{loginError}</span>
                    </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">
                            Tên đăng nhập / Email
                        </label>
                        <div className="relative">
                            <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="Tên đăng nhập"
                                className="w-full text-xs pl-9 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="block text-xs font-semibold text-gray-700">Mật khẩu</label>
                        </div>
                        <div className="relative">
                            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                            <input
                                type={showLoginPassword ? 'text' : 'password'}
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full text-xs pl-9 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowLoginPassword(!showLoginPassword)}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                                {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <Link to="/forgot-password" className="text-[11px] text-blue-600 font-semibold hover:underline">
                            Quên mật khẩu?
                        </Link>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-70 cursor-pointer"
                    >
                        {isLoggingIn ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Đang kiểm tra thông tin...</span>
                            </>
                        ) : (
                            <span>Đăng Nhập</span>
                        )}
                    </button>
                </form>

                <div className="pt-2 text-center text-xs text-gray-500 border-t border-gray-100">
                    Chưa có tài khoản?{' '}
                    <Link to="/register" className="text-blue-600 font-bold hover:underline">
                        Đăng ký ngay
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
