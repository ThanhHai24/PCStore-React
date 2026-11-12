import React, {
    useState,
    useRef,
    useEffect,
    useMemo,
    useCallback,
    forwardRef,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X, Inbox } from 'lucide-react';

/* Helper to render either a Lucide component or an instantiated React element */
export const renderSelectIcon = (
    icon?: React.ReactNode | React.ElementType,
    defaultClassName = 'w-4 h-4'
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
   TYPES & INTERFACES
   ========================================================================= */
export interface AdminSelectOption {
    label: string;
    value: string | number;
    description?: string;
    icon?: React.ReactNode | React.ElementType;
    badge?: React.ReactNode;
    dotColor?: string;
    disabled?: boolean;
    group?: string;
}

export interface SelectDropdownPosition {
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
    placement: 'top' | 'bottom';
}

export interface SelectDropdownMenuProps {
    isOpen: boolean;
    options: AdminSelectOption[];
    selectedValue: string | number | undefined;
    onSelect: (option: AdminSelectOption) => void;
    onClose: () => void;
    triggerRef: React.RefObject<HTMLElement | null>;
    searchable?: boolean;
    searchPlaceholder?: string;
    emptyText?: string;
    size?: 'sm' | 'md' | 'lg';
    minMenuWidth?: number;
    align?: 'left' | 'right';
    menuClassName?: string;
    highlightedIndex?: number;
    setHighlightedIndex?: React.Dispatch<React.SetStateAction<number>>;
}

/**
 * Helper: Extract plain text from ReactNode (used when parsing <option> children)
 */
function extractTextFromNode(node: React.ReactNode): string {
    if (node === null || node === undefined || typeof node === 'boolean') return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(extractTextFromNode).join('');
    if (React.isValidElement(node)) {
        return extractTextFromNode((node.props as { children?: React.ReactNode })?.children);
    }
    return '';
}

/**
 * Helper: Parse <option> and <optgroup> children into AdminSelectOption[]
 */
export function parseOptionsFromChildren(
    children: React.ReactNode,
    groupName?: string
): AdminSelectOption[] {
    const result: AdminSelectOption[] = [];

    React.Children.forEach(children, (child) => {
        if (!React.isValidElement(child)) return;

        const elementType = child.type;
        const props = child.props as Record<string, any>;

        if (elementType === React.Fragment) {
            result.push(...parseOptionsFromChildren(props.children, groupName));
        } else if (elementType === 'optgroup') {
            const grp = String(props.label || '');
            result.push(...parseOptionsFromChildren(props.children, grp));
        } else if (elementType === 'option') {
            const rawVal = props.value !== undefined ? props.value : extractTextFromNode(props.children);
            const labelText = extractTextFromNode(props.children).trim() || String(rawVal);
            result.push({
                label: labelText,
                value: rawVal,
                disabled: Boolean(props.disabled),
                group: groupName,
                description: props['data-description'],
                dotColor: props['data-dot-color'],
                badge: props['data-badge'],
            });
        }
    });

    return result;
}

/* =========================================================================
   1. SELECT DROPDOWN MENU COMPONENT (Floating Popover Panel for Select)
   ========================================================================= */
export const SelectDropdownMenu: React.FC<SelectDropdownMenuProps> = ({
    isOpen,
    options,
    selectedValue,
    onSelect,
    onClose,
    triggerRef,
    searchable = false,
    searchPlaceholder = 'Tìm kiếm lựa chọn...',
    emptyText = 'Không tìm thấy lựa chọn phù hợp',
    size = 'md',
    minMenuWidth = 180,
    align = 'left',
    menuClassName = '',
    highlightedIndex: externalHighlightedIndex,
    setHighlightedIndex: externalSetHighlightedIndex,
}) => {
    const menuRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [internalHighlight, setInternalHighlight] = useState<number>(-1);
    const [position, setPosition] = useState<SelectDropdownPosition | null>(null);

    const highlightedIndex =
        externalHighlightedIndex !== undefined ? externalHighlightedIndex : internalHighlight;
    const setHighlightedIndex = externalSetHighlightedIndex || setInternalHighlight;

    const filteredOptions = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return options;
        return options.filter(
            (opt) =>
                opt.label.toLowerCase().includes(q) ||
                (opt.description && opt.description.toLowerCase().includes(q)) ||
                String(opt.value).toLowerCase().includes(q)
        );
    }, [options, searchQuery]);

    // Calculate floating position relative to trigger element
    const updatePosition = useCallback(() => {
        const triggerEl = triggerRef.current;
        if (!triggerEl) return;

        const rect = triggerEl.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;

        const estimatedMenuHeight = Math.min(
            Math.max(options.length, 1) * 40 + (searchable ? 52 : 12),
            280
        );

        const placement: 'top' | 'bottom' =
            spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow ? 'top' : 'bottom';

        const width = Math.max(rect.width, minMenuWidth);
        let left = align === 'right' ? rect.right - width : rect.left;
        left = Math.min(Math.max(8, left), Math.max(8, viewportWidth - width - 8));

        if (placement === 'bottom') {
            setPosition({
                top: rect.bottom + 6,
                left,
                width,
                maxHeight: Math.min(280, Math.max(130, spaceBelow - 16)),
                placement: 'bottom',
            });
        } else {
            setPosition({
                bottom: viewportHeight - rect.top + 6,
                left,
                width,
                maxHeight: Math.min(280, Math.max(130, spaceAbove - 16)),
                placement: 'top',
            });
        }
    }, [triggerRef, options.length, searchable, minMenuWidth, align]);

    // Reset search and set initial highlight on open
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            updatePosition();
            const currentIdx = options.findIndex(
                (o) => String(o.value) === String(selectedValue ?? '') && !o.disabled
            );
            setHighlightedIndex(currentIdx >= 0 ? currentIdx : 0);

            if (searchable) {
                requestAnimationFrame(() => {
                    searchInputRef.current?.focus();
                });
            }
        } else {
            setPosition(null);
        }
    }, [isOpen, options, selectedValue, searchable, updatePosition, setHighlightedIndex]);

    // Update position on window scroll or resize
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

    // Handle click outside trigger & menu
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
                onClose();
            }
        };

        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [isOpen, onClose, triggerRef]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (!isOpen || highlightedIndex < 0 || !listRef.current) return;
        const itemEl = listRef.current.querySelector(
            `[data-option-index="${highlightedIndex}"]`
        ) as HTMLElement | null;
        if (itemEl) {
            itemEl.scrollIntoView({ block: 'nearest' });
        }
    }, [isOpen, highlightedIndex]);

    if (!isOpen || !position || typeof document === 'undefined') return null;

    const itemTextClass =
        size === 'sm' ? 'text-xs py-1.5 px-2.5' : size === 'lg' ? 'text-sm py-2.5 px-3.5' : 'text-xs py-2 px-3';

    const menuNode = (
        <div
            ref={menuRef}
            data-admin-select-portal="true"
            onClick={(e) => e.stopPropagation()}
            style={{
                position: 'fixed',
                top: position.top,
                bottom: position.bottom,
                left: position.left,
                width: position.width,
                zIndex: 9999,
            }}
            className={`bg-white border border-slate-200/90 rounded-xl shadow-xl shadow-slate-900/10 ring-1 ring-black/5 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 ${menuClassName}`}
            role="listbox"
        >
            {/* Optional Search Input inside Dropdown */}
            {searchable && (
                <div className="p-2 border-b border-slate-100 bg-slate-50/60 shrink-0">
                    <div className="relative flex items-center">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setHighlightedIndex(0);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setHighlightedIndex((prev) =>
                                        filteredOptions.length > 0
                                            ? (prev + 1) % filteredOptions.length
                                            : -1
                                    );
                                } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setHighlightedIndex((prev) =>
                                        filteredOptions.length > 0
                                            ? (prev - 1 + filteredOptions.length) %
                                              filteredOptions.length
                                            : -1
                                    );
                                } else if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const opt = filteredOptions[highlightedIndex];
                                    if (opt && !opt.disabled) {
                                        onSelect(opt);
                                    }
                                } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onClose();
                                }
                            }}
                            placeholder={searchPlaceholder}
                            className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-all"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery('');
                                    searchInputRef.current?.focus();
                                }}
                                className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Options List */}
            <div
                ref={listRef}
                style={{
                    maxHeight: searchable ? Math.max(90, position.maxHeight - 48) : position.maxHeight,
                }}
                className="overflow-y-auto p-1.5 space-y-0.5 divide-y divide-transparent"
            >
                {filteredOptions.length === 0 ? (
                    <div className="py-6 px-3 text-center flex flex-col items-center justify-center gap-1.5 text-slate-400">
                        <Inbox className="w-5 h-5 text-slate-300" />
                        <span className="text-xs font-medium">{emptyText}</span>
                    </div>
                ) : (
                    filteredOptions.map((opt, idx) => {
                        const isSelected = String(opt.value) === String(selectedValue ?? '');
                        const isHighlighted = idx === highlightedIndex;
                        const prevGroup = idx > 0 ? filteredOptions[idx - 1].group : undefined;
                        const showGroupHeader = opt.group && opt.group !== prevGroup;

                        return (
                            <React.Fragment key={`${opt.value}-${idx}`}>
                                {showGroupHeader && (
                                    <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                                        {opt.group}
                                    </div>
                                )}
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    disabled={opt.disabled}
                                    data-option-index={idx}
                                    onMouseEnter={() => !opt.disabled && setHighlightedIndex(idx)}
                                    onClick={() => {
                                        if (!opt.disabled) {
                                            onSelect(opt);
                                        }
                                    }}
                                    className={`w-full text-left rounded-lg flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${itemTextClass} ${
                                        opt.disabled
                                            ? 'opacity-45 cursor-not-allowed text-slate-400'
                                            : isSelected
                                              ? 'bg-blue-50/90 text-blue-700 font-semibold'
                                              : isHighlighted
                                                ? 'bg-slate-100/90 text-slate-900 font-medium'
                                                : 'text-slate-700 font-medium hover:bg-slate-50'
                                    }`}
                                >
                                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                        {opt.dotColor && (
                                            <span
                                                className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${opt.dotColor}`}
                                            />
                                        )}
                                        {opt.icon && (
                                            <span
                                                className={`shrink-0 mt-0.5 ${
                                                    isSelected ? 'text-blue-600' : 'text-slate-400'
                                                }`}
                                            >
                                                {renderSelectIcon(opt.icon, 'w-3.5 h-3.5')}
                                            </span>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate leading-snug">{opt.label}</div>
                                            {opt.description && (
                                                <div
                                                    className={`text-[11px] truncate mt-0.5 font-normal ${
                                                        isSelected
                                                            ? 'text-blue-600/80'
                                                            : 'text-slate-400'
                                                    }`}
                                                >
                                                    {opt.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {opt.badge && (
                                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                                                {opt.badge}
                                            </span>
                                        )}
                                        {isSelected && (
                                            <Check className="w-3.5 h-3.5 text-blue-600 stroke-[2.5] shrink-0" />
                                        )}
                                    </div>
                                </button>
                            </React.Fragment>
                        );
                    })
                )}
            </div>
        </div>
    );

    return createPortal(menuNode, document.body);
};

/* =========================================================================
   2. SELECT DROPDOWN TRIGGER + MENU (Standalone Reusable Dropdown Select)
   ========================================================================= */
export interface SelectDropdownProps {
    options?: AdminSelectOption[];
    children?: React.ReactNode;
    value?: string | number;
    defaultValue?: string | number;
    onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onValueChange?: (value: string, option?: AdminSelectOption) => void;
    placeholder?: string;
    labelPrefix?: string;
    icon?: React.ReactNode | React.ElementType;
    searchable?: boolean;
    searchPlaceholder?: string;
    clearable?: boolean;
    disabled?: boolean;
    required?: boolean;
    error?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'filter' | 'compact';
    name?: string;
    id?: string;
    ariaLabel?: string;
    className?: string;
    triggerClassName?: string;
    menuClassName?: string;
    minMenuWidth?: number;
    align?: 'left' | 'right';
    emptyText?: string;
}

export const SelectDropdown = forwardRef<HTMLSelectElement, SelectDropdownProps>(
    (
        {
            options: propOptions,
            children,
            value: controlledValue,
            defaultValue,
            onChange,
            onValueChange,
            placeholder = 'Chọn một mục...',
            labelPrefix,
            icon,
            searchable,
            searchPlaceholder,
            clearable = false,
            disabled = false,
            required = false,
            error = false,
            size = 'md',
            variant = 'default',
            name,
            id,
            ariaLabel,
            className = '',
            triggerClassName = '',
            menuClassName = '',
            minMenuWidth,
            align = 'left',
            emptyText,
        },
        ref
    ) => {
        const [isOpen, setIsOpen] = useState(false);
        const [internalValue, setInternalValue] = useState<string | number>(
            defaultValue !== undefined ? defaultValue : ''
        );
        const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
        const triggerRef = useRef<HTMLButtonElement>(null);

        // Parse options from either `options` prop or `<option>` children
        const parsedOptions = useMemo<AdminSelectOption[]>(() => {
            if (propOptions && propOptions.length > 0) {
                return propOptions;
            }
            return parseOptionsFromChildren(children);
        }, [propOptions, children]);

        const currentValue =
            controlledValue !== undefined
                ? controlledValue
                : internalValue !== ''
                  ? internalValue
                  : parsedOptions[0]?.value ?? '';

        const selectedOption = useMemo(
            () => parsedOptions.find((opt) => String(opt.value) === String(currentValue ?? '')),
            [parsedOptions, currentValue]
        );

        const isSearchable =
            searchable !== undefined ? searchable : parsedOptions.length >= 8;

        const fireChange = useCallback(
            (newVal: string | number, opt?: AdminSelectOption) => {
                if (controlledValue === undefined) {
                    setInternalValue(newVal);
                }

                const strVal = String(newVal);
                onValueChange?.(strVal, opt);

                if (onChange) {
                    const syntheticEvent = {
                        target: { value: strVal, name: name || '' },
                        currentTarget: { value: strVal, name: name || '' },
                        preventDefault: () => {},
                        stopPropagation: () => {},
                    } as unknown as React.ChangeEvent<HTMLSelectElement>;
                    onChange(syntheticEvent);
                }
            },
            [controlledValue, name, onChange, onValueChange]
        );

        const handleSelectOption = useCallback(
            (opt: AdminSelectOption) => {
                fireChange(opt.value, opt);
                setIsOpen(false);
                triggerRef.current?.focus();
            },
            [fireChange]
        );

        const handleClear = (e: React.MouseEvent) => {
            e.stopPropagation();
            fireChange('', undefined);
        };

        // Intercept Escape in capture phase when dropdown is open so parent modals don't close
        useEffect(() => {
            if (!isOpen) return;
            const handleCaptureKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    setIsOpen(false);
                    triggerRef.current?.focus();
                }
            };
            window.addEventListener('keydown', handleCaptureKeyDown, true);
            return () => window.removeEventListener('keydown', handleCaptureKeyDown, true);
        }, [isOpen]);

        const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
            if (disabled) return;

            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                } else if (highlightedIndex >= 0 && parsedOptions[highlightedIndex]) {
                    const opt = parsedOptions[highlightedIndex];
                    if (!opt.disabled) {
                        handleSelectOption(opt);
                    }
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                } else if (parsedOptions.length > 0) {
                    setHighlightedIndex((prev) => (prev + 1) % parsedOptions.length);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                } else if (parsedOptions.length > 0) {
                    setHighlightedIndex(
                        (prev) => (prev - 1 + parsedOptions.length) % parsedOptions.length
                    );
                }
            }
        };

        // Compute trigger classes based on variant & size
        const sizePaddingClass =
            variant === 'compact'
                ? 'pl-3 pr-2.5 py-1.5 text-xs rounded-xl'
                : variant === 'filter'
                  ? 'px-3.5 py-2 text-xs rounded-xl'
                  : size === 'sm'
                    ? 'px-2.5 py-1.5 text-xs rounded-lg'
                    : size === 'lg'
                      ? 'px-4 py-2.5 text-base rounded-xl'
                      : 'px-3 py-2 text-sm rounded-md';

        const stateBorderClass = error
            ? 'border-rose-400 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500'
            : isOpen
              ? 'border-blue-600 ring-2 ring-blue-500/15 bg-white'
              : variant === 'filter' || variant === 'compact'
                ? 'border-[#E2E8F0] hover:border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 shadow-xs'
                : 'border-gray-200 hover:border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20';

        const displayIcon = selectedOption?.icon || icon;
        const hasValue =
            selectedOption !== undefined &&
            String(selectedOption.value) !== '' &&
            selectedOption.value !== undefined;

        return (
            <div
                className={`relative ${variant === 'compact' ? 'inline-block' : 'w-full'} ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Hidden native select for form ref / accessibility / required validation */}
                <select
                    ref={ref}
                    id={id ? `${id}-native` : undefined}
                    name={name}
                    value={String(currentValue ?? '')}
                    required={required}
                    disabled={disabled}
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={() => {}}
                    className="sr-only pointer-events-none"
                >
                    <option value="" />
                    {parsedOptions.map((opt, idx) => (
                        <option key={`${opt.value}-${idx}`} value={String(opt.value)}>
                            {opt.label}
                        </option>
                    ))}
                </select>

                {/* Custom Trigger Button */}
                <button
                    ref={triggerRef}
                    id={id}
                    type="button"
                    disabled={disabled}
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                    aria-label={ariaLabel || labelPrefix || placeholder}
                    onClick={() => !disabled && setIsOpen((prev) => !prev)}
                    onKeyDown={handleTriggerKeyDown}
                    className={`w-full flex items-center justify-between gap-2 bg-white border text-left transition-all focus:outline-none cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed ${sizePaddingClass} ${stateBorderClass} ${triggerClassName}`}
                >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        {displayIcon && (
                            <span
                                className={`shrink-0 ${
                                    isOpen ? 'text-blue-600' : 'text-slate-400'
                                }`}
                            >
                                {renderSelectIcon(displayIcon, 'w-4 h-4')}
                            </span>
                        )}
                        {selectedOption?.dotColor && (
                            <span
                                className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.dotColor}`}
                            />
                        )}
                        <span
                            className={`truncate ${
                                variant === 'filter' || variant === 'compact'
                                    ? 'font-semibold text-slate-700'
                                    : selectedOption
                                      ? 'text-gray-800 font-medium'
                                      : 'text-gray-400'
                            }`}
                        >
                            {labelPrefix && (!selectedOption || String(selectedOption.value) === '')
                                ? `${labelPrefix}: ${selectedOption ? selectedOption.label : placeholder}`
                                : selectedOption
                                  ? selectedOption.label
                                  : placeholder}
                        </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        {selectedOption?.badge && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                                {selectedOption.badge}
                            </span>
                        )}
                        {clearable && hasValue && !disabled && (
                            <span
                                role="button"
                                tabIndex={-1}
                                onClick={handleClear}
                                className="p-0.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                title="Xóa lựa chọn"
                            >
                                <X className="w-3 h-3" />
                            </span>
                        )}
                        <ChevronDown
                            className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                                isOpen ? 'rotate-180 text-blue-600' : ''
                            }`}
                        />
                    </div>
                </button>

                {/* Floating Dropdown Menu */}
                <SelectDropdownMenu
                    isOpen={isOpen}
                    options={parsedOptions}
                    selectedValue={currentValue}
                    onSelect={handleSelectOption}
                    onClose={() => setIsOpen(false)}
                    triggerRef={triggerRef}
                    searchable={isSearchable}
                    searchPlaceholder={searchPlaceholder}
                    emptyText={emptyText}
                    size={size}
                    minMenuWidth={minMenuWidth}
                    align={align}
                    menuClassName={menuClassName}
                    highlightedIndex={highlightedIndex}
                    setHighlightedIndex={setHighlightedIndex}
                />
            </div>
        );
    }
);

SelectDropdown.displayName = 'SelectDropdown';
export default SelectDropdown;

