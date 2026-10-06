import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Lock, Eye, EyeOff } from 'lucide-react';

export const ForgotPassword: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState<1 | 2 | 3>(1); // Step 1: Email, Step 2: OTP & New Pass, Step 3: Success

    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);

    // Handle Step 1: Send Request
    const handleSendResetEmail = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        if (!email.trim()) {
            setErrorMsg('Vui lòng nhập Email hoặc Tên đăng nhập của bạn.');
            return;
        }

        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setSuccessMsg('Mã xác nhận (OTP) đã được gửi tới Email của bạn.');
            setStep(2);
        }, 600);
    };

    // Handle Step 2: Reset Password
    const handleResetPassword = (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');

        if (!otp.trim()) {
            setErrorMsg('Vui lòng nhập mã xác nhận OTP.');
            return;
        }

        if (newPassword.length < 6) {
            setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setErrorMsg('Xác nhận mật khẩu mới không khớp.');
            return;
        }

        setLoading(true);
        setTimeout(() => {
            setLoading(false);
            setStep(3);
        }, 600);
    };

    return (
        <div className="max-w-[450px] mx-auto px-4 py-12">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                {/* Header Section */}
                <div className="text-center space-y-1">
                    <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                        <KeyRound className="w-7 h-7" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Quên Mật Khẩu</h1>
                    <p className="text-xs text-gray-500">
                        {step === 1 && 'Nhập Email đăng ký để nhận mã khôi phục mật khẩu'}
                        {step === 2 && 'Nhập mã OTP và thiết lập mật khẩu mới của bạn'}
                        {step === 3 && 'Mật khẩu của bạn đã được cập nhật thành công!'}
                    </p>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-red-600 text-xs animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Success Banner */}
                {successMsg && step === 2 && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-2 text-emerald-700 text-xs animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{successMsg}</span>
                    </div>
                )}

                {/* STEP 1: Enter Email */}
                {step === 1 && (
                    <form onSubmit={handleSendResetEmail} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Email / Tên đăng nhập <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="user@example.com hoặc username"
                                    className="w-full text-xs pl-9 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Đang gửi mã...</span>
                                </>
                            ) : (
                                <span>Gửi Mã Khôi Phục</span>
                            )}
                        </button>
                    </form>
                )}

                {/* STEP 2: Enter OTP & New Password */}
                {step === 2 && (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Mã xác nhận OTP (6 chữ số) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="123456"
                                className="w-full text-center tracking-[8px] font-mono text-base py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Mật khẩu mới <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Tối thiểu 6 ký tự"
                                    className="w-full text-xs pl-9 pr-10 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">
                                Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full text-xs pl-9 pr-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-70"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Đang cập nhật...</span>
                                </>
                            ) : (
                                <span>Đặt Lai Mật Khẩu</span>
                            )}
                        </button>
                    </form>
                )}

                {/* STEP 3: Success Banner & Go to Login */}
                {step === 3 && (
                    <div className="text-center space-y-4 py-4">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed">
                            Mật khẩu của bạn đã được đặt lại thành công. Bây giờ bạn có thể đăng nhập bằng mật khẩu mới!
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3.5 rounded-xl shadow-md transition-all"
                        >
                            Đăng Nhập Ngay
                        </button>
                    </div>
                )}

                {/* Footer Back Link */}
                {step !== 3 && (
                    <div className="pt-2 text-center text-xs text-gray-500 border-t border-gray-100">
                        <Link to="/login" className="inline-flex items-center space-x-1 text-blue-600 font-bold hover:underline">
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Quay lại trang Đăng nhập</span>
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
