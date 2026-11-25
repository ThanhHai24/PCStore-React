import React, { useState, useRef, useEffect } from 'react';
import {
    SlidersHorizontal,
    Filter,
    RotateCcw,
    ChevronDown,
    X,
    Calendar,
} from 'lucide-react';
import { SearchBar } from './searchbar';
import { SelectDropdown, type AdminSelectOption } from './selectDropdown';

export interface FilterOption {
    label: string;
    value: string | number | boolean;
    description?: string;
    icon?: React.ReactNode | React.ElementType;
    badge?: React.ReactNode;
    dotColor?: string;
}

export interface FilterField {
    id?: string;
    name?: string;
    label: string;
    type?: 'select' | 'date' | 'text';
    placeholder?: string;
    options?: FilterOption[];
    icon?: React.ElementType;
}

export interface AdminFilterProps {
    // Search props
    searchQuery?: string;
    onSearchChange?: (query: string) => void;
    onSearch?: (query: string) => void;
    searchPlaceholder?: string;
    showSearch?: boolean;
    searchBarClassName?: string;

    // Filter fields & values
    fields?: FilterField[];
    values?: Record<string, any>;
    onChange?: (newValues: Record<string, any>) => void;
    onFilterChange?: (newValues: Record<string, any>) => void;
    onReset?: () => void;

    // Additional actions slot (e.g. "Thêm mới", "Xuất Excel")
    actions?: React.ReactNode;
    className?: string;
}

/**
 * FilterSelect: Reusable select dropdown for admin filters
 */
export interface FilterSelectProps {
    label?: string;
    value: any;
    options: FilterOption[];
    onChange: (value: any) => void;
    placeholder?: string;
    icon?: React.ElementType;
    className?: string;
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
    label,
    value,
    options,
    onChange,
    placeholder = 'Tất cả',
    icon: Icon,
    className = '',
}) => {
    const hasEmptyOption = options.some((opt) => String(opt.value) === '');
    const normalizedOptions: AdminSelectOption[] = [
        ...(hasEmptyOption
            ? []
            : [
                  {
                      label: label ? `${label}: ${placeholder}` : placeholder,
                      value: '',
                  },
              ]),
        ...options.map((opt) => ({
            label: opt.label,
            value: String(opt.value),
            description: opt.description,
            icon: opt.icon,
            badge: opt.badge,
            dotColor: opt.dotColor,
        })),
    ];

    return (
        <div className={`relative inline-flex items-center ${className}`}>
            <SelectDropdown
                variant="filter"
                value={value ?? ''}
                options={normalizedOptions}
                placeholder={label ? `${label}: ${placeholder}` : placeholder}
                icon={Icon}
                onValueChange={(val) => onChange(val === '' ? undefined : val)}
            />
        </div>
    );
};

/**
 * AdminFilter: Complete reusable toolbar combining search, single filter dropdown popover & actions
 */
export const AdminFilter: React.FC<AdminFilterProps> = ({
    searchQuery = '',
    onSearchChange,
    onSearch,
    searchPlaceholder = 'Tìm kiếm...',
    showSearch = true,
    searchBarClassName,
    fields = [],
    values: externalValues,
    onChange,
    onFilterChange,
    onReset,
    actions,
    className = '',
}) => {
    const activeSearchChange = onSearchChange || onSearch;
    const activeOnChange = onChange || onFilterChange;

    const [internalValues, setInternalValues] = useState<Record<string, any>>(externalValues || {});
    const values = externalValues !== undefined ? externalValues : internalValues;

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (externalValues !== undefined) {
            setInternalValues(externalValues);
        }
    }, [externalValues]);

    // Count active filters (excluding search)
    const activeFilterCount = Object.values(values).filter(
        (val) => val !== undefined && val !== '' && val !== null
    ).length;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const targetEl = event.target as HTMLElement | null;
            if (targetEl?.closest?.('[data-admin-select-portal="true"]')) {
                return;
            }
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleFieldChange = (fieldId: string, val: any) => {
        const updated = { ...values, [fieldId]: val };
        if (val === undefined || val === '') {
            delete updated[fieldId];
        }
        setInternalValues(updated);
        activeOnChange?.(updated);
    };

    const handleResetAll = () => {
        setInternalValues({});
        activeSearchChange?.('');
        onReset?.();
        if (activeOnChange) {
            activeOnChange({});
        }
    };

    return (
        <div className={`bg-white p-3 rounded-md border border-slate-200 space-y-2.5 ${className}`}>
            {/* Top Toolbar Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                {/* Search Bar, Reset & Filter Button */}
                <div className="flex flex-1 flex-nowrap items-center justify-between gap-2 min-w-0">
                    {showSearch && (
                        <SearchBar
                            value={searchQuery}
                            onChange={activeSearchChange}
                            onSearch={onSearch}
                            placeholder={searchPlaceholder}
                            size="sm"
                            className={searchBarClassName || "flex-1 min-w-0"}
                        />
                    )}
                    <div className="flex items-center gap-2 shrink-0">
                        {/* Reset Button */}
                        {(activeFilterCount > 0 || searchQuery) && (
                            <button
                                type="button"
                                onClick={handleResetAll}
                                className="flex items-center justify-center p-1.5 text-rose-600 border border-slate-200 hover:bg-rose-50 hover:border-rose-200 rounded-md transition-colors shrink-0 cursor-pointer"
                                title="Đặt lại"
                                aria-label="Đặt lại"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        )}

                        {/* Single Filter Button with Dropdown Popover */}
                        {fields.length > 0 && (
                            <div className="relative inline-block text-left shrink-0" ref={dropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(!isOpen)}
                                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md border whitespace-nowrap transition-colors cursor-pointer ${isOpen || activeFilterCount > 0
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                                        }`}
                                >
                                    <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    <span>Bộ lọc</span>
                                    {activeFilterCount > 0 && (
                                        <span className="min-w-4 h-4 px-1 rounded-md bg-blue-600 text-white text-[10px] flex items-center justify-center font-semibold tabular-nums">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Popover */}
                                {isOpen && (
                                    <div className="absolute right-0 mt-1.5 w-72 sm:w-80 bg-white rounded-md shadow-md border border-slate-200 p-3.5 z-50 space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                                            <div className="flex items-center gap-2 font-semibold text-xs text-slate-800 uppercase tracking-wider">
                                                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                                                <span>Tùy chọn bộ lọc</span>
                                            </div>
                                            {activeFilterCount > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setInternalValues({});
                                                        activeOnChange?.({});
                                                    }}
                                                    className="text-[11px] font-medium text-rose-600 hover:underline cursor-pointer"
                                                >
                                                    Xóa bộ lọc
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                                            {fields.map((field) => {
                                                const fieldKey = field.id || field.name || '';
                                                return (
                                                    <div key={fieldKey} className="space-y-1">
                                                        <label className="text-[11px] font-medium text-slate-600 flex items-center gap-1.5">
                                                            {field.icon && <field.icon className="w-3.5 h-3.5 text-slate-400" />}
                                                            {field.label}
                                                        </label>
                                                        {field.type === 'date' ? (
                                                            <div className="relative">
                                                                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                                                <input
                                                                    type="date"
                                                                    value={values[fieldKey] || ''}
                                                                    onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                                                                    className="w-full bg-white border border-slate-200 text-slate-800 text-xs font-medium rounded-md py-1.5 pl-8 pr-2.5 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <FilterSelect
                                                                value={values[fieldKey]}
                                                                options={field.options || []}
                                                                onChange={(val) => handleFieldChange(fieldKey, val)}
                                                                placeholder={field.placeholder || `Tất cả ${field.label.toLowerCase()}`}
                                                                icon={field.icon}
                                                                className="w-full"
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                </div>

                {/* Right side: Action Buttons Slot */}
                {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
            </div>

            {/* Active Filter Chips */}
            {activeFilterCount > 0 && (
                <div className="pt-2 flex flex-wrap items-center gap-1.5 border-t border-slate-100">
                    <span className="text-[11px] font-medium text-slate-500 mr-1">Đang lọc:</span>
                    {Object.entries(values).map(([key, val]) => {
                        if (val === undefined || val === '' || val === null) return null;
                        const field = fields.find((f) => (f.id || f.name) === key);
                        const opt = field?.options?.find((o) => String(o.value) === String(val));
                        const displayVal = opt ? opt.label : String(val);

                        return (
                            <span
                                key={key}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200"
                            >
                                <span>
                                    {field?.label}: <strong className="font-semibold text-slate-900">{displayVal}</strong>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleFieldChange(key, undefined)}
                                    className="hover:bg-slate-200 rounded p-0.5 transition-colors cursor-pointer"
                                >
                                    <X className="w-3 h-3 text-slate-500" />
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminFilter;

