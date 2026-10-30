import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    User as UserIcon,
    Lock,
    Eye,
    EyeOff,
    LogOut,
    Shield,
    UserCheck,
    KeyRound,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Building,
    Camera,
    Package,
    Truck,
    Calendar,
    RefreshCw,
    X,
    AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { uploadImage, validateImageFile } from '../../services/imgbbService';
import { orderService } from '../../services/orderService';
import type { OrderResponse, OrderStatus } from '../../types/order';

export const Account: React.FC = () => {
    const { user, logout, updateProfile, changePassword, loading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Redirect to /login if not logged in
    useEffect(() => {
        if (!loading && !user) {
            navigate('/login', { replace: true });
        }
    }, [user, loading, navigate]);

    // Profile View tabs: 'info' | 'orders' | 'edit' | 'password'
    const [activeTab, setActiveTab] = useState<'info' | 'orders' | 'edit' | 'password'>('info');

    // Auto-switch tab based on query param (?tab=orders)
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab === 'orders' || tab === 'edit' || tab === 'password' || tab === 'info') {
            setActiveTab(tab);
        }
    }, [location.search]);

    // Edit Profile state
    const [fullName, setFullName] = useState(user?.fullName || '');
    const [phone, setPhone] = useState(user?.phone || '');
    const [avatar, setAvatar] = useState(user?.avatar || '');
    const [previewUrl, setPreviewUrl] = useState(user?.avatar || '');
    const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

    // Avatar upload states
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [, setUploadError] = useState<string | null>(null);
    const [, setUploadSuccessMsg] = useState<string | null>(null);

    // Orders state
    const [myOrders, setMyOrders] = useState<OrderResponse[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);
    const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderResponse | null>(null);
    const [cancelModalOrder, setCancelModalOrder] = useState<OrderResponse | null>(null);
    const [isCancellingOrder, setIsCancellingOrder] = useState<boolean>(false);
    const [orderActionMsg, setOrderActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Update edit state whenever user changes
    useEffect(() => {
        if (user) {
            setFullName(user.fullName || '');
            setPhone(user.phone || '');
            setAvatar(user.avatar || '');
            setPreviewUrl(user.avatar || '');
            setSelectedAvatarFile(null);
        }
    }, [user]);

    // Cleanup blob preview url on unmount
    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Load customer orders when 'orders' tab is active
    const fetchCustomerOrders = async () => {
        setIsLoadingOrders(true);
        setOrderActionMsg(null);
        try {
            const data = await orderService.getMyOrders({
                page: 0,
                size: 50,
                sort: ['createdDate,desc'],
            });
            setMyOrders(data.content || []);
        } catch (err: any) {
            console.error('Lỗi khi tải danh sách đơn hàng:', err);
            setOrderActionMsg({
                type: 'error',
                text: err.message || 'Không thể tải danh sách đơn hàng. Vui lòng thử lại sau!',
            });
        } finally {
            setIsLoadingOrders(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'orders' && user) {
            fetchCustomerOrders();
        }
    }, [activeTab, user]);

    const handleFileSelect = (file: File) => {
        const validation = validateImageFile(file, 32);
        if (!validation.valid) {
            setUploadError(validation.error || 'Tệp hình ảnh không hợp lệ');
            return;
        }

        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }

        const localPreview = URL.createObjectURL(file);
        setPreviewUrl(localPreview);
        setSelectedAvatarFile(file);
        setUploadError(null);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleRemoveAvatar = () => {
        if (previewUrl && previewUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewUrl);
        }
        setSelectedAvatarFile(null);
        setAvatar('');
        setPreviewUrl('');
        setUploadError(null);
        setUploadSuccessMsg(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // Change Password state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isChangingPass, setIsChangingPass] = useState(false);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileMsg(null);
        setUploadError(null);

        if (!fullName.trim()) {
            setProfileMsg({ type: 'error', text: 'Họ và tên không được để trống' });
            return;
        }

        setIsUpdatingProfile(true);
        let finalAvatar = avatar;

        try {
            if (selectedAvatarFile) {
                setIsUploadingAvatar(true);
                try {
                    const uploadedUrl = await uploadImage(selectedAvatarFile);
                    finalAvatar = uploadedUrl;
                    setAvatar(uploadedUrl);

                    if (previewUrl && previewUrl.startsWith('blob:')) {
                        URL.revokeObjectURL(previewUrl);
                    }
                    setPreviewUrl(uploadedUrl);
                    setSelectedAvatarFile(null);
                    setUploadSuccessMsg('Đã tải ảnh lên ImgBB thành công!');
                } catch (imgErr: any) {
                    const errDetail = imgErr.message || 'Tải ảnh lên ImgBB thất bại';
                    setUploadError(errDetail);
                    setProfileMsg({
                        type: 'error',
                        text: `Không thể tải ảnh đại diện lên ImgBB: ${errDetail}`,
                    });
                    setIsUploadingAvatar(false);
                    setIsUpdatingProfile(false);
                    return;
                } finally {
                    setIsUploadingAvatar(false);
                }
            }

            await updateProfile({
                fullName: fullName.trim(),
                phone: phone.trim() || undefined,
                avatar: finalAvatar.trim() || undefined,
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

    // Customer cancel pending order
    const handleConfirmCancelOrder = async () => {
        if (!cancelModalOrder) return;
        setIsCancellingOrder(true);
        setOrderActionMsg(null);
        try {
            await orderService.cancelOrder(cancelModalOrder.id);
            setOrderActionMsg({
                type: 'success',
                text: `Đã hủy đơn hàng ${cancelModalOrder.code} thành công!`,
            });
            setCancelModalOrder(null);
            await fetchCustomerOrders();
        } catch (err: any) {
            setOrderActionMsg({
                type: 'error',
                text: err.message || 'Không thể hủy đơn hàng này. Vui lòng liên hệ bộ phận hỗ trợ!',
            });
        } finally {
            setIsCancellingOrder(false);
        }
    };

    const formatVND = (price: number) => {
        return price.toLocaleString('vi-VN') + ' đ';
    };

    const formatDateTime = (dateStr?: string | null) => {
        if (!dateStr) return '---';
        try {
            const d = new Date(dateStr);
            return d.toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return dateStr;
        }
    };

    const renderOrderStatusBadge = (status: OrderStatus) => {
        switch (status) {
            case 'PENDING':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Chờ xác nhận (COD)
                    </span>
                );
            case 'CONFIRMED':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                        Đã xác nhận
                    </span>
                );
            case 'PROCESSING':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        Đang đóng gói/giao
                    </span>
                );
            case 'COMPLETED':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Hoàn tất
                    </span>
                );
            case 'CANCELLED':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                        Đã hủy
                    </span>
                );
            case 'RETURNED':
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
                        Đã hoàn trả
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
                        {status}
                    </span>
                );
        }
    };

    if (loading || !user) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="text-xs text-gray-500">Đang chuyển hướng đến trang đăng nhập...</p>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Sidebar Profile Overview */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center space-y-4 h-fit">
                    <div className="relative group">
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
                        <button
                            type="button"
                            onClick={() => {
                                setActiveTab('edit');
                                setTimeout(() => fileInputRef.current?.click(), 100);
                            }}
                            className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[1px]"
                            title="Bấm để đổi ảnh đại diện"
                        >
                            <Camera className="w-6 h-6" />
                            <span className="text-[10px] font-semibold mt-0.5">Đổi ảnh</span>
                        </button>
                        <span
                            className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white ${
                                user.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'
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
                        {/* Tab 1: Info */}
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`w-full flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                                activeTab === 'info'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <UserCheck className="w-4 h-4" />
                            <span>Thông tin tài khoản</span>
                        </button>

                        {/* Tab 2: Orders */}
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                                activeTab === 'orders'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex items-center space-x-2">
                                <Package className="w-4 h-4" />
                                <span>Đơn hàng của tôi</span>
                            </div>
                            {myOrders.length > 0 && (
                                <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                                        activeTab === 'orders'
                                            ? 'bg-white text-blue-600'
                                            : 'bg-blue-100 text-blue-700'
                                    }`}
                                >
                                    {myOrders.length}
                                </span>
                            )}
                        </button>

                        {/* Tab 3: Edit */}
                        <button
                            onClick={() => setActiveTab('edit')}
                            className={`w-full flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                                activeTab === 'edit'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <UserIcon className="w-4 h-4" />
                            <span>Chỉnh sửa thông tin</span>
                        </button>

                        {/* Tab 4: Password */}
                        <button
                            onClick={() => setActiveTab('password')}
                            className={`w-full flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                                activeTab === 'password'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        >
                            <KeyRound className="w-4 h-4" />
                            <span>Đổi mật khẩu</span>
                        </button>

                        {(user.role === 'ADMIN' || user.role === 'MANAGER' || user.role.startsWith('STAFF')) && (
                            <button
                                onClick={() => navigate('/admin')}
                                className="w-full flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                            >
                                <Building className="w-4 h-4" />
                                <span>Trang Quản Trị (Admin)</span>
                            </button>
                        )}

                        <button
                            onClick={() => {
                                logout();
                                navigate('/login');
                            }}
                            className="w-full flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Đăng xuất</span>
                        </button>
                    </div>
                </div>

                {/* Right Main Content Panel */}
                <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    {/* TAB: INFO */}
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
                                    <p className="text-xs font-bold text-gray-800">{user.email || 'Chưa cập nhật'}</p>
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
                                    <p className="text-xs font-bold text-emerald-600">{user.status || 'ACTIVE'}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: MY ORDERS */}
                    {activeTab === 'orders' && (
                        <div className="space-y-5">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                        <Package className="w-5 h-5 text-blue-600" />
                                        <span>Lịch Sử Đơn Hàng Của Bạn</span>
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Theo dõi tiến độ xử lý và chi tiết các đơn hàng bạn đã đặt
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={fetchCustomerOrders}
                                    disabled={isLoadingOrders}
                                    className="p-2 text-gray-500 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                                    title="Tải lại đơn hàng"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoadingOrders ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {orderActionMsg && (
                                <div
                                    className={`p-3 rounded-xl flex items-center space-x-2 text-xs animate-in fade-in ${
                                        orderActionMsg.type === 'success'
                                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                            : 'bg-red-50 text-red-700 border border-red-200'
                                    }`}
                                >
                                    {orderActionMsg.type === 'success' ? (
                                        <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                                    ) : (
                                        <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                                    )}
                                    <span>{orderActionMsg.text}</span>
                                </div>
                            )}

                            {isLoadingOrders ? (
                                <div className="py-12 flex flex-col items-center justify-center space-y-2">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                    <p className="text-xs text-gray-500">Đang tải danh sách đơn hàng...</p>
                                </div>
                            ) : myOrders.length === 0 ? (
                                <div className="py-12 text-center space-y-3 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                                        📦
                                    </div>
                                    <p className="text-sm font-bold text-gray-800">Bạn chưa có đơn hàng nào</p>
                                    <p className="text-xs text-gray-500 max-w-sm mx-auto">
                                        Hãy dạo quanh cửa hàng và lựa chọn các linh kiện, dàn PC gaming ưng ý nhé!
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => navigate('/')}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-5 rounded-xl shadow-xs transition-colors"
                                    >
                                        Mua sắm ngay
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {myOrders.map((ord) => (
                                        <div
                                            key={ord.id}
                                            className="p-4 rounded-2xl border border-gray-200 hover:border-blue-300 transition-all bg-white hover:shadow-xs space-y-3"
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-extrabold text-sm text-blue-950 font-mono">
                                                        {ord.code}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400">•</span>
                                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Calendar className="w-3 h-3 text-gray-400" />
                                                        {formatDateTime(ord.createdDate)}
                                                    </span>
                                                </div>
                                                <div>{renderOrderStatusBadge(ord.status)}</div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <span className="text-gray-400 text-[11px] block">Người nhận:</span>
                                                    <span className="font-semibold text-gray-900">
                                                        {ord.recipientName} ({ord.recipientPhone})
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-400 text-[11px] block">Địa chỉ giao:</span>
                                                    <span className="font-medium text-gray-700 line-clamp-1">
                                                        {ord.address}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap items-center justify-between pt-2 border-t border-gray-100 gap-2">
                                                <div>
                                                    <span className="text-[11px] text-gray-500">
                                                        Tổng thanh toán (COD):{' '}
                                                    </span>
                                                    <span className="text-sm font-black text-red-600">
                                                        {formatVND(ord.finalAmount)}
                                                    </span>
                                                    <span className="text-[11px] text-gray-400 ml-1.5">
                                                        ({ord.items?.length || 0} món)
                                                    </span>
                                                </div>

                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedOrderDetail(ord)}
                                                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        Xem chi tiết
                                                    </button>

                                                    {ord.status === 'PENDING' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setCancelModalOrder(ord)}
                                                            className="text-xs bg-red-50 hover:bg-red-100 text-red-700 font-bold px-3 py-1.5 rounded-lg border border-red-200 transition-colors cursor-pointer"
                                                        >
                                                            Hủy đơn
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: EDIT PROFILE */}
                    {activeTab === 'edit' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Chỉnh Sửa Hồ Sơ</h3>
                                <p className="text-xs text-gray-500">Cập nhật thông tin cá nhân của bạn</p>
                            </div>

                            {profileMsg && (
                                <div
                                    className={`p-3 rounded-xl flex items-center space-x-2 text-xs ${
                                        profileMsg.type === 'success'
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
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Họ và tên <span className="text-red-500">*</span>
                                    </label>
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
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full text-xs px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        placeholder="0912345678"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">Ảnh đại diện</label>
                                    <div className="flex items-center space-x-3">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs py-2 px-3.5 rounded-xl transition-colors cursor-pointer"
                                        >
                                            Chọn ảnh từ máy
                                        </button>
                                        {(avatar || selectedAvatarFile) && (
                                            <button
                                                type="button"
                                                onClick={handleRemoveAvatar}
                                                className="text-xs text-red-600 hover:underline cursor-pointer"
                                            >
                                                Gỡ ảnh
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isUpdatingProfile || isUploadingAvatar}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow transition-colors flex items-center space-x-2 disabled:opacity-70 cursor-pointer"
                                >
                                    {isUpdatingProfile ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>
                                                {isUploadingAvatar ? 'Đang tải ảnh lên' : 'Đang lưu thay đổi...'}
                                            </span>
                                        </>
                                    ) : (
                                        <span>Lưu Thay Đổi</span>
                                    )}
                                </button>
                            </form>
                        </div>
                    )}

                    {/* TAB: PASSWORD */}
                    {activeTab === 'password' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-base font-bold text-gray-900">Đổi Mật Khẩu</h3>
                                <p className="text-xs text-gray-500">Cập nhật mật khẩu bảo mật cho tài khoản của bạn</p>
                            </div>

                            {passMsg && (
                                <div
                                    className={`p-3 rounded-xl flex items-center space-x-2 text-xs ${
                                        passMsg.type === 'success'
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
                                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
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
                                            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
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
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow transition-colors flex items-center space-x-2 disabled:opacity-70 cursor-pointer"
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

            {/* Modal Chi Tiết Đơn Hàng */}
            {selectedOrderDetail && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setSelectedOrderDetail(null);
                        }
                    }}
                >
                    <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-lg w-full space-y-4 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="text-base font-extrabold text-gray-900 font-mono">
                                    Chi tiết đơn #{selectedOrderDetail.code}
                                </h3>
                                <p className="text-[11px] text-gray-400">
                                    Thời gian tạo: {formatDateTime(selectedOrderDetail.createdDate)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedOrderDetail(null)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex items-center justify-between bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-xs">
                            <span className="text-gray-600">Trạng thái:</span>
                            {renderOrderStatusBadge(selectedOrderDetail.status)}
                        </div>

                        <div className="space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs text-gray-700">
                            <div className="font-bold text-gray-900 text-[11px] uppercase tracking-wide flex items-center gap-1.5 border-b border-gray-200 pb-1">
                                <Truck className="w-3.5 h-3.5 text-blue-600" />
                                <span>Địa chỉ & Thông tin người nhận</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-1">
                                <div>
                                    <span className="text-gray-400 text-[10px] block">Người nhận:</span>
                                    <span className="font-bold text-gray-900">{selectedOrderDetail.recipientName}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-[10px] block">Số điện thoại:</span>
                                    <span className="font-bold text-blue-700">{selectedOrderDetail.recipientPhone}</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-gray-400 text-[10px] block">Địa chỉ nhận hàng:</span>
                                <span className="font-medium text-gray-800">{selectedOrderDetail.address}</span>
                            </div>
                            {selectedOrderDetail.note && (
                                <div>
                                    <span className="text-gray-400 text-[10px] block">Ghi chú:</span>
                                    <span className="italic text-gray-600">{selectedOrderDetail.note}</span>
                                </div>
                            )}
                        </div>

                        {/* Danh sách sản phẩm */}
                        <div className="space-y-2 text-xs">
                            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wide">
                                Danh sách sản phẩm ({selectedOrderDetail.items?.length || 0})
                            </h4>
                            <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                                {selectedOrderDetail.items?.map((it) => (
                                    <div key={it.id} className="p-3 flex items-center justify-between gap-3 bg-white">
                                        <div className="min-w-0 flex-1">
                                            <p className="font-bold text-gray-800 truncate">
                                                {it.productName || `Sản phẩm #${it.productId}`}
                                            </p>
                                            <div className="flex items-center space-x-2 text-[11px] text-gray-500 mt-0.5">
                                                <span>Đơn giá: {formatVND(it.unitPrice)}</span>
                                                <span>•</span>
                                                <span>SL: x{it.quantity}</span>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 font-black text-gray-900">
                                            {formatVND(it.subtotal || it.unitPrice * it.quantity)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tổng kết tiền */}
                        <div className="space-y-1.5 pt-2 border-t border-gray-100 text-xs">
                            <div className="flex justify-between text-gray-500">
                                <span>Tạm tính tiền hàng:</span>
                                <span className="font-semibold text-gray-800">{formatVND(selectedOrderDetail.totalAmount)}</span>
                            </div>
                            {selectedOrderDetail.discountAmount > 0 && (
                                <div className="flex justify-between text-emerald-600">
                                    <span>Khuyến mãi giảm giá:</span>
                                    <span>-{formatVND(selectedOrderDetail.discountAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-gray-500">
                                <span>Phí vận chuyển:</span>
                                <span className="text-emerald-600 font-bold">Miễn phí toàn quốc</span>
                            </div>
                            <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-gray-100">
                                <span>Tổng tiền COD thanh toán:</span>
                                <span className="text-red-600 text-base">{formatVND(selectedOrderDetail.finalAmount)}</span>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="button"
                                onClick={() => setSelectedOrderDetail(null)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wide transition-colors cursor-pointer"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Xác Nhận Hủy Đơn Hàng */}
            {cancelModalOrder && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setCancelModalOrder(null);
                        }
                    }}
                >
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl border border-gray-100">
                        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <AlertTriangle className="w-7 h-7" />
                        </div>

                        <div>
                            <h3 className="text-base font-black text-gray-900">
                                Xác nhận hủy đơn hàng #{cancelModalOrder.code}?
                            </h3>
                            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                                Bạn có chắc chắn muốn hủy đơn hàng này không? Sau khi hủy, đơn hàng sẽ chuyển sang trạng thái Đã hủy và không thể hoàn tác.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setCancelModalOrder(null)}
                                disabled={isCancellingOrder}
                                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-3 rounded-xl text-xs uppercase tracking-wide transition-colors cursor-pointer"
                            >
                                Giữ lại đơn
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmCancelOrder}
                                disabled={isCancellingOrder}
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs uppercase tracking-wider transition-colors shadow flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
                            >
                                {isCancellingOrder ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Đang hủy...</span>
                                    </>
                                ) : (
                                    <span>Xác nhận hủy</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Account;
