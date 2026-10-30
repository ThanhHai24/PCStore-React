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

export interface FilterOption {
    label: string;
    value: string | number | boolean;
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
    return (
        <div className={`relative inline-flex items-center ${className}`}>
            <div className="relative w-full">
                {Icon && (
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                )}
                <select
                    value={value ?? ''}
                    onChange={(e) => onChange(e.target.value === '' ? undefined : e.target.value)}
                    className={`w-full appearance-none bg-white border border-gray-200 text-gray-800 text-xs font-semibold rounded-xl py-2 pr-8 shadow-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:border-gray-300 cursor-pointer ${Icon ? 'pl-9' : 'pl-3.5'
                        }`}
                >
                    <option value="">{label ? `${label}: ${placeholder}` : placeholder}</option>
                    {options.map((opt) => (
                        <option key={String(opt.value)} value={String(opt.value)}>
                            {opt.label}
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
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
    values = {},
    onChange,
    onFilterChange,
    onReset,
    actions,
    className = '',
}) => {
    const activeSearchChange = onSearchChange || onSearch;
    const activeOnChange = onChange || onFilterChange;

    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Count active filters (excluding search)
    const activeFilterCount = Object.values(values).filter(
        (val) => val !== undefined && val !== '' && val !== null
    ).length;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
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
        if (!activeOnChange) return;
        const updated = { ...values, [fieldId]: val };
        if (val === undefined || val === '') {
            delete updated[fieldId];
        }
        activeOnChange(updated);
    };

    const handleResetAll = () => {
        activeSearchChange?.('');
        onReset?.();
        if (activeOnChange) {
            activeOnChange({});
        }
    };

    return (
        <div className={`bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3 ${className}`}>
            {/* Top Toolbar Row */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Bar & Filter Button */}
                <div className="flex flex-1 flex-wrap items-center justify-between gap-2.5 min-w-0">
                    {showSearch && (
                        <SearchBar
                            value={searchQuery}
                            onChange={activeSearchChange}
                            onSearch={onSearch}
                            placeholder={searchPlaceholder}
                            className={searchBarClassName || "w-full sm:w-96 md:w-[70%] lg:w-[80%]"}
                        />
                    )}
                    <div className="flex items-center gap-2">
                        {/* Single Filter Button with Dropdown Popover */}
                        {fields.length > 0 && (
                            <div className="relative inline-block text-left" ref={dropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(!isOpen)}
                                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all ${isOpen || activeFilterCount > 0
                                        ? 'bg-blue-50 text-blue-600 border-blue-200 ring-2 ring-blue-500/10'
                                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 shadow-sm'
                                        }`}
                                >
                                    <Filter className="w-4 h-4 text-blue-600" />
                                    <span>Bộ lọc</span>
                                    {activeFilterCount > 0 && (
                                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
                                            {activeFilterCount}
                                        </span>
                                    )}
                                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Popover */}
                                {isOpen && (
                                    <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 space-y-4 animate-in fade-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                                            <div className="flex items-center gap-2 font-bold text-xs text-gray-800 uppercase tracking-wider">
                                                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                                                <span>Tùy chọn bộ lọc</span>
                                            </div>
                                            {activeFilterCount > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => activeOnChange?.({})}
                                                    className="text-[11px] font-semibold text-red-500 hover:underline"
                                                >
                                                    Xóa bộ lọc
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                                            {fields.map((field) => {
                                                const fieldKey = field.id || field.name || '';
                                                return (
                                                    <div key={fieldKey} className="space-y-1.5">
                                                        <label className="text-[11px] font-semibold text-gray-600 flex items-center gap-1.5">
                                                            {field.icon && <field.icon className="w-3.5 h-3.5 text-gray-400" />}
                                                            {field.label}
                                                        </label>
                                                        {field.type === 'date' ? (
                                                            <div className="relative">
                                                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                                                <input
                                                                    type="date"
                                                                    value={values[fieldKey] || ''}
                                                                    onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                                                                    className="w-full bg-white border border-gray-200 text-gray-800 text-xs font-semibold rounded-xl py-2 pl-9 pr-3 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
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

                        {/* Reset Button */}
                        {(activeFilterCount > 0 || searchQuery) && (
                            <button
                                type="button"
                                onClick={handleResetAll}
                                className="flex items-center gap-1 px-2.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                title="Xóa tất cả bộ lọc"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">Đặt lại</span>
                            </button>
                        )}
                    </div>

                </div>

                {/* Right side: Action Buttons Slot */}
                {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
            </div>

            {/* Active Filter Chips */}
            {activeFilterCount > 0 && (
                <div className="pt-2 flex flex-wrap items-center gap-1.5 border-t border-gray-50">
                    <span className="text-[11px] font-semibold text-gray-400 mr-1">Đang lọc theo:</span>
                    {Object.entries(values).map(([key, val]) => {
                        if (val === undefined || val === '' || val === null) return null;
                        const field = fields.find((f) => (f.id || f.name) === key);
                        const opt = field?.options?.find((o) => String(o.value) === String(val));
                        const displayVal = opt ? opt.label : String(val);

                        return (
                            <span
                                key={key}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100"
                            >
                                <span>
                                    {field?.label}: <strong className="font-bold">{displayVal}</strong>
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleFieldChange(key, undefined)}
                                    className="hover:bg-blue-100 rounded p-0.5 transition-colors"
                                >
                                    <X className="w-3 h-3 text-blue-600" />
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

