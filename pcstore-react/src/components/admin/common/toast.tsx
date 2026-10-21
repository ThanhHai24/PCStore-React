import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Info,
    X,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
    id: string;
    type: ToastType;
    title?: string;
    message: React.ReactNode;
    duration?: number; // ms, default 4000. 0 means persistent
    action?: {
        label: string;
        onClick: () => void;
    };
}

export interface ToastContextType {
    toasts: ToastItem[];
    addToast: (toast: Omit<ToastItem, 'id'>) => string;
    removeToast: (id: string) => void;
    clearAllToasts: () => void;
    showToast: (message: React.ReactNode, type?: ToastType) => string;
    toast: {
        success: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) => string;
        error: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) => string;
        warning: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) => string;
        info: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) => string;
    };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Standalone toast helper for quick triggers outside React component trees if needed
let globalAddToast: ((toast: Omit<ToastItem, 'id'>) => string) | null = null;

export const globalToast = {
    success: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
        globalAddToast?.({ type: 'success', message, title, ...options }),
    error: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
        globalAddToast?.({ type: 'error', message, title, ...options }),
    warning: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
        globalAddToast?.({ type: 'warning', message, title, ...options }),
    info: (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
        globalAddToast?.({ type: 'info', message, title, ...options }),
};

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a <ToastProvider>');
    }
    return context;
};

interface ToastItemProps {
    toast: ToastItem;
    onClose: (id: string) => void;
}

const TOAST_ICONS = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
};

const TOAST_THEMES = {
    success: {
        wrapper: 'border-emerald-200/90 bg-white/95 text-gray-800 shadow-emerald-500/10',
        gradient: 'from-emerald-50/70 to-white',
        iconBg: 'bg-emerald-100 text-emerald-600',
        progressBar: 'bg-emerald-500',
        titleColor: 'text-emerald-950',
    },
    error: {
        wrapper: 'border-rose-200/90 bg-white/95 text-gray-800 shadow-rose-500/10',
        gradient: 'from-rose-50/70 to-white',
        iconBg: 'bg-rose-100 text-rose-600',
        progressBar: 'bg-rose-500',
        titleColor: 'text-rose-950',
    },
    warning: {
        wrapper: 'border-amber-200/90 bg-white/95 text-gray-800 shadow-amber-500/10',
        gradient: 'from-amber-50/70 to-white',
        iconBg: 'bg-amber-100 text-amber-600',
        progressBar: 'bg-amber-500',
        titleColor: 'text-amber-950',
    },
    info: {
        wrapper: 'border-blue-200/90 bg-white/95 text-gray-800 shadow-blue-500/10',
        gradient: 'from-blue-50/70 to-white',
        iconBg: 'bg-blue-100 text-blue-600',
        progressBar: 'bg-blue-500',
        titleColor: 'text-blue-950',
    },
};

export const AdminToastCard: React.FC<ToastItemProps> = ({ toast, onClose }) => {
    const duration = toast.duration ?? 4000;
    const [progress, setProgress] = useState(100);
    const [isHovered, setIsHovered] = useState(false);
    const startTimeRef = useRef<number>(Date.now());
    const remainingTimeRef = useRef<number>(duration);

    const theme = TOAST_THEMES[toast.type];
    const IconComp = TOAST_ICONS[toast.type];

    useEffect(() => {
        if (duration <= 0) return;

        let animationFrameId: number;

        const updateTimer = () => {
            if (!isHovered) {
                const elapsed = Date.now() - startTimeRef.current;
                const newRemaining = Math.max(0, remainingTimeRef.current - elapsed);
                const percent = (newRemaining / duration) * 100;
                setProgress(percent);

                if (newRemaining <= 0) {
                    onClose(toast.id);
                    return;
                }
            }
            animationFrameId = requestAnimationFrame(updateTimer);
        };

        startTimeRef.current = Date.now();
        animationFrameId = requestAnimationFrame(updateTimer);

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [duration, isHovered, onClose, toast.id]);

    const handleMouseEnter = () => {
        if (duration <= 0) return;
        setIsHovered(true);
        const elapsed = Date.now() - startTimeRef.current;
        remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    };

    const handleMouseLeave = () => {
        if (duration <= 0) return;
        startTimeRef.current = Date.now();
        setIsHovered(false);
    };

    return (
        <div
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`pointer-events-auto relative overflow-hidden w-full max-w-sm sm:max-w-md rounded-2xl border bg-gradient-to-r p-4 shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-bottom-2 ${theme.wrapper} ${theme.gradient}`}
            role="alert"
        >
            <div className="flex items-start gap-3.5">
                {/* Status Icon */}
                <div
                    className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${theme.iconBg}`}
                >
                    <IconComp className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                    {toast.title && (
                        <h4 className={`text-xs font-bold leading-snug tracking-tight mb-0.5 ${theme.titleColor}`}>
                            {toast.title}
                        </h4>
                    )}
                    <div className="text-xs text-gray-600 leading-relaxed font-medium break-words">
                        {toast.message}
                    </div>

                    {toast.action && (
                        <div className="mt-2.5">
                            <button
                                type="button"
                                onClick={() => {
                                    toast.action?.onClick();
                                    onClose(toast.id);
                                }}
                                className="text-xs font-bold text-blue-600 hover:text-blue-700 underline underline-offset-2 transition-colors"
                            >
                                {toast.action.label}
                            </button>
                        </div>
                    )}
                </div>

                {/* Close Button */}
                <button
                    type="button"
                    onClick={() => onClose(toast.id)}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Đóng thông báo"
                    aria-label="Đóng thông báo"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Progress Countdown Bar */}
            {duration > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100/60 overflow-hidden">
                    <div
                        className={`h-full transition-all duration-75 ease-linear ${theme.progressBar}`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}
        </div>
    );
};

export interface ToastContainerProps {
    toasts: ToastItem[];
    onClose: (id: string) => void;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const POSITION_CLASSES = {
    'bottom-right': 'bottom-5 right-5 flex-col',
    'bottom-left': 'bottom-5 left-5 flex-col',
    'top-right': 'top-5 right-5 flex-col-reverse',
    'top-left': 'top-5 left-5 flex-col-reverse',
};

export const AdminToastContainer: React.FC<ToastContainerProps> = ({
    toasts,
    onClose,
    position = 'bottom-right',
}) => {
    if (toasts.length === 0) return null;

    return (
        <aside
            aria-label="Thông báo hệ thống"
            className={`fixed z-[9999] pointer-events-none flex gap-2.5 max-w-sm sm:max-w-md w-full px-4 sm:px-0 transition-all ${POSITION_CLASSES[position]}`}
        >
            {toasts.map((item) => (
                <AdminToastCard key={item.id} toast={item} onClose={onClose} />
            ))}
        </aside>
    );
};

export interface ToastProviderProps {
    children: React.ReactNode;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
    defaultDuration?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
    children,
    position = 'bottom-right',
    defaultDuration = 4000,
}) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
    }, []);

    const clearAllToasts = useCallback(() => {
        setToasts([]);
    }, []);

    const addToast = useCallback(
        (toast: Omit<ToastItem, 'id'>): string => {
            const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            const newToast: ToastItem = {
                id,
                duration: toast.duration ?? defaultDuration,
                ...toast,
            };
            setToasts((prev) => [...prev, newToast]);
            return id;
        },
        [defaultDuration]
    );

    // Bind to global toast helper for utility use
    useEffect(() => {
        globalAddToast = addToast;
        return () => {
            globalAddToast = null;
        };
    }, [addToast]);

    const successToast = useCallback(
        (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
            addToast({ type: 'success', message, title, ...options }),
        [addToast]
    );

    const errorToast = useCallback(
        (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
            addToast({ type: 'error', message, title, ...options }),
        [addToast]
    );

    const warningToast = useCallback(
        (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
            addToast({ type: 'warning', message, title, ...options }),
        [addToast]
    );

    const infoToast = useCallback(
        (message: React.ReactNode, title?: string, options?: Partial<ToastItem>) =>
            addToast({ type: 'info', message, title, ...options }),
        [addToast]
    );

    const toast = useMemo(
        () => ({
            success: successToast,
            error: errorToast,
            warning: warningToast,
            info: infoToast,
        }),
        [successToast, errorToast, warningToast, infoToast]
    );

    const showToast = useCallback(
        (message: React.ReactNode, type: ToastType = 'info'): string => {
            return addToast({ type, message });
        },
        [addToast]
    );

    const contextValue = useMemo(
        () => ({
            toasts,
            addToast,
            removeToast,
            clearAllToasts,
            showToast,
            toast,
        }),
        [toasts, addToast, removeToast, clearAllToasts, showToast, toast]
    );

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            <AdminToastContainer toasts={toasts} onClose={removeToast} position={position} />
        </ToastContext.Provider>
    );
};
