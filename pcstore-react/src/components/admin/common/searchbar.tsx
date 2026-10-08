import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export interface SearchBarProps {
    value?: string;
    onChange?: (value: string) => void;
    onSearch?: (value: string) => void;
    onClear?: () => void;
    placeholder?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
    value: externalValue,
    onChange,
    onSearch,
    onClear,
    placeholder = 'Tìm kiếm...',
    className = '',
    size = 'md',
    disabled = false,
    autoFocus = false,
}) => {
    const [internalValue, setInternalValue] = useState(externalValue || '');

    useEffect(() => {
        if (externalValue !== undefined) {
            setInternalValue(externalValue);
        }
    }, [externalValue]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setInternalValue(val);
        onChange?.(val);
    };

    const handleClear = () => {
        setInternalValue('');
        onChange?.('');
        onClear?.();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            onSearch?.(internalValue);
        }
    };

    const sizeStyles = {
        sm: 'py-1.5 pl-8 pr-7 text-xs rounded-lg',
        md: 'py-2 pl-9 pr-8 text-sm rounded-xl',
        lg: 'py-2.5 pl-10 pr-9 text-base rounded-xl',
    };

    const iconSizes = {
        sm: 'w-3.5 h-3.5 left-2.5',
        md: 'w-4 h-4 left-3',
        lg: 'w-5 h-5 left-3.5',
    };

    const clearSizes = {
        sm: 'right-2 p-0.5',
        md: 'right-2.5 p-0.5',
        lg: 'right-3 p-1',
    };

    return (
        <div className={`relative flex items-center ${className}`}>
            <Search
                className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none transition-colors group-focus-within:text-blue-500 ${iconSizes[size]}`}
            />
            <input
                type="text"
                value={internalValue}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                autoFocus={autoFocus}
                className={`w-full bg-white border border-gray-200 text-gray-800 placeholder-gray-400 font-small shadow-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 hover:border-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed ${sizeStyles[size]}`}
            />
            {internalValue && (
                <button
                    type="button"
                    onClick={handleClear}
                    className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors ${clearSizes[size]}`}
                    title="Xóa tìm kiếm"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
};

export default SearchBar;