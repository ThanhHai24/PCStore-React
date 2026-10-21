import React from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, AlertCircle, Loader2 } from 'lucide-react';

export interface Column<T> {
    key: string;
    header: React.ReactNode;
    render?: (item: T, index: number) => React.ReactNode;
    accessorKey?: keyof T;
    className?: string;
    headerClassName?: string;
    align?: 'left' | 'center' | 'right';
}

export interface AdminTableProps<T> {
    columns: Column<T>[];
    data: T[];
    rowKey: keyof T | ((item: T) => string | number);
    loading?: boolean;
    emptyText?: string;
    emptyIcon?: React.ElementType;

    // Pagination
    currentPage?: number;
    totalPages?: number;
    totalItems?: number;
    pageSize?: number;
    pageSizeOptions?: number[];
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    showPageSizeSelector?: boolean;
    itemUnitName?: string;
    showPagination?: boolean;

    // Selection
    selectable?: boolean;
    selectedKeys?: (string | number)[];
    onSelectionChange?: (selectedKeys: (string | number)[]) => void;

    // Styling & Callbacks
    className?: string;
    rowClassName?: string | ((item: T, index: number) => string);
    onRowClick?: (item: T) => void;
}

export function AdminTable<T>({
    columns,
    data,
    rowKey,
    loading = false,
    emptyText = 'Không tìm thấy dữ liệu phù hợp.',
    emptyIcon: EmptyIcon = AlertCircle,
    currentPage = 1,
    totalPages = 1,
    totalItems,
    pageSize = 10,
    pageSizeOptions = [10, 15, 20],
    onPageChange,
    onPageSizeChange,
    showPageSizeSelector = true,
    itemUnitName = 'mục',
    showPagination = true,
    selectable = false,
    selectedKeys = [],
    onSelectionChange,
    className = '',
    rowClassName = '',
    onRowClick,
}: AdminTableProps<T>) {
    const getRowKey = (item: T): string | number => {
        if (typeof rowKey === 'function') return rowKey(item);
        return item[rowKey] as unknown as string | number;
    };

    const isAllSelected = data.length > 0 && data.every((item) => selectedKeys.includes(getRowKey(item)));
    const isSomeSelected = data.some((item) => selectedKeys.includes(getRowKey(item))) && !isAllSelected;

    const handleSelectAll = () => {
        if (!onSelectionChange) return;
        if (isAllSelected) {
            const currentPageKeys = data.map(getRowKey);
            onSelectionChange(selectedKeys.filter((k) => !currentPageKeys.includes(k)));
        } else {
            const currentPageKeys = data.map(getRowKey);
            const newKeys = Array.from(new Set([...selectedKeys, ...currentPageKeys]));
            onSelectionChange(newKeys);
        }
    };

    const handleSelectRow = (itemKey: string | number) => {
        if (!onSelectionChange) return;
        if (selectedKeys.includes(itemKey)) {
            onSelectionChange(selectedKeys.filter((k) => k !== itemKey));
        } else {
            onSelectionChange([...selectedKeys, itemKey]);
        }
    };

    const itemsCount = totalItems !== undefined ? totalItems : data.length;
    const calcPageSize = pageSize || 10;
    const mergedPageSizeOptions = Array.from(new Set([...pageSizeOptions, calcPageSize])).sort((a, b) => a - b);
    const startItem = itemsCount > 0 ? (currentPage - 1) * calcPageSize + 1 : 0;
    const endItem = Math.min(currentPage * calcPageSize, itemsCount);

    return (
        <div className={`bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden ${className}`}>
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 font-semibold uppercase border-b border-gray-100">
                        <tr>
                            {selectable && (
                                <th className="px-4 py-3.5 w-10 text-center">
                                    <input
                                        type="checkbox"
                                        checked={isAllSelected}
                                        ref={(input) => {
                                            if (input) input.indeterminate = isSomeSelected;
                                        }}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                    />
                                </th>
                            )}
                            {columns.map((col) => {
                                const alignClass =
                                    col.align === 'center'
                                        ? 'text-center'
                                        : col.align === 'right'
                                            ? 'text-right'
                                            : 'text-left';
                                return (
                                    <th
                                        key={col.key}
                                        className={`px-4 py-3.5 ${alignClass} ${col.headerClassName || col.className || ''}`}
                                    >
                                        {col.header}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={columns.length + (selectable ? 1 : 0)}
                                    className="px-4 py-12 text-center text-gray-400"
                                >
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
                                        <p className="text-xs font-semibold text-gray-500">Đang tải dữ liệu...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length + (selectable ? 1 : 0)}
                                    className="px-4 py-12 text-center text-gray-400"
                                >
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <EmptyIcon className="w-8 h-8 text-gray-300" />
                                        <p className="text-xs font-semibold text-gray-500">{emptyText}</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            data.map((item, index) => {
                                const key = getRowKey(item);
                                const isSelected = selectedKeys.includes(key);
                                const customRowClass =
                                    typeof rowClassName === 'function' ? rowClassName(item, index) : rowClassName;

                                return (
                                    <tr
                                        key={key}
                                        onClick={() => onRowClick?.(item)}
                                        className={`hover:bg-gray-50/80 transition-colors ${isSelected ? 'bg-blue-50/40' : ''
                                            } ${onRowClick ? 'cursor-pointer' : ''} ${customRowClass}`}
                                    >
                                        {selectable && (
                                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleSelectRow(key)}
                                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                                                />
                                            </td>
                                        )}
                                        {columns.map((col) => {
                                            const alignClass =
                                                col.align === 'center'
                                                    ? 'text-center'
                                                    : col.align === 'right'
                                                        ? 'text-right'
                                                        : 'text-left';
                                            const cellContent = col.render
                                                ? col.render(item, index)
                                                : col.accessorKey
                                                    ? (item[col.accessorKey] as unknown as React.ReactNode)
                                                    : null;

                                            return (
                                                <td key={col.key} className={`px-4 py-3 ${alignClass} ${col.className || ''}`}>
                                                    {cellContent}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Row */}
            {showPagination && (
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-gray-500 font-medium">
                        Hiển thị <span className="font-bold text-gray-800">{startItem}</span> - {' '}
                        <span className="font-bold text-gray-800">{endItem}</span> / {' '}
                        <span className="font-bold text-gray-900">{itemsCount}</span> {itemUnitName}
                    </p>

                    <div className="flex flex-wrap items-center gap-4">
                        {showPageSizeSelector && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 font-medium hidden sm:inline">Số bản ghi:</span>
                                <div className="relative inline-block">
                                    <select
                                        value={calcPageSize}
                                        onChange={(e) => onPageSizeChange?.(Number(e.target.value))}
                                        disabled={!onPageSizeChange}
                                        aria-label="Số bản ghi trên 1 trang"
                                        className="appearance-none bg-white border border-gray-200 text-gray-700 text-xs font-semibold rounded-xl pl-3 pr-8 py-1.5 shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 cursor-pointer hover:border-gray-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {mergedPageSizeOptions.map((size) => (
                                            <option key={size} value={size}>
                                                {size} / trang
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </div>
                        )}

                        {totalPages > 1 && onPageChange && (
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    title="Trang trước"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                                    <button
                                        key={page}
                                        type="button"
                                        onClick={() => onPageChange(page)}
                                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${currentPage === page
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    type="button"
                                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    title="Trang kế tiếp"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AdminTable;
