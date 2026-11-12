import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import {
    SelectDropdown,
    SelectDropdownMenu,
    type AdminSelectOption,
    type SelectDropdownProps,
    type SelectDropdownMenuProps,
} from './selectDropdown';

export { SelectDropdown, SelectDropdownMenu };
export type { AdminSelectOption, SelectDropdownProps, SelectDropdownMenuProps };

/* Helper to render either a Lucide component or an instantiated React element */
export const renderIconNode = (
    icon?: React.ReactNode | React.ElementType,
    defaultClassName?: string
): React.ReactNode => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (
        typeof icon === 'function' ||
        (typeof icon === 'object' && icon !== null && ('render' in icon || '$$typeof' in icon))
    ) {
        const IconComponent = icon as React.ElementType;
        return <IconComponent className={defaultClassName} />;
    }
    if (typeof icon === 'string' || typeof icon === 'number') {
        return <span>{icon}</span>;
    }
    return null;
};

/* =========================================================================
   1. ADMIN LABEL / TITLE COMPONENT
   ========================================================================= */
export interface AdminLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
    required?: boolean;
    action?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
}

export const AdminLabel: React.FC<AdminLabelProps> = ({
    required,
    action,
    children,
    className = '',
    ...props
}) => {
    if (!children) return null;

    const labelElement = (
        <label
            className={`block text-sm font-medium text-gray-700 ${!action ? 'mb-1.5' : ''} ${className}`}
            {...props}
        >
            {children}
            {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
    );

    if (action) {
        return (
            <div className="flex items-center justify-between mb-1.5">
                {labelElement}
                <div>{action}</div>
            </div>
        );
    }

    return labelElement;
};

/* =========================================================================
   2. ADMIN INPUT COMPONENT
   ========================================================================= */
export interface AdminInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: React.ReactNode;
    required?: boolean;
    action?: React.ReactNode;
    error?: string;
    helperText?: string;
    prefixText?: string;
    suffixText?: string;
    prefixIcon?: React.ReactNode | React.ElementType;
    suffixIcon?: React.ReactNode | React.ElementType;
    icon?: React.ReactNode | React.ElementType;
    containerClassName?: string;
    inputClassName?: string;
}

export const AdminInput = forwardRef<HTMLInputElement, AdminInputProps>(
    (
        {
            label,
            required,
            action,
            error,
            helperText,
            prefixText,
            suffixText,
            prefixIcon,
            suffixIcon,
            icon,
            containerClassName = '',
            inputClassName = '',
            className = '',
            id,
            ...props
        },
        ref
    ) => {
        const inputId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

        const effectivePrefixIcon = icon || prefixIcon;

        const baseInputStyles =
            'w-full px-3 py-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-500';

        const errorStyles = error ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500' : '';

        // If prefix/suffix text or icon exists, wrap in composite input container
        const hasAddon = Boolean(prefixText || suffixText || effectivePrefixIcon || suffixIcon);

        let inputElement: React.ReactNode;

        if (hasAddon) {
            inputElement = (
                <div
                    className={`flex items-center rounded-md border shadow-2xs overflow-hidden transition-all ${
                        error
                            ? 'border-rose-400 focus-within:ring-2 focus-within:ring-rose-500/20 focus-within:border-rose-500'
                            : 'border-gray-200 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600'
                    }`}
                >
                    {prefixText && (
                        <span className="inline-flex items-center px-3.5 py-2 bg-gray-50 text-gray-500 text-xs font-mono border-r border-gray-200 shrink-0">
                            {prefixText}
                        </span>
                    )}
                    {effectivePrefixIcon && (
                        <span className="inline-flex items-center pl-3 text-gray-400 shrink-0">
                            {renderIconNode(effectivePrefixIcon, 'w-4 h-4')}
                        </span>
                    )}
                    <input
                        ref={ref}
                        id={inputId}
                        required={required}
                        className={`w-full px-3 py-2 text-sm text-gray-800 focus:outline-none bg-transparent placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-500 ${inputClassName} ${className}`}
                        {...props}
                    />
                    {suffixIcon && (
                        <span className="inline-flex items-center pr-3 text-gray-400 shrink-0">
                            {renderIconNode(suffixIcon, 'w-4 h-4')}
                        </span>
                    )}
                    {suffixText && (
                        <span className="inline-flex items-center px-3.5 py-2 bg-gray-50 text-gray-500 text-xs font-medium border-l border-gray-200 shrink-0">
                            {suffixText}
                        </span>
                    )}
                </div>
            );
        } else {
            inputElement = (
                <input
                    ref={ref}
                    id={inputId}
                    required={required}
                    className={`${baseInputStyles} ${errorStyles} ${inputClassName} ${className}`}
                    {...props}
                />
            );
        }

        if (label || action || error || helperText) {
            return (
                <div className={containerClassName}>
                    <AdminLabel htmlFor={inputId} required={required} action={action}>
                        {label}
                    </AdminLabel>
                    {inputElement}
                    {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
                    {!error && helperText && <p className="text-xs text-gray-400 mt-1">{helperText}</p>}
                </div>
            );
        }

        return <>{inputElement}</>;
    }
);
AdminInput.displayName = 'AdminInput';

/* =========================================================================
   3. ADMIN SELECT COMPONENT
   ========================================================================= */
export interface AdminSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
    label?: React.ReactNode;
    required?: boolean;
    action?: React.ReactNode;
    error?: string;
    helperText?: string;
    options?: AdminSelectOption[];
    placeholder?: string;
    icon?: React.ReactNode | React.ElementType;
    searchable?: boolean;
    searchPlaceholder?: string;
    clearable?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'filter' | 'compact';
    onValueChange?: (value: string, option?: AdminSelectOption) => void;
    containerClassName?: string;
    selectClassName?: string;
    menuClassName?: string;
    minMenuWidth?: number;
    align?: 'left' | 'right';
}

export const AdminSelect = forwardRef<HTMLSelectElement, AdminSelectProps>(
    (
        {
            label,
            required,
            action,
            error,
            helperText,
            options,
            placeholder,
            icon,
            searchable,
            searchPlaceholder,
            clearable,
            size = 'md',
            variant = 'default',
            onValueChange,
            children,
            containerClassName = '',
            selectClassName = '',
            menuClassName = '',
            minMenuWidth,
            align = 'left',
            className = '',
            id,
            ...props
        },
        ref
    ) => {
        const selectId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

        const selectElement = (
            <SelectDropdown
                ref={ref}
                id={selectId}
                name={props.name}
                value={props.value as string | number | undefined}
                defaultValue={props.defaultValue as string | number | undefined}
                onChange={props.onChange}
                onValueChange={onValueChange}
                options={options}
                placeholder={placeholder}
                icon={icon}
                searchable={searchable}
                searchPlaceholder={searchPlaceholder}
                clearable={clearable}
                disabled={props.disabled}
                required={required}
                error={Boolean(error)}
                size={size}
                variant={variant}
                triggerClassName={`${selectClassName} ${className}`.trim()}
                menuClassName={menuClassName}
                minMenuWidth={minMenuWidth}
                align={align}
            >
                {children}
            </SelectDropdown>
        );

        if (label || action || error || helperText) {
            return (
                <div className={containerClassName}>
                    <AdminLabel htmlFor={selectId} required={required} action={action}>
                        {label}
                    </AdminLabel>
                    {selectElement}
                    {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
                    {!error && helperText && <p className="text-xs text-gray-400 mt-1">{helperText}</p>}
                </div>
            );
        }

        return selectElement;
    }
);
AdminSelect.displayName = 'AdminSelect';

/* =========================================================================
   4. ADMIN TEXTAREA COMPONENT
   ========================================================================= */
export interface AdminTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: React.ReactNode;
    required?: boolean;
    action?: React.ReactNode;
    error?: string;
    helperText?: string;
    containerClassName?: string;
    textareaClassName?: string;
}

export const AdminTextarea = forwardRef<HTMLTextAreaElement, AdminTextareaProps>(
    (
        {
            label,
            required,
            action,
            error,
            helperText,
            containerClassName = '',
            textareaClassName = '',
            className = '',
            id,
            rows = 4,
            ...props
        },
        ref
    ) => {
        const textareaId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

        const baseStyles =
            'w-full px-3 py-2 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-sm text-gray-800 transition-all placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-500';

        const errorStyles = error ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500' : '';

        const textareaElement = (
            <textarea
                ref={ref}
                id={textareaId}
                rows={rows}
                required={required}
                className={`${baseStyles} ${errorStyles} ${textareaClassName} ${className}`}
                {...props}
            />
        );

        if (label || action || error || helperText) {
            return (
                <div className={containerClassName}>
                    <AdminLabel htmlFor={textareaId} required={required} action={action}>
                        {label}
                    </AdminLabel>
                    {textareaElement}
                    {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
                    {!error && helperText && <p className="text-xs text-gray-400 mt-1">{helperText}</p>}
                </div>
            );
        }

        return textareaElement;
    }
);
AdminTextarea.displayName = 'AdminTextarea';

/* =========================================================================
   5. ADMIN BUTTON COMPONENT
   ========================================================================= */
export type AdminButtonVariant = 'primary' | 'secondary' | 'cancel' | 'danger' | 'ghost' | 'outline';
export type AdminButtonSize = 'sm' | 'md' | 'lg';

export interface AdminButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: AdminButtonVariant;
    size?: AdminButtonSize;
    isLoading?: boolean;
    loading?: boolean;
    loadingText?: React.ReactNode;
    icon?: React.ReactNode | React.ElementType;
    iconPosition?: 'left' | 'right';
}

export const AdminButton = forwardRef<HTMLButtonElement, AdminButtonProps>(
    (
        {
            children,
            variant = 'primary',
            size = 'md',
            isLoading = false,
            loading,
            loadingText,
            icon,
            iconPosition = 'left',
            className = '',
            disabled,
            type = 'button',
            ...props
        },
        ref
    ) => {
        const effectiveLoading = isLoading || Boolean(loading);

        // Variant Styles
        let variantClasses = '';
        switch (variant) {
            case 'secondary':
            case 'cancel':
                variantClasses =
                    'border border-[#ababab] text-gray-700 font-medium hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50';
                break;
            case 'danger':
                variantClasses =
                    'bg-rose-600 text-white font-semibold hover:bg-rose-700 active:scale-[0.98] shadow-md shadow-rose-500/20 disabled:opacity-50';
                break;
            case 'ghost':
                variantClasses =
                    'text-blue-600 hover:text-blue-800 font-medium hover:bg-blue-50/50 disabled:opacity-50';
                break;
            case 'outline':
                variantClasses =
                    'border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50';
                break;
            case 'primary':
            default:
                variantClasses =
                    'bg-blue-600 text-white font-semibold hover:bg-blue-700 active:scale-[0.98] shadow-md shadow-blue-500/20 disabled:opacity-50';
                break;
        }

        // Size Styles
        let sizeClasses = '';
        if (variant === 'ghost') {
            sizeClasses = size === 'sm' ? 'text-[11px] px-1.5 py-1 rounded' : 'text-xs px-2 py-1 rounded-md';
        } else {
            switch (size) {
                case 'sm':
                    sizeClasses = 'px-3.5 py-1.5 text-xs rounded-md';
                    break;
                case 'lg':
                    sizeClasses = 'px-7 py-3 text-base rounded-md';
                    break;
                case 'md':
                default:
                    sizeClasses = variant === 'secondary' || variant === 'cancel'
                        ? 'px-5 py-2.5 text-sm rounded-md'
                        : 'px-6 py-2.5 text-sm rounded-md';
                    break;
            }
        }

        const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
        const renderedIcon = renderIconNode(icon, `${iconSize} shrink-0`);

        return (
            <button
                ref={ref}
                type={type}
                disabled={disabled || effectiveLoading}
                className={`inline-flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed ${variantClasses} ${sizeClasses} ${className}`}
                {...props}
            >
                {effectiveLoading ? (
                    <>
                        <Loader2 className={`${iconSize} animate-spin shrink-0`} />
                        <span>{loadingText || 'Đang xử lý...'}</span>
                    </>
                ) : (
                    <>
                        {renderedIcon && iconPosition === 'left' && renderedIcon}
                        {children && <span>{children}</span>}
                        {renderedIcon && iconPosition === 'right' && renderedIcon}
                    </>
                )}
            </button>
        );
    }
);
AdminButton.displayName = 'AdminButton';

/* =========================================================================
   6. ADMIN MODAL FOOTER COMPONENT
   ========================================================================= */
export interface AdminModalFooterProps {
    onCancel?: () => void;
    cancelText?: string;
    onSubmit?: (e?: any) => void;
    submitText?: string;
    submitIcon?: React.ReactNode | React.ElementType;
    isSubmitting?: boolean;
    submittingText?: React.ReactNode;
    isSubmitDisabled?: boolean;
    submitVariant?: 'primary' | 'danger';
    submitType?: 'button' | 'submit';
    children?: React.ReactNode;
    className?: string;
}

export const AdminModalFooter: React.FC<AdminModalFooterProps> = ({
    onCancel,
    cancelText = 'Hủy bỏ',
    onSubmit,
    submitText = 'Lưu thông tin',
    submitIcon,
    isSubmitting = false,
    submittingText,
    isSubmitDisabled = false,
    submitVariant = 'primary',
    submitType = 'button',
    children,
    className = '',
}) => {
    return (
        <div className={`flex items-center justify-end gap-3 w-full ${className}`}>
            {children ? (
                children
            ) : (
                <>
                    {onCancel && (
                        <AdminButton
                            type="button"
                            variant="secondary"
                            disabled={isSubmitting}
                            onClick={onCancel}
                        >
                            {cancelText}
                        </AdminButton>
                    )}
                    {onSubmit && (
                        <AdminButton
                            type={submitType}
                            variant={submitVariant}
                            disabled={isSubmitting || isSubmitDisabled}
                            onClick={onSubmit}
                            isLoading={isSubmitting}
                            loadingText={submittingText}
                            icon={submitIcon}
                        >
                            {submitText}
                        </AdminButton>
                    )}
                </>
            )}
        </div>
    );
};

/* =========================================================================
   7. ADMIN MODAL TITLE / HEADER COMPONENT
   ========================================================================= */
export interface AdminModalHeaderProps {
    title: React.ReactNode;
    subtitle?: string;
    description?: string;
    badge?: React.ReactNode;
    icon?: React.ReactNode | React.ElementType;
    onClose?: () => void;
    className?: string;
}

export const AdminModalHeader: React.FC<AdminModalHeaderProps> = ({
    title,
    subtitle,
    description,
    badge,
    icon: HeaderIcon,
    onClose,
    className = '',
}) => {
    const renderedHeaderIcon = renderIconNode(HeaderIcon, 'w-5 h-5');

    return (
        <div className={`px-6 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between gap-4 shrink-0 ${className}`}>
            <div className="flex items-center gap-3 min-w-0">
                {renderedHeaderIcon && (
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold border border-blue-100/50">
                        {renderedHeaderIcon}
                    </div>
                )}
                <div className="min-w-0">
                    <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2 truncate">
                        {title}
                        {badge}
                    </h2>
                    {(subtitle || description) && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle || description}</p>
                    )}
                </div>
            </div>

            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors shrink-0 cursor-pointer"
                    title="Đóng (Esc)"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
};
