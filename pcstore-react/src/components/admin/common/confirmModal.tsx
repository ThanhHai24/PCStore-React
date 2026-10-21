import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, AlertCircle, CheckCircle2, X, Loader2 } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

export interface AdminConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: React.ReactNode;
    message?: React.ReactNode;
    description?: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmVariant;
    icon?: React.ElementType;
    isLoading?: boolean;
    itemPreview?: {
        title: string;
        subtitle?: string;
        badge?: string;
        avatar?: string;
    };
}

export const AdminConfirmModal: React.FC<AdminConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    description,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy bỏ',
    variant = 'danger',
    icon: CustomIcon,
    isLoading = false,
    itemPreview,
}) => {
    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && !isLoading) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isLoading, onClose]);

    if (!isOpen) return null;

    // Variant styling
    const variantConfig = {
        danger: {
            icon: CustomIcon || Trash2,
            iconBg: 'bg-rose-100 text-rose-600 ring-8 ring-rose-50',
            confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20',
            borderAccent: 'border-rose-100',
        },
        warning: {
            icon: CustomIcon || AlertTriangle,
            iconBg: 'bg-amber-100 text-amber-600 ring-8 ring-amber-50',
            confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20',
            borderAccent: 'border-amber-100',
        },
        info: {
            icon: CustomIcon || AlertCircle,
            iconBg: 'bg-blue-100 text-blue-600 ring-8 ring-blue-50',
            confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20',
            borderAccent: 'border-blue-100',
        },
        success: {
            icon: CustomIcon || CheckCircle2,
            iconBg: 'bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50',
            confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20',
            borderAccent: 'border-emerald-100',
        },
    }[variant];

    const IconComponent = variantConfig.icon;

    return (
        <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isLoading) {
                    onClose();
                }
            }}
            role="dialog"
            aria-modal="true"
        >
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
                    title="Đóng popup"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="p-6 space-y-4">
                    {/* Header with Icon */}
                    <div className="flex items-start gap-4">
                        <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${variantConfig.iconBg}`}
                        >
                            <IconComponent className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                            <h3 className="text-base font-bold text-gray-900 tracking-tight leading-snug">
                                {title}
                            </h3>
                            {message && (
                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                    {message}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Item Preview Card (Optional) */}
                    {itemPreview && (
                        <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100 flex items-center gap-3">
                            {itemPreview.avatar && (
                                <img
                                    src={itemPreview.avatar}
                                    alt={itemPreview.title}
                                    className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-gray-900 truncate">
                                    {itemPreview.title}
                                </p>
                                {itemPreview.subtitle && (
                                    <p className="text-[11px] text-gray-500 font-medium truncate">
                                        {itemPreview.subtitle}
                                    </p>
                                )}
                            </div>
                            {itemPreview.badge && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-gray-700 border border-gray-200 flex-shrink-0 shadow-sm">
                                    {itemPreview.badge}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Description Note */}
                    {description && (
                        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-800 leading-relaxed flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <span>{description}</span>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="px-6 py-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors shadow-sm disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-60 disabled:cursor-not-allowed ${variantConfig.confirmBtn}`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Đang xử lý...</span>
                            </>
                        ) : (
                            <span>{confirmText}</span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminConfirmModal;
