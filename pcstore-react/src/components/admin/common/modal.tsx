import React, { useState, useEffect } from 'react';
import { X, Loader2, Save } from 'lucide-react';

export interface ModalTab {
    id: string;
    label: string;
    icon?: React.ElementType;
    badge?: string | number;
    description?: string;
    content?: React.ReactNode;
    disabled?: boolean;
}

export interface AdminModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    subtitle?: string;
    description?: string;
    icon?: React.ElementType;

    // Tabs configuration
    tabs?: ModalTab[];
    activeTab?: string;
    onTabChange?: (tabId: string) => void;
    defaultTab?: string;

    // Content & Body
    children?: React.ReactNode | ((activeTabId: string) => React.ReactNode);
    className?: string;
    bodyClassName?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';

    // Form & Footer
    onSubmit?: (e: React.FormEvent) => void;
    footer?: React.ReactNode;
    showFooter?: boolean;
    submitText?: string;
    cancelText?: string;
    isSubmitting?: boolean;
    isSubmitDisabled?: boolean;
    submitIcon?: React.ElementType;

    // Navigation between tabs helper
    showTabNavigation?: boolean;

    // Behavior
    closeOnBackdropClick?: boolean;
    closeOnEsc?: boolean;
}

const SIZE_CLASSES = {
    sm: 'max-w-[80%] h-[80%] overflow-y-auto',
    md: 'max-w-[80%] h-[80%] overflow-y-auto',
    lg: 'max-w-[80%] h-[80%] overflow-y-auto',
    xl: 'max-w-[80%] h-[80%] overflow-y-auto',
    '2xl': 'max-w-[80%] h-[80%] overflow-y-auto',
};

export const AdminModal: React.FC<AdminModalProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    description,
    icon: HeaderIcon,
    tabs = [],
    activeTab: controlledActiveTab,
    onTabChange,
    defaultTab,
    children,
    className = '',
    bodyClassName = '',
    size = 'lg',
    onSubmit,
    footer,
    showFooter = true,
    submitText = 'Lưu thông tin',
    cancelText = 'Hủy',
    isSubmitting = false,
    isSubmitDisabled = false,
    submitIcon: SubmitIcon = Save,
    showTabNavigation = true,
    closeOnBackdropClick = true,
    closeOnEsc = true,
}) => {
    // Internal active tab state if not controlled
    const firstTabId = tabs[0]?.id || '';
    const [internalActiveTab, setInternalActiveTab] = useState<string>(
        defaultTab || firstTabId
    );

    const currentTabId = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

    // Sync tab when opened or tabs change
    useEffect(() => {
        if (isOpen) {
            if (defaultTab) {
                setInternalActiveTab(defaultTab);
            } else if (firstTabId && (!currentTabId || !tabs.some((t) => t.id === currentTabId))) {
                setInternalActiveTab(firstTabId);
            }
        }
    }, [isOpen, defaultTab, firstTabId]);

    // Handle ESC key press
    useEffect(() => {
        if (!isOpen || !closeOnEsc) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeOnEsc, onClose]);

    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleTabClick = (tabId: string) => {
        if (onTabChange) {
            onTabChange(tabId);
        } else {
            setInternalActiveTab(tabId);
        }
    };

    // Tab navigation indices
    const currentTabIndex = tabs.findIndex((t) => t.id === currentTabId);
    const isFirstTab = currentTabIndex <= 0;
    const isLastTab = currentTabIndex >= tabs.length - 1;

    const handlePrevTab = () => {
        if (!isFirstTab) {
            handleTabClick(tabs[currentTabIndex - 1].id);
        }
    };
    // Determine current tab content if defined inside tab object
    const activeTabObj = tabs.find((t) => t.id === currentTabId);

    const renderBodyContent = () => {
        if (activeTabObj?.content) {
            return activeTabObj.content;
        }
        if (typeof children === 'function') {
            return children(currentTabId);
        }
        return children;
    };

    const modalContent = (
        <div
            className={`relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${SIZE_CLASSES[size]} ${className}`}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Modal Header */}
            <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between gap-4 flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                    {HeaderIcon && (
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold border border-blue-100/50">
                            <HeaderIcon className="w-5 h-5" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <h2 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2 truncate">
                            {title}
                        </h2>
                        {(subtitle || description) && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle || description}</p>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0"
                    title="Đóng (Esc)"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Horizontal Tabs Row (if tabs provided) */}
            {tabs.length > 0 && (
                <div className="px-6  bg-gray-100 flex-shrink-0">
                    <nav className="flex space-x-2 overflow-x-auto pt-2 no-scrollbar" aria-label="Tabs">
                        {tabs.map((tab) => {
                            const isActive = tab.id === currentTabId;
                            const TabIcon = tab.icon;

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => !tab.disabled && handleTabClick(tab.id)}
                                    disabled={tab.disabled}
                                    className={`relative flex items-center gap-2 px-3.5 py-2 text-xs font-semibold transition-all whitespace-nowrap rounded-t-lg border-t-1 border-x-1 border-gray-300/50 ${isActive
                                        ? `bg-white text-black border-none z-10
                                                before:content-[''] before:absolute before:bottom-0 before:-left-3 before:w-3 before:h-3 before:bg-[radial-gradient(circle_at_top_left,transparent_12px,#ffffff_12px)]
                                                after:content-[''] after:absolute after:bottom-0 after:-right-3 after:w-3 after:h-3 after:bg-[radial-gradient(circle_at_top_right,transparent_12px,#ffffff_12px)]`
                                        : tab.disabled
                                            ? 'text-gray-300 cursor-not-allowed'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                        }`}
                                >
                                    {TabIcon && (
                                        <TabIcon
                                            className={`w-3.5 h-3.5 ${isActive ? 'text-black' : 'text-gray-400'}`}
                                        />
                                    )}
                                    <span>{tab.label}</span>
                                    {tab.badge !== undefined && (
                                        <span
                                            className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive
                                                ? 'bg-blue-700 text-blue-100'
                                                : 'bg-gray-200 text-gray-600'
                                                }`}
                                        >
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            )}

            {/* Modal Body */}
            <div className={`p-6 overflow-y-auto flex-1 ${bodyClassName}`}>
                {renderBodyContent()}
            </div>

            {/* Modal Footer */}
            {showFooter && (
                <div className="px-6 py-4 bg-gray-50/70 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
                    {/* Left: Tab step indicators / Previous button */}
                    <div>
                        {tabs.length > 1 && showTabNavigation && !isFirstTab && (
                            <button
                                type="button"
                                onClick={handlePrevTab}
                                className="px-3.5 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors shadow-sm"
                            >
                                ← Quay lại ({tabs[currentTabIndex - 1].label})
                            </button>
                        )}
                    </div>

                    {/* Right: Custom footer or default action buttons */}
                    <div className="flex items-center gap-2 ml-auto">
                        {footer ? (
                            footer
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    {cancelText}
                                </button>

                                {onSubmit && (
                                    <button
                                        type="submit"
                                        disabled={isSubmitting || isSubmitDisabled}
                                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition-all shadow-blue-500/20"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                <span>Đang xử lý...</span>
                                            </>
                                        ) : (
                                            <>
                                                <SubmitIcon className="w-3.5 h-3.5" />
                                                <span>{submitText}</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={closeOnBackdropClick ? onClose : undefined}
            role="dialog"
            aria-modal="true"
        >
            {onSubmit ? (
                <form onSubmit={onSubmit} className="contents">
                    {modalContent}
                </form>
            ) : (
                modalContent
            )}
        </div>
    );
};

export default AdminModal;
