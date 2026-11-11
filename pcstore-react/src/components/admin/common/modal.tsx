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
            className={`relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-[80vw] h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${className}`}
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
                <div className="px-6 bg-white shrink-0">
                    <nav className="flex space-x-2 overflow-x-auto pt-2 no-scrollbar" aria-label="Tabs">
                        {tabs.map((tab) => {
                            const isActive = tab.id === currentTabId;

                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => !tab.disabled && handleTabClick(tab.id)}
                                    disabled={tab.disabled}
                                    className={`relative flex items-center gap-2 px-3 py-2 text font-semibold transition-all cursor-pointer ${isActive
                                            ? `bg-white text-blue-600 border-b-2 border-b-blue-600 z-10
                                                before:content-[''] before:absolute before:bottom-0 before:-left-3 before:w-3 before:h-3 before:bg-[radial-gradient(circle_at_top_left,transparent_12px,#ffffff_12px)]
                                                after:content-[''] after:absolute after:bottom-0 after:-right-3 after:w-3 after:h-3 after:bg-[radial-gradient(circle_at_top_right,transparent_12px,#ffffff_12px)]`
                                            : tab.disabled
                                                ? 'text-gray-300 cursor-not-allowed'
                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-t-lg'
                                        }`}
                                >
                                    {tab.icon && renderIconNode(tab.icon, `w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`)}
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
                <div className="px-6 py-4 bg-gray-50/70 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3 ml-auto">
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
