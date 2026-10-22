import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    User as UserIcon,
    Lock,
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
    Upload,
    Camera,
    Trash2,
    Link as LinkIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { uploadImage, validateImageFile } from '../../services/imgbbService';

export const Account: React.FC = () => {
    const { user, logout, updateProfile, changePassword, loading } = useAuth();
    const navigate = useNavigate();

    // Redirect to /login if not logged in
    useEffect(() => {
        if (!loading && !user) {
            navigate('/login', { replace: true });
        }
    }, [user, loading, navigate]);

    // Profile View tabs: 'info' | 'edit' | 'password'
    const [activeTab, setActiveTab] = useState<'info' | 'edit' | 'password'>('info');

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
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);

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

    const handleFileSelect = (file: File) => {
        const validation = validateImageFile(file, 32);
        if (!validation.valid) {
            setUploadError(validation.error || 'Tệp hình ảnh không hợp lệ');
            return;
        }

        // Dọn dẹp blob url cũ trước đó nếu có
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

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
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
            // NẾU CÓ ẢNH ĐƯỢC CHỌN TỪ MÁY: BÂY GIỜ MỚI TIẾN HÀNH ĐẨY LÊN IMGBB
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
                            className={`w-full flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'info'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <UserCheck className="w-4 h-4" />
                            <span>Thông tin tài khoản</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('edit')}
                            className={`w-full flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'edit'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <UserIcon className="w-4 h-4" />
                            <span>Chỉnh sửa thông tin</span>
                        </button>

                        <button
                            onClick={() => setActiveTab('password')}
                            className={`w-full flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${activeTab === 'password'
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
                                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                                        Ảnh Đại Diện (Avatar)
                                    </label>

                                    {/* Upload container */}
                                    <div className="p-4 bg-gray-50/70 border border-gray-200/80 rounded-2xl flex flex-col sm:flex-row items-center gap-5">
                                        {/* Avatar preview with loader */}
                                        <div className="relative group shrink-0">
                                            {previewUrl || avatar ? (
                                                <img
                                                    src={previewUrl || avatar}
                                                    alt="Avatar preview"
                                                    className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                                                />
                                            ) : (
                                                <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-3xl rounded-full flex items-center justify-center shadow-md border-4 border-white">
                                                    {fullName ? fullName.charAt(0).toUpperCase() : 'U'}
                                                </div>
                                            )}

                                            {isUploadingAvatar && (
                                                <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white backdrop-blur-[2px]">
                                                    <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                                                    <span className="text-[10px] mt-1 font-semibold text-center px-1">Đang tải lên...</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Upload Controls */}
                                        <div className="flex-1 w-full space-y-2.5">
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileChange}
                                                accept="image/*"
                                                className="hidden"
                                            />

                                            {/* Drag and drop box */}
                                            <div
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    setIsDragging(true);
                                                }}
                                                onDragLeave={() => setIsDragging(false)}
                                                onDrop={handleDrop}
                                                onClick={() => fileInputRef.current?.click()}
                                                className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition-all ${isDragging
                                                    ? 'border-blue-500 bg-blue-50/60 scale-[1.01]'
                                                    : 'border-gray-300 hover:border-blue-500 hover:bg-white bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex flex-col items-center justify-center space-y-1">
                                                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-0.5">
                                                        <Upload className="w-4 h-4" />
                                                    </div>
                                                    <p className="text-xs font-semibold text-gray-700">
                                                        Bấm để chọn ảnh từ máy tính hoặc kéo thả ảnh vào đây
                                                    </p>
                                                    <p className="text-[11px] text-gray-400">
                                                        Hỗ trợ PNG, JPG, WEBP, GIF (Chỉ xem trước, bấm "Lưu Thay Đổi" để tải lên ImgBB)
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Status message */}
                                            {uploadError && (
                                                <div className="p-2.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs flex items-center space-x-2">
                                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                                    <span>{uploadError}</span>
                                                </div>
                                            )}
                                            {uploadSuccessMsg && (
                                                <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs flex items-center space-x-2">
                                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                                    <span>{uploadSuccessMsg}</span>
                                                </div>
                                            )}

                                            {/* Action bar */}
                                            <div className="flex items-center justify-between text-xs pt-0.5">
                                                {(avatar || previewUrl) ? (
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveAvatar}
                                                        className="inline-flex items-center space-x-1 text-red-600 hover:text-red-700 font-medium text-xs cursor-pointer py-1 px-2 rounded-lg hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        <span>Xóa ảnh hiện tại</span>
                                                    </button>
                                                ) : <span />}

                                                <button
                                                    type="button"
                                                    onClick={() => setShowUrlInput(!showUrlInput)}
                                                    className="inline-flex items-center space-x-1 text-gray-500 hover:text-blue-600 font-medium text-xs cursor-pointer py-1 px-2 rounded-lg hover:bg-gray-100 transition-colors"
                                                >
                                                    <LinkIcon className="w-3.5 h-3.5" />
                                                    <span>{showUrlInput ? 'Ẩn link ảnh' : 'Nhập URL trực tiếp'}</span>
                                                </button>
                                            </div>

                                            {/* Direct URL input if expanded */}
                                            {showUrlInput && (
                                                <div className="pt-1.5 space-y-1">
                                                    <input
                                                        type="text"
                                                        value={avatar}
                                                        onChange={(e) => {
                                                            if (previewUrl && previewUrl.startsWith('blob:')) {
                                                                URL.revokeObjectURL(previewUrl);
                                                            }
                                                            setSelectedAvatarFile(null);
                                                            setAvatar(e.target.value);
                                                            setPreviewUrl(e.target.value);
                                                        }}
                                                        placeholder="https://i.ibb.co/... hoặc link ảnh bất kỳ"
                                                        className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    />
                                                    <p className="text-[10px] text-gray-400">
                                                        Liên kết ảnh đại diện sẽ được lưu vào tài khoản
                                                    </p>
                                                </div>
                                            )}
                                        </div>
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
        </div>
    );
};

export default Account;
