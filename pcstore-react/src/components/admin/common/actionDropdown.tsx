import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, Eye, Edit, Trash2 } from 'lucide-react';
import { renderSelectIcon } from './selectDropdown';

export type ActionItemVariant = 'default' | 'primary' | 'warning' | 'success' | 'danger';

export interface AdminActionItem {
    key?: string;
    label: string;
    description?: string;
    icon?: React.ReactNode | React.ElementType;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    variant?: ActionItemVariant;
    disabled?: boolean;
    hidden?: boolean;
    /** Bắt buộc đưa vào menu 3 chấm dù chưa đủ số icon bên ngoài */
    inMenuOnly?: boolean;
    /** Hiển thị đường kẻ phân cách phía trên mục này trong dropdown */
    dividerBefore?: boolean;
    badge?: React.ReactNode;
}

export interface AdminActionDropdownProps {
    /** Danh sách các thao tác. Mặc định 2 thao tác đầu hiển thị icon, còn lại ẩn trong nút 3 chấm dọc */
    actions?: AdminActionItem[];
    /** Các thao tác bổ sung luôn nằm trong menu 3 chấm dọc */
    moreActions?: AdminActionItem[];
    /** Số lượng icon tối đa hiển thị trực tiếp bên ngoài (mặc định: 2) */
    maxInline?: number;

    // Shorthand callbacks cho các thao tác phổ biến (Xem, Sửa, Xóa)
    onView?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    viewLabel?: string;
    onEdit?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    editLabel?: string;
    onDelete?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    deleteLabel?: string;
    deleteDescription?: string;

    align?: 'left' | 'right';
    minMenuWidth?: number;
    className?: string;
    menuClassName?: string;
}

interface MenuPosition {
    top?: number;
    bottom?: number;
    left: number;
    minWidth: number;
}

const INLINE_VARIANT_CLASSES: Record<ActionItemVariant, string> = {
    primary: 'text-gray-500 hover:text-blue-600 hover:bg-blue-50',
    warning: 'text-gray-500 hover:text-amber-600 hover:bg-amber-50',
    success: 'text-gray-500 hover:text-emerald-600 hover:bg-emerald-50',
    danger: 'text-gray-500 hover:text-rose-600 hover:bg-rose-50',
    default: 'text-gray-500 hover:text-slate-800 hover:bg-slate-100',
};

const MENU_ITEM_VARIANT_CLASSES: Record<
    ActionItemVariant,
    { button: string; icon: string; desc: string }
> = {
    default: {
        button: 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
        icon: 'text-slate-400 group-hover:text-slate-600',
        desc: 'text-slate-400',
    },
    primary: {
        button: 'text-slate-700 hover:bg-blue-50/80 hover:text-blue-700',
        icon: 'text-blue-600',
        desc: 'text-slate-400 group-hover:text-blue-600/80',
    },
    warning: {
        button: 'text-slate-700 hover:bg-amber-50/80 hover:text-amber-700',
        icon: 'text-amber-600',
        desc: 'text-slate-400 group-hover:text-amber-600/80',
    },
    success: {
        button: 'text-slate-700 hover:bg-emerald-50/80 hover:text-emerald-700',
        icon: 'text-emerald-600',
        desc: 'text-slate-400 group-hover:text-emerald-600/80',
    },
    danger: {
        button: 'text-rose-600 hover:bg-rose-50 hover:text-rose-700',
        icon: 'text-rose-500 group-hover:text-rose-600',
        desc: 'text-rose-400/90',
    },
};

/**
 * AdminActionDropdown / TableRowActions:
 * Chỉ hiển thị tối đa `maxInline` (mặc định 2) icon thao tác chính (thường là Xem & Chỉnh sửa),
 * các thao tác còn lại được gom vào nút 3 chấm dọc (`MoreVertical`) và mở ra dưới dạng dropdown.
 */
export const AdminActionDropdown: React.FC<AdminActionDropdownProps> = ({
    actions = [],
    moreActions = [],
    maxInline = 2,
    onView,
    viewLabel = 'Xem chi tiết',
    onEdit,
    editLabel = 'Chỉnh sửa',
    onDelete,
    deleteLabel = 'Xóa',
    deleteDescription,
    align = 'right',
    minMenuWidth = 190,
    className = '',
    menuClassName = '',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState<MenuPosition | null>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Gộp danh sách thao tác từ shorthand props + actions + moreActions
    const allActions = useMemo<AdminActionItem[]>(() => {
        const list: AdminActionItem[] = [];

        if (onView) {
            list.push({
                key: 'shorthand-view',
                label: viewLabel,
                icon: Eye,
                variant: 'primary',
                onClick: onView,
            });
        }

        if (onEdit) {
            list.push({
                key: 'shorthand-edit',
                label: editLabel,
                icon: Edit,
                variant: 'warning',
                onClick: onEdit,
            });
        }

        list.push(...actions.filter((a) => !a.hidden));

        if (moreActions.length > 0) {
            list.push(
                ...moreActions
                    .filter((a) => !a.hidden)
                    .map((a) => ({ ...a, inMenuOnly: true }))
            );
        }

        if (onDelete) {
            list.push({
                key: 'shorthand-delete',
                label: deleteLabel,
                description: deleteDescription,
                icon: Trash2,
                variant: 'danger',
                inMenuOnly: true,
                dividerBefore: true,
                onClick: onDelete,
            });
        }

        return list;
    }, [
        onView,
        viewLabel,
        onEdit,
        editLabel,
        actions,
        moreActions,
        onDelete,
        deleteLabel,
        deleteDescription,
    ]);

    // Tách thành nhóm hiển thị trực tiếp (tối đa maxInline) và nhóm ẩn trong menu 3 chấm dọc
    const { inlineActions, dropdownActions } = useMemo(() => {
        const inline: AdminActionItem[] = [];
        const dropdown: AdminActionItem[] = [];

        allActions.forEach((item) => {
            if (!item.inMenuOnly && inline.length < maxInline) {
                inline.push(item);
            } else {
                dropdown.push(item);
            }
        });

        return { inlineActions: inline, dropdownActions: dropdown };
    }, [allActions, maxInline]);

    const updatePosition = useCallback(() => {
        const triggerEl = triggerRef.current;
        if (!triggerEl) return;

        const rect = triggerEl.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const estimatedHeight = Math.max(dropdownActions.length, 1) * 44 + 16;

        const openUpward = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

        let left = align === 'right' ? rect.right - minMenuWidth : rect.left;
        left = Math.min(Math.max(8, left), Math.max(8, viewportWidth - minMenuWidth - 8));

        if (openUpward) {
            setPosition({
                bottom: viewportHeight - rect.top + 6,
                left,
                minWidth: minMenuWidth,
            });
        } else {
            setPosition({
                top: rect.bottom + 6,
                left,
                minWidth: minMenuWidth,
            });
        }
    }, [align, dropdownActions.length, minMenuWidth]);

    useEffect(() => {
        if (isOpen) {
            updatePosition();
        } else {
            setPosition(null);
        }
    }, [isOpen, updatePosition]);

    // Cập nhật vị trí khi cuộn hoặc thay đổi kích thước màn hình
    useEffect(() => {
        if (!isOpen) return;

        const handleScrollOrResize = () => {
            updatePosition();
        };

        window.addEventListener('resize', handleScrollOrResize);
        window.addEventListener('scroll', handleScrollOrResize, true);
        return () => {
            window.removeEventListener('resize', handleScrollOrResize);
            window.removeEventListener('scroll', handleScrollOrResize, true);
        };
    }, [isOpen, updatePosition]);

    // Đóng khi click ra ngoài
    useEffect(() => {
        if (!isOpen) return;

        const handleMouseDown = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                triggerRef.current &&
                !triggerRef.current.contains(target) &&
                menuRef.current &&
                !menuRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [isOpen]);

    // Đóng khi nhấn phím Escape
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                e.stopImmediatePropagation();
                setIsOpen(false);
                triggerRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown, true);
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [isOpen]);

    return (
        <div
            className={`inline-flex items-center justify-end gap-1 ${className}`}
            onClick={(e) => e.stopPropagation()}
        >
            {/* 1. Các icon thao tác hiển thị trực tiếp (tối đa 2 icon: thường là Xem & Chỉnh sửa) */}
            {inlineActions.map((action, index) => {
                const variant = action.variant || (index === 0 ? 'primary' : 'warning');
                const variantClass = INLINE_VARIANT_CLASSES[variant];

                return (
                    <button
                        key={action.key || `${action.label}-${index}`}
                        type="button"
                        disabled={action.disabled}
                        onClick={(e) => {
                            e.stopPropagation();
                            action.onClick(e);
                        }}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${variantClass}`}
                        title={action.label}
                    >
                        {renderSelectIcon(action.icon, 'w-4 h-4')}
                    </button>
                );
            })}

            {/* 2. Nút 3 chấm dọc (MoreVertical) cho các thao tác còn lại */}
            {dropdownActions.length > 0 && (
                <>
                    <button
                        ref={triggerRef}
                        type="button"
                        aria-haspopup="menu"
                        aria-expanded={isOpen}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsOpen((prev) => !prev);
                        }}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                            isOpen
                                ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-500/15'
                                : 'text-gray-500 hover:text-slate-800 hover:bg-slate-100'
                        }`}
                        title="Thêm thao tác"
                    >
                        <MoreVertical className="w-4 h-4" />
                    </button>

                    {isOpen &&
                        position &&
                        typeof document !== 'undefined' &&
                        createPortal(
                            <div
                                ref={menuRef}
                                data-admin-action-portal="true"
                                role="menu"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    position: 'fixed',
                                    top: position.top,
                                    bottom: position.bottom,
                                    left: position.left,
                                    minWidth: position.minWidth,
                                    zIndex: 9999,
                                }}
                                className={`bg-white border border-slate-200/90 rounded-xl shadow-xl shadow-slate-900/10 ring-1 ring-black/5 p-1.5 animate-in fade-in zoom-in-95 duration-150 ${menuClassName}`}
                            >
                                {dropdownActions.map((item, idx) => {
                                    const variant = item.variant || 'default';
                                    const styleMeta = MENU_ITEM_VARIANT_CLASSES[variant];
                                    const showDivider = item.dividerBefore && idx > 0;

                                    return (
                                        <React.Fragment key={item.key || `${item.label}-${idx}`}>
                                            {showDivider && (
                                                <div className="my-1 border-t border-slate-100" />
                                            )}
                                            <button
                                                type="button"
                                                role="menuitem"
                                                disabled={item.disabled}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!item.disabled) {
                                                        setIsOpen(false);
                                                        item.onClick(e);
                                                    }
                                                }}
                                                className={`group w-full text-left px-3 py-2 rounded-lg flex items-start justify-between gap-2.5 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${styleMeta.button}`}
                                            >
                                                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                                    {item.icon && (
                                                        <span
                                                            className={`shrink-0 mt-0.5 transition-colors ${styleMeta.icon}`}
                                                        >
                                                            {renderSelectIcon(
                                                                item.icon,
                                                                'w-3.5 h-3.5'
                                                            )}
                                                        </span>
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="leading-snug truncate">
                                                            {item.label}
                                                        </div>
                                                        {item.description && (
                                                            <div
                                                                className={`text-[11px] font-normal truncate mt-0.5 ${styleMeta.desc}`}
                                                            >
                                                                {item.description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {item.badge && (
                                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold shrink-0">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </button>
                                        </React.Fragment>
                                    );
                                })}
                            </div>,
                            document.body
                        )}
                </>
            )}
        </div>
    );
};

export const TableRowActions = AdminActionDropdown;
export default AdminActionDropdown;

