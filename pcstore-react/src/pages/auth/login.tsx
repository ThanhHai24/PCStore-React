import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    User as UserIcon,
    Lock,
    Mail,
    Eye,
    EyeOff,
    LogOut,
    Shield,
    Phone,
    UserCheck,
    KeyRound,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Building,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Account: React.FC = () => {
    const { user, login, logout, updateProfile, changePassword } = useAuth();
    const navigate = useNavigate();

    // Login Form state
    const [identifier, setIdentifier] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Profile View tabs: 'info' | 'edit' | 'password'
    const [activeTab, setActiveTab] = useState<'info' | 'edit' | 'password'>('info');

    // Edit Profile state
    const [fullName, setFullName] = useState(user?.fullName || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [avatar, setAvatar] = useState(user?.avatar || '');
    const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Change Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isChangingPass, setIsChangingPass] = useState(false);

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError('');
        if (!identifier.trim() || !loginPassword.trim()) {
            setLoginError('Vui lòng nhập đầy đủ Email/Tên đăng nhập và Mật khẩu');
            return;
        }

        setIsLoggingIn(true);
        try {
            const isEmail = identifier.includes('@');
            await login({
                ...(isEmail ? { email: identifier.trim() } : { username: identifier.trim() }),
                password: loginPassword,
            });
        } catch (err: any) {
            setLoginError(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
        } finally {
            setIsLoggingIn(false);
        }
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileMsg(null);
        if (!fullName.trim()) {
            setProfileMsg({ type: 'error', text: 'Họ và tên không được để trống' });
            return;
        }

        setIsUpdatingProfile(true);
        try {
            await updateProfile({
                fullName: fullName.trim(),
                phone: phone.trim() || undefined,
                avatar: avatar.trim() || undefined,
            });
            setProfileMsg({ type: 'success', text: 'Cập nhật thông tin thành công!' });
        } catch (err: any) {
            setProfileMsg({ type: 'error', text: err.message || 'Cập nhật thông tin thất bại' });
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPassMsg(null);

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            setPassMsg({ type: 'error', text: 'Vui lòng điền đầy đủ các trường thông tin' });
            return;
        }

        if (newPassword.length < 6) {
            setPassMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setPassMsg({ type: 'error', text: 'Xác nhận mật khẩu mới không khớp' });
            return;
        }

        setIsChangingPass(true);
        try {
            await changePassword({ currentPassword, newPassword });
            setPassMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err: any) {
            setPassMsg({ type: 'error', text: err.message || 'Đổi mật khẩu thất bại' });
        } finally {
            setIsChangingPass(false);
        }
    };

    // IF NOT LOGGED IN: Render Login Form
    if (!user) {
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
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Email / Tên đăng nhập</label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                                <input
                                    type="text"
                                    value={identifier}
                                    onChange={(e) => setIdentifier(e.target.value)}
                                    placeholder="vd: user@example.com hoặc username"
                                    className="w-full text-xs pl-9 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-xs font-semibold text-gray-700">Mật khẩu</label>
                                <Link to="/forgot-password" className="text-[11px] text-blue-600 font-semibold hover:underline">
                                    Quên mật khẩu?
                                </Link>
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
                                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                >
                                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoggingIn}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
                        >
                            {isLoggingIn ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Đang xử lý...</span>
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
    }

    // IF LOGGED IN: Render User Profile Page
    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Sidebar Profile Overview */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center space-y-4 h-fit">
                    <div className="relative">
                        {user.avatar ? (
                            <img
                                src={user.avatar}
                                alt={user.fullName}
                                className="w-24 h-24 rounded-full object-cover border-4 border-blue-50 shadow"
                            />
                        ) : (
                            <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-3xl rounded-full flex items-center justify-center shadow">
                                {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                            </div>
                        )}
                        <span
                            className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${user.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}
                            title={`Trạng thái: ${user.status}`}
                        />
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-gray-900">{user.fullName}</h2>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">@{user.username}</p>
                        <div className="mt-2 inline-flex items-center space-x-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-[11px] font-semibold">
                            <Shield className="w-3.5 h-3.5" />
                            <span>{user.role}</span>
                        </div>
                    </div>

                    <div className="w-full pt-4 border-t border-gray-100 space-y-2">
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`w-full flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${activeTab === 'info'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <UserCheck className="w-4 h-4" />
                            <span>Thông tin tài khoản</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('edit')}
                            className={`w-full flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${activeTab === 'edit'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <UserIcon className="w-4 h-4" />
                            <span>Chỉnh sửa thông tin</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('password')}
                            className={`w-full flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors ${activeTab === 'password'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <KeyRound className="w-4 h-4" />
                            <span>Đổi mật khẩu</span>
                        </button>

                        {(user.role === 'ADMIN' || user.role === 'STAFF') && (
                            <button
                                onClick={() => navigate('/admin')}
                                className="w-full flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                            >
                                <Building className="w-4 h-4" />
                                <span>Trang Quản Trị (Admin)</span>
                            </button>
                        )}

                        <button
                            onClick={() => {
                                logout();
                                navigate('/');
                            }}
                            className="w-full flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Đăng xuất</span>
                        </button>
                    </div>
                </div>

                {/* Right Main Content Panel */}
                <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    {activeTab === 'info' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Chi Tiết Tài Khoản</h3>
                                <p className="text-xs text-gray-500">Thông tin tổng quan về tài khoản của bạn</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-xl space-y-1">
                                    <span className="text-[11px] text-gray-400 font-medium">Họ và tên</span>
                                    <p className="text-xs font-bold text-gray-800">{user.fullName}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl space-y-1">
                                    <span className="text-[11px] text-gray-400 font-medium">Tên tài khoản</span>
                                    <p className="text-xs font-bold text-gray-800">@{user.username}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl space-y-1">
                                    <span className="text-[11px] text-gray-400 font-medium">Địa chỉ Email</span>
                                    <p className="text-xs font-bold text-gray-800">{user.email}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl space-y-1">
                                    <span className="text-[11px] text-gray-400 font-medium">Số điện thoại</span>
                                    <p className="text-xs font-bold text-gray-800">{user.phone || 'Chưa cập nhật'}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl space-y-1">
                                    <span className="text-[11px] text-gray-400 font-medium">Vai trò hệ thống</span>
                                    <p className="text-xs font-bold text-blue-600">{user.role}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-xl space-y-1">
                                    <span className="text-[11px] text-gray-400 font-medium">Trạng thái</span>
                                    <p className="text-xs font-bold text-emerald-600">{user.status}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'edit' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Chỉnh Sửa Hồ Sơ</h3>
                                <p className="text-xs text-gray-500">Cập nhật thông tin cá nhân của bạn</p>
                            </div>

                            {profileMsg && (
                                <div
                                    className={`p-3 rounded-xl flex items-center space-x-2 text-xs ${profileMsg.type === 'success'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-red-50 text-red-600 border border-red-200'
                                        }`}
                                >
                                    {profileMsg.type === 'success' ? (
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                    )}
                                    <span>{profileMsg.text}</span>
                                </div>
                            )}

                            <form onSubmit={handleUpdateProfile} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Họ và tên</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full text-xs px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Số điện thoại</label>
                                    <div className="relative">
                                        <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                        <input
                                            type="text"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="0987654321"
                                            className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">URL Ảnh Đại Diện (Avatar)</label>
                                    <input
                                        type="text"
                                        value={avatar}
                                        onChange={(e) => setAvatar(e.target.value)}
                                        placeholder="https://example.com/avatar.jpg"
                                        className="w-full text-xs px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isUpdatingProfile}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow transition-colors flex items-center space-x-2 disabled:opacity-70"
                                >
                                    {isUpdatingProfile ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Đang lưu...</span>
                                        </>
                                    ) : (
                                        <span>Lưu Thay Đổi</span>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}

                    {activeTab === 'password' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Đổi Mật Khẩu</h3>
                                <p className="text-xs text-gray-500">Cập nhật mật khẩu bảo mật cho tài khoản của bạn</p>
                            </div>

                            {passMsg && (
                                <div
                                    className={`p-3 rounded-xl flex items-center space-x-2 text-xs ${passMsg.type === 'success'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-red-50 text-red-600 border border-red-200'
                                        }`}
                                >
                                    {passMsg.type === 'success' ? (
                                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    ) : (
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                    )}
                                    <span>{passMsg.text}</span>
                                </div>
                            )}

                            <form onSubmit={handleChangePassword} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Mật khẩu hiện tại</label>
                                    <div className="relative">
                                        <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                        <input
                                            type={showCurrentPassword ? 'text' : 'password'}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full text-xs pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                        >
                                            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Mật khẩu mới (Tối thiểu 6 ký tự)</label>
                                    <div className="relative">
                                        <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full text-xs pl-9 pr-10 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                        >
                                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Xác nhận mật khẩu mới</label>
                                    <div className="relative">
                                        <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                                        <input
                                            type="password"
                                            value={confirmNewPassword}
                                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                                            className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                            required
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isChangingPass}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow transition-colors flex items-center space-x-2 disabled:opacity-70"
                                >
                                    {isChangingPass ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Đang cập nhật...</span>
                                        </>
                                    ) : (
                                        <span>Cập Nhật Mật Khẩu</span>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Account;

