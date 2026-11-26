import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import {
    AdminButton,
    AdminModalHeader,
    AdminModalFooter,
    AdminLabel,
    AdminInput,
    AdminSelect,
    AdminTextarea,
    SelectDropdown,
    SelectDropdownMenu,
    renderIconNode,
} from './formElements';

// Re-export form & button components for convenience
export {
    AdminButton,
    AdminModalHeader,
    AdminModalFooter,
    AdminLabel,
    AdminInput,
    AdminSelect,
    AdminTextarea,
    SelectDropdown,
    SelectDropdownMenu,
    renderIconNode,
};
export type {
    AdminButtonProps,
    AdminButtonVariant,
    AdminButtonSize,
    AdminModalHeaderProps,
    AdminModalFooterProps,
    AdminLabelProps,
    AdminInputProps,
    AdminSelectProps,
    AdminSelectOption,
    SelectDropdownProps,
    SelectDropdownMenuProps,
    AdminTextareaProps,
} from './formElements';

export interface ModalTab {
    id: string;
    label: string;
    icon?: React.ReactNode | React.ElementType;
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
    icon?: React.ReactNode | React.ElementType;

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
    submitIcon?: React.ReactNode | React.ElementType;

    // Navigation between tabs helper
    showTabNavigation?: boolean;

    // Behavior
    closeOnBackdropClick?: boolean;
    closeOnEsc?: boolean;
}

const SIZE_CLASSES = {
    sm: 'w-[80vw] h-[80vh]',
    md: 'w-[80vw] h-[80vh]',
    lg: 'w-[80vw] h-[80vh]',
    xl: 'w-[80vw] h-[80vh]',
    '2xl': 'w-[80vw] h-[80vh]',
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
    cancelText = 'Hủy bỏ',
    isSubmitting = false,
    isSubmitDisabled = false,
    submitIcon: SubmitIcon = Save,
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
            className={`relative bg-white rounded-md shadow-lg border border-slate-200 w-[80vw] h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${className}`}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Modal Header */}
            <AdminModalHeader
                title={title}
                subtitle={subtitle}
                description={description}
                icon={HeaderIcon}
                onClose={onClose}
            />

            {/* Horizontal Tabs Row (if tabs provided) */}
            {tabs.length > 0 && (
                <div className="px-6 bg-white border-b border-slate-200 shrink-0">
                    <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar -mb-px" aria-label="Tabs">
                        {tabs.map((tab) => {
                            const isActive = tab.id === currentTabId;

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => !tab.disabled && handleTabClick(tab.id)}
                                    disabled={tab.disabled}
                                    className={`relative inline-flex items-center gap-2 px-3 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 ${isActive
                                            ? 'text-blue-600 border-blue-600'
                                            : tab.disabled
                                                ? 'text-slate-300 border-transparent cursor-not-allowed'
                                                : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
                                        }`}
                                >
                                    {tab.icon && renderIconNode(tab.icon, `w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`)}
                                    <span>{tab.label}</span>
                                    {tab.badge !== undefined && (
                                        <span
                                            className={`px-1.5 py-0.5 rounded-md text-[10px] font-semibold tabular-nums ${isActive
                                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                                    : 'bg-slate-100 text-slate-600'
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
            <div className={`p-5 sm:p-6 overflow-y-auto flex-1 ${bodyClassName}`}>
                {renderBodyContent()}
            </div>

            {/* Modal Footer */}
            {showFooter && (
                <div className="px-6 py-3.5 bg-slate-50/70 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5 shrink-0">
                    <div className="flex items-center justify-end gap-3 w-full">
                        {footer ? (
                            footer
                        ) : (
                            <>
                                <AdminButton
                                    type="button"
                                    variant="secondary"
                                    onClick={onClose}
                                    disabled={isSubmitting}
                                >
                                    {cancelText}
                                </AdminButton>

                                {onSubmit && (
                                    <AdminButton
                                        type="submit"
                                        variant="primary"
                                        disabled={isSubmitting || isSubmitDisabled}
                                        isLoading={isSubmitting}
                                        icon={SubmitIcon}
                                    >
                                        {submitText}
                                    </AdminButton>
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
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden"
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
