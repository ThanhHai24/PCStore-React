import React, { useState, useMemo } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    Loader2,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Search,
    X,
} from 'lucide-react';
import { SelectDropdown } from './selectDropdown';
import {
    AdminActionDropdown,
    TableRowActions,
    type AdminActionItem,
    type AdminActionDropdownProps,
    type ActionItemVariant,
} from './actionDropdown';

export { AdminActionDropdown, TableRowActions };
export type { AdminActionItem, AdminActionDropdownProps, ActionItemVariant };

export type SortDirection = 'asc' | 'desc';

export interface Column<T> {
    key: string;
    header: React.ReactNode;
    render?: (item: T, index: number) => React.ReactNode;
    accessorKey?: keyof T;
    className?: string;
    headerClassName?: string;
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
    sortValue?: (item: T) => string | number;
}

export interface AdminTableProps<T> {
    columns: Column<T>[];
    data: T[];
    rowKey: keyof T | ((item: T) => string | number);
    loading?: boolean;
    emptyText?: string;
    emptyIcon?: React.ElementType;

    // Search & Toolbar (optional built-in support)
    searchable?: boolean;
    searchQuery?: string;
    onSearchChange?: (query: string) => void;
    searchPlaceholder?: string;
    searchFilterFn?: (item: T, query: string) => boolean;
    toolbarLeft?: React.ReactNode;
    toolbarRight?: React.ReactNode;

    // Sorting (controlled or uncontrolled)
    sortKey?: string;
    sortDirection?: SortDirection;
    defaultSortKey?: string;
    defaultSortDirection?: SortDirection;
    onSortChange?: (key: string, direction: SortDirection) => void;
    disableClientSort?: boolean;

    // Summary row at bottom of tbody
    summaryRow?: React.ReactNode;

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
    searchable = false,
    searchQuery: controlledSearchQuery,
    onSearchChange,
    searchPlaceholder = 'Tìm kiếm trong bảng...',
    searchFilterFn,
    toolbarLeft,
    toolbarRight,
    sortKey: controlledSortKey,
    sortDirection: controlledSortDirection,
    defaultSortKey = '',
    defaultSortDirection = 'desc',
    onSortChange,
    disableClientSort = false,
    summaryRow,
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
    const [internalSearch, setInternalSearch] = useState('');
    const [internalSortKey, setInternalSortKey] = useState<string>(defaultSortKey);
    const [internalSortDir, setInternalSortDir] = useState<SortDirection>(defaultSortDirection);

    const activeSearch = controlledSearchQuery !== undefined ? controlledSearchQuery : internalSearch;
    const activeSortKey = controlledSortKey !== undefined ? controlledSortKey : internalSortKey;
    const activeSortDir = controlledSortDirection !== undefined ? controlledSortDirection : internalSortDir;

    const handleSearchInput = (val: string) => {
        if (onSearchChange) {
            onSearchChange(val);
        } else {
            setInternalSearch(val);
        }
    };

    const handleHeaderSortClick = (col: Column<T>) => {
        if (!col.sortable) return;
        const nextDir: SortDirection =
            activeSortKey === col.key ? (activeSortDir === 'asc' ? 'desc' : 'asc') : 'desc';
        if (onSortChange) {
            onSortChange(col.key, nextDir);
        } else {
            setInternalSortKey(col.key);
            setInternalSortDir(nextDir);
        }
    };

    const processedData = useMemo(() => {
        let list = [...data];

        // Optional built-in client search if no external handler filters data
        if (searchable && activeSearch.trim() && !onSearchChange) {
            const q = activeSearch.trim().toLowerCase();
            list = list.filter((item) => {
                if (searchFilterFn) return searchFilterFn(item, q);
                return Object.values(item as Record<string, unknown>).some((v) =>
                    String(v ?? '')
                        .toLowerCase()
                        .includes(q)
                );
            });
        }

        // Optional client-side sorting when a sortable column is active
        if (!disableClientSort && activeSortKey && !onSortChange) {
            const sortCol = columns.find((c) => c.key === activeSortKey);
            if (sortCol && sortCol.sortable) {
                list.sort((a, b) => {
                    const valA = sortCol.sortValue
                        ? sortCol.sortValue(a)
                        : sortCol.accessorKey
                          ? (a[sortCol.accessorKey] as unknown as string | number)
                          : ((a as Record<string, unknown>)[sortCol.key] as string | number);
                    const valB = sortCol.sortValue
                        ? sortCol.sortValue(b)
                        : sortCol.accessorKey
                          ? (b[sortCol.accessorKey] as unknown as string | number)
                          : ((b as Record<string, unknown>)[sortCol.key] as string | number);

                    if (typeof valA === 'number' && typeof valB === 'number') {
                        return activeSortDir === 'asc' ? valA - valB : valB - valA;
                    }
                    const strA = String(valA ?? '');
                    const strB = String(valB ?? '');
                    return activeSortDir === 'asc'
                        ? strA.localeCompare(strB, 'vi')
                        : strB.localeCompare(strA, 'vi');
                });
            }
        }

        return list;
    }, [
        data,
        searchable,
        activeSearch,
        onSearchChange,
        searchFilterFn,
        disableClientSort,
        activeSortKey,
        activeSortDir,
        onSortChange,
        columns,
    ]);

    const getRowKey = (item: T): string | number => {
        if (typeof rowKey === 'function') return rowKey(item);
        return item[rowKey] as unknown as string | number;
    };

    const isAllSelected =
        processedData.length > 0 && processedData.every((item) => selectedKeys.includes(getRowKey(item)));
    const isSomeSelected =
        processedData.some((item) => selectedKeys.includes(getRowKey(item))) && !isAllSelected;

    const handleSelectAll = () => {
        if (!onSelectionChange) return;
        if (isAllSelected) {
            const currentPageKeys = processedData.map(getRowKey);
            onSelectionChange(selectedKeys.filter((k) => !currentPageKeys.includes(k)));
        } else {
            const currentPageKeys = processedData.map(getRowKey);
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

    const itemsCount = totalItems !== undefined ? totalItems : processedData.length;
    const calcPageSize = pageSize || 10;
    const mergedPageSizeOptions = Array.from(new Set([...pageSizeOptions, calcPageSize])).sort((a, b) => a - b);
    const startItem = itemsCount > 0 ? (currentPage - 1) * calcPageSize + 1 : 0;
    const endItem = Math.min(currentPage * calcPageSize, itemsCount);

    // Tạo danh sách trang hiển thị dạng: 1 2 ... 5 6 7 ... 9 10
    const paginationItems = useMemo<(number | 'ellipsis-left' | 'ellipsis-right')[]>(() => {
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        if (currentPage <= 3) {
            return [1, 2, 3, 4, 'ellipsis-right', totalPages - 1, totalPages];
        }

        if (currentPage === 4) {
            return [1, 2, 3, 4, 5, 'ellipsis-right', totalPages - 1, totalPages];
        }

        if (currentPage >= totalPages - 2) {
            return [1, 2, 'ellipsis-left', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }

        if (currentPage === totalPages - 3) {
            return [1, 2, 'ellipsis-left', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
        }

        return [
            1,
            2,
            'ellipsis-left',
            currentPage - 1,
            currentPage,
            currentPage + 1,
            'ellipsis-right',
            totalPages - 1,
            totalPages,
        ];
    }, [currentPage, totalPages]);

    return (
        <div className={`bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden ${className}`}>
            {(searchable || toolbarLeft || toolbarRight) && (
                <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                        {toolbarLeft}
                        {searchable && (
                            <div className="relative w-full sm:w-72">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    value={activeSearch}
                                    onChange={(e) => handleSearchInput(e.target.value)}
                                    placeholder={searchPlaceholder}
                                    className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15 transition-all"
                                />
                                {activeSearch && (
                                    <button
                                        type="button"
                                        onClick={() => handleSearchInput('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    {toolbarRight && <div className="flex items-center gap-2 shrink-0">{toolbarRight}</div>}
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] text-slate-500 font-semibold uppercase border-b border-[#E2E8F0]">
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
                                        className="w-4 h-4 text-[#2563EB] rounded border-gray-300 focus:ring-[#2563EB] cursor-pointer"
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
                                const isSorted = activeSortKey === col.key;
                                const justifyClass =
                                    col.align === 'center'
                                        ? 'justify-center'
                                        : col.align === 'right'
                                          ? 'justify-end'
                                          : 'justify-start';

                                return (
                                    <th
                                        key={col.key}
                                        onClick={() => col.sortable && handleHeaderSortClick(col)}
                                        className={`px-4 py-3.5 ${alignClass} ${
                                            col.sortable
                                                ? 'cursor-pointer select-none hover:bg-slate-100/80 hover:text-slate-800 transition-colors'
                                                : ''
                                        } ${col.headerClassName || col.className || ''}`}
                                    >
                                        {col.sortable ? (
                                            <div className={`inline-flex items-center gap-1.5 ${justifyClass}`}>
                                                <span>{col.header}</span>
                                                <span className="inline-flex items-center">
                                                    {isSorted ? (
                                                        activeSortDir === 'asc' ? (
                                                            <ArrowUp className="w-3.5 h-3.5 text-[#2563EB]" />
                                                        ) : (
                                                            <ArrowDown className="w-3.5 h-3.5 text-[#2563EB]" />
                                                        )
                                                    ) : (
                                                        <ArrowUpDown className="w-3.5 h-3.5 text-slate-300" />
                                                    )}
                                                </span>
                                            </div>
                                        ) : (
                                            col.header
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                        {loading ? (
                            <tr>
                                <td
                                    colSpan={columns.length + (selectable ? 1 : 0)}
                                    className="px-4 py-12 text-center text-gray-400"
                                >
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <Loader2 className="w-7 h-7 text-[#2563EB] animate-spin" />
                                        <p className="text-xs font-semibold text-gray-500">Đang tải dữ liệu...</p>
                                    </div>
                                </td>
                            </tr>
                        ) : processedData.length === 0 ? (
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
                            <>
                                {processedData.map((item, index) => {
                                    const key = getRowKey(item);
                                    const isSelected = selectedKeys.includes(key);
                                    const customRowClass =
                                        typeof rowClassName === 'function' ? rowClassName(item, index) : rowClassName;

                                    return (
                                        <tr
                                            key={key}
                                            onClick={() => onRowClick?.(item)}
                                            className={`hover:bg-[#F8FAFC] transition-colors ${
                                                isSelected ? 'bg-blue-50/40' : ''
                                            } ${onRowClick ? 'cursor-pointer' : ''} ${customRowClass}`}
                                        >
                                            {selectable && (
                                                <td
                                                    className="px-4 py-3 text-center"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => handleSelectRow(key)}
                                                        className="w-4 h-4 text-[#2563EB] rounded border-gray-300 focus:ring-[#2563EB] cursor-pointer"
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
                                                    <td
                                                        key={col.key}
                                                        className={`px-4 py-3.5 ${alignClass} ${col.className || ''}`}
                                                    >
                                                        {cellContent}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                                {summaryRow}
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Row */}
            {showPagination && (
                <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-slate-500 font-medium">
                        Hiển thị <span className="font-bold text-slate-800">{startItem}</span> -{' '}
                        <span className="font-bold text-slate-800">{endItem}</span> /{' '}
                        <span className="font-bold text-slate-900">{itemsCount}</span> {itemUnitName}
                    </p>

                    <div className="flex flex-wrap items-center gap-4">
                        {showPageSizeSelector && (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-medium hidden sm:inline">Số bản ghi:</span>
                                <SelectDropdown
                                    variant="compact"
                                    size="sm"
                                    value={calcPageSize}
                                    disabled={!onPageSizeChange}
                                    ariaLabel="Số bản ghi trên 1 trang"
                                    minMenuWidth={135}
                                    align="right"
                                    searchable={false}
                                    options={mergedPageSizeOptions.map((size) => ({
                                        label: `${size} / trang`,
                                        value: size,
                                    }))}
                                    onValueChange={(val) => onPageSizeChange?.(Number(val))}
                                />
                            </div>
                        )}

                        {totalPages > 1 && onPageChange && (
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-xl border border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                    title="Trang trước"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                {paginationItems.map((item) => {
                                    if (item === 'ellipsis-left' || item === 'ellipsis-right') {
                                        return (
                                            <span
                                                key={item}
                                                className="w-8 h-8 inline-flex items-center justify-center text-xs font-bold text-slate-400 select-none"
                                            >
                                                ...
                                            </span>
                                        );
                                    }

                                    return (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() => onPageChange(item)}
                                            className={`min-w-8 h-8 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                                currentPage === item
                                                    ? 'bg-[#2563EB] text-white shadow-sm'
                                                    : 'bg-white text-slate-600 border border-[#E2E8F0] hover:bg-slate-50'
                                            }`}
                                        >
                                            {item}
                                        </button>
                                    );
                                })}

                                <button
                                    type="button"
                                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-xl border border-[#E2E8F0] bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
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

export const DataTable = AdminTable;
export default AdminTable;
