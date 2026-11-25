import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { AdminButton, renderIconNode } from './formElements';

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

    // Variant styling (border-first, restrained)
    const variantConfig = {
        danger: {
            icon: CustomIcon || Trash2,
            iconBg: 'bg-rose-50 text-rose-600 border border-rose-200',
            confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white',
            borderAccent: 'border-rose-200',
        },
        warning: {
            icon: CustomIcon || AlertTriangle,
            iconBg: 'bg-amber-50 text-amber-600 border border-amber-200',
            confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white',
            borderAccent: 'border-amber-200',
        },
        info: {
            icon: CustomIcon || AlertCircle,
            iconBg: 'bg-blue-50 text-blue-600 border border-blue-200',
            confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
            borderAccent: 'border-blue-200',
        },
        success: {
            icon: CustomIcon || CheckCircle2,
            iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
            confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white',
            borderAccent: 'border-emerald-200',
        },
    }[variant];

    const IconComponent = variantConfig.icon;

    return (
        <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
            onClick={(e) => {
                if (e.target === e.currentTarget && !isLoading) {
                    onClose();
                }
            }}
            role="dialog"
            aria-modal="true"
        >
            <div className="relative w-full max-w-md bg-white rounded-md shadow-lg border border-slate-200 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                    title="Đóng popup"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="p-5 space-y-4">
                    {/* Header with Icon */}
                    <div className="flex items-start gap-3.5">
                        <div
                            className={`w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0 ${variantConfig.iconBg}`}
                        >
                            {renderIconNode(IconComponent, 'w-5 h-5')}
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                            <h3 className="text-base font-semibold text-slate-900 tracking-tight leading-snug">
                                {title}
                            </h3>
                            {message && (
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                    {message}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Item Preview */}
                    {itemPreview && (
                        <div className="p-3 bg-slate-50 rounded-md border border-slate-200 flex items-center gap-3">
                            {itemPreview.avatar && (
                                <img
                                    src={itemPreview.avatar}
                                    alt={itemPreview.title}
                                    className="w-9 h-9 rounded-md object-cover border border-slate-200 flex-shrink-0"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-900 truncate">
                                    {itemPreview.title}
                                </p>
                                {itemPreview.subtitle && (
                                    <p className="text-[11px] text-slate-500 font-medium truncate">
                                        {itemPreview.subtitle}
                                    </p>
                                )}
                            </div>
                            {itemPreview.badge && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white text-slate-700 border border-slate-200 flex-shrink-0">
                                    {itemPreview.badge}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Description Note */}
                    {description && (
                        <div className="p-3 rounded-md bg-amber-50/70 border border-amber-200 text-[11px] text-amber-800 leading-relaxed flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <span>{description}</span>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-200 flex items-center justify-end gap-2.5">
                    <AdminButton
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        {cancelText}
                    </AdminButton>
                    <AdminButton
                        type="button"
                        variant={variant === 'danger' ? 'danger' : 'primary'}
                        onClick={onConfirm}
                        disabled={isLoading}
                        isLoading={isLoading}
                    >
                        {confirmText}
                    </AdminButton>
                </div>
            </div>
        </div>
    );
};

export default AdminConfirmModal;
