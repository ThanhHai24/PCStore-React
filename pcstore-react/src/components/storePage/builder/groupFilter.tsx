import React from 'react';
import type { BuilderProduct } from '../../../data/builderProducts';
import { RotateCcw } from 'lucide-react';

export function getBrandFromTitle(title: string): string {
    const t = title.toLowerCase();
    if (t.includes('intel')) return 'Intel';
    if (t.includes('amd') || t.includes('ryzen')) return 'AMD';
    if (t.includes('asus') || t.includes('rog') || t.includes('tuf gaming') || t.includes('tuf')) return 'ASUS';
    if (t.includes('msi')) return 'MSI';
    if (t.includes('gigabyte') || t.includes('aorus')) return 'Gigabyte';
    if (t.includes('asrock')) return 'ASRock';
    if (t.includes('corsair')) return 'Corsair';
    if (t.includes('kingston') || t.includes('fury')) return 'Kingston';
    if (t.includes('teamgroup') || t.includes('t-force')) return 'TeamGroup';
    if (t.includes('samsung')) return 'Samsung';
    if (t.includes('western digital') || t.includes('wd blue') || t.includes('wd black') || t.includes('wd green')) return 'Western Digital';
    if (t.includes('seagate')) return 'Seagate';
    if (t.includes('thermalright')) return 'Thermalright';
    if (t.includes('nzxt')) return 'NZXT';
    if (t.includes('cooler master')) return 'Cooler Master';
    if (t.includes('noctua')) return 'Noctua';
    if (t.includes('xigmatek')) return 'Xigmatek';
    if (t.includes('lian li')) return 'Lian Li';
    if (t.includes('aresgame')) return 'ARESGAME';
    return 'Khác';
}

export interface GroupFilterProps {
    products: BuilderProduct[];
    activeSlotIndex: number | null;
    selectedBrands: string[];
    onToggleBrand: (brand: string) => void;
    selectedPriceRanges: string[];
    onTogglePriceRange: (rangeKey: string) => void;
    selectedSpecs: Record<string, string[]>;
    onToggleSpec: (specKey: string, value: string) => void;
    onResetAll: () => void;
}

const PRICE_RANGES = [
    { key: 'under-1m', label: 'Dưới 1 triệu' },
    { key: '1m-3m', label: '1 - 3 triệu' },
    { key: '3m-5m', label: '3 - 5 triệu' },
    { key: '5m-10m', label: '5 - 10 triệu' },
    { key: 'over-10m', label: 'Trên 10 triệu' },
];

const GroupFilter: React.FC<GroupFilterProps> = ({
    products = [],
    activeSlotIndex,
    selectedBrands = [],
    onToggleBrand,
    selectedPriceRanges = [],
    onTogglePriceRange,
    selectedSpecs = {},
    onToggleSpec,
    onResetAll,
}) => {
    // Extract brands present in current candidates
    const candidateBrands = Array.from(
        new Set(products.map((p) => getBrandFromTitle(p.title)).filter((b) => b && b !== 'Khác'))
    );

    const availableBrands = candidateBrands.sort();

    const hasActiveFilters =
        selectedBrands.length > 0 ||
        selectedPriceRanges.length > 0 ||
        Object.values(selectedSpecs).some((arr) => arr && arr.length > 0);

    // Count helpers
    const getBrandCount = (brand: string) => {
        return products.filter((p) => getBrandFromTitle(p.title) === brand).length;
    };

    const getPriceRangeCount = (rangeKey: string) => {
        return products.filter((p) => {
            const price = p.price;
            if (rangeKey === 'under-1m') return price < 1000000;
            if (rangeKey === '1m-3m') return price >= 1000000 && price <= 3000000;
            if (rangeKey === '3m-5m') return price >= 3000000 && price <= 5000000;
            if (rangeKey === '5m-10m') return price >= 5000000 && price <= 10000000;
            if (rangeKey === 'over-10m') return price > 10000000;
            return true;
        }).length;
    };

    const getSpecCount = (specKey: string, value: string) => {
        return products.filter((p) => {
            if (specKey === 'socket') return p.specs?.socket === value;
            if (specKey === 'ramType') return p.specs?.ramType === value;
            if (specKey === 'formFactor') {
                return p.specs?.formFactor === value || p.specs?.supportedForms?.includes(value as any);
            }
            if (specKey === 'wattage') {
                const w = p.specs?.wattage ?? 0;
                if (!w) return false;
                if (value === 'under-550w') return w < 550;
                if (value === '550w-750w') return w >= 550 && w <= 750;
                if (value === 'over-750w') return w > 750;
            }
            if (specKey === 'coolerType') return p.specs?.coolerType === value;
            return false;
        }).length;
    };

    return (
        <div className="space-y-3">
            {/* Reset Filters button if active */}
            {hasActiveFilters && (
                <button
                    type="button"
                    onClick={onResetAll}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded text-xs font-semibold transition-colors cursor-pointer"
                >
                    <RotateCcw size={13} />
                    Xóa tất cả bộ lọc
                </button>
            )}

            {/* Hãng sản xuất (Brand Filter) */}
            {availableBrands.length > 0 && (
                <div className="gr-filter bg-white border border-[#b7b7b7] rounded p-3">
                    <h5 className="title-filter text-[#333] font-bold text-xs uppercase mb-2">
                        Hãng sản xuất
                    </h5>
                    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                        {availableBrands.map((brand) => {
                            const isChecked = selectedBrands.includes(brand);
                            const count = getBrandCount(brand);
                            return (
                                <label
                                    key={brand}
                                    className="flex items-center justify-between cursor-pointer text-xs text-[#333] hover:text-[#0f5b99] transition-colors"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => onToggleBrand(brand)}
                                            className="cb-filter w-3.5 h-3.5 accent-[#0f5b99] rounded border-gray-300 cursor-pointer flex-shrink-0"
                                        />
                                        <span className={`truncate ${isChecked ? 'font-bold text-[#0f5b99]' : ''}`}>
                                            {brand}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-gray-400 font-normal ml-1 flex-shrink-0">
                                        ({count})
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Khoảng giá (Price Range Filter) */}
            <div className="gr-filter bg-white border border-[#b7b7b7] rounded p-3">
                <h5 className="title-filter text-[#333] font-bold text-xs uppercase mb-2">
                    Khoảng giá
                </h5>
                <div className="space-y-1.5">
                    {PRICE_RANGES.map((range) => {
                        const isChecked = selectedPriceRanges.includes(range.key);
                        const count = getPriceRangeCount(range.key);
                        return (
                            <label
                                key={range.key}
                                className="flex items-center justify-between cursor-pointer text-xs text-[#333] hover:text-[#0f5b99] transition-colors"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => onTogglePriceRange(range.key)}
                                        className="cb-filter w-3.5 h-3.5 accent-[#0f5b99] rounded border-gray-300 cursor-pointer flex-shrink-0"
                                    />
                                    <span className={`truncate ${isChecked ? 'font-bold text-[#0f5b99]' : ''}`}>
                                        {range.label}
                                    </span>
                                </div>
                                <span className="text-[11px] text-gray-400 font-normal ml-1 flex-shrink-0">
                                    ({count})
                                </span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Slot-specific Spec Filters */}
            {/* Slot 1 (CPU) or Slot 2 (Mainboard): Socket */}
            {(activeSlotIndex === 1 || activeSlotIndex === 2) && (
                <div className="gr-filter bg-white border border-[#b7b7b7] rounded p-3">
                    <h5 className="title-filter text-[#333] font-bold text-xs uppercase mb-2">
                        Socket CPU
                    </h5>
                    <div className="space-y-1.5">
                        {['LGA 1700', 'AM4', 'AM5'].map((socket) => {
                            const isChecked = (selectedSpecs['socket'] || []).includes(socket);
                            const count = getSpecCount('socket', socket);
                            return (
                                <label
                                    key={socket}
                                    className="flex items-center justify-between cursor-pointer text-xs text-[#333] hover:text-[#0f5b99] transition-colors"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => onToggleSpec('socket', socket)}
                                            className="cb-filter w-3.5 h-3.5 accent-[#0f5b99] rounded border-gray-300 cursor-pointer flex-shrink-0"
                                        />
                                        <span className={`truncate ${isChecked ? 'font-bold text-[#0f5b99]' : ''}`}>
                                            {socket}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-gray-400 font-normal ml-1 flex-shrink-0">
                                        ({count})
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Slot 2 (Mainboard) or Slot 3 (RAM): RAM Type */}
            {(activeSlotIndex === 2 || activeSlotIndex === 3) && (
                <div className="gr-filter bg-white border border-[#b7b7b7] rounded p-3">
                    <h5 className="title-filter text-[#333] font-bold text-xs uppercase mb-2">
                        Chuẩn RAM
                    </h5>
                    <div className="space-y-1.5">
                        {['DDR4', 'DDR5'].map((ram) => {
                            const isChecked = (selectedSpecs['ramType'] || []).includes(ram);
                            const count = getSpecCount('ramType', ram);
                            return (
                                <label
                                    key={ram}
                                    className="flex items-center justify-between cursor-pointer text-xs text-[#333] hover:text-[#0f5b99] transition-colors"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => onToggleSpec('ramType', ram)}
                                            className="cb-filter w-3.5 h-3.5 accent-[#0f5b99] rounded border-gray-300 cursor-pointer flex-shrink-0"
                                        />
                                        <span className={`truncate ${isChecked ? 'font-bold text-[#0f5b99]' : ''}`}>
                                            {ram}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-gray-400 font-normal ml-1 flex-shrink-0">
                                        ({count})
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Slot 2 (Mainboard) or Slot 9 (Case): Form Factor */}
            {(activeSlotIndex === 2 || activeSlotIndex === 9) && (
                <div className="gr-filter bg-white border border-[#b7b7b7] rounded p-3">
                    <h5 className="title-filter text-[#333] font-bold text-xs uppercase mb-2">
                        Kích thước Bo Mạch
                    </h5>
                    <div className="space-y-1.5">
                        {['ATX', 'Micro-ATX', 'Mini-ITX'].map((ff) => {
                            const isChecked = (selectedSpecs['formFactor'] || []).includes(ff);
                            const count = getSpecCount('formFactor', ff);
                            return (
                                <label
                                    key={ff}
                                    className="flex items-center justify-between cursor-pointer text-xs text-[#333] hover:text-[#0f5b99] transition-colors"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => onToggleSpec('formFactor', ff)}
                                            className="cb-filter w-3.5 h-3.5 accent-[#0f5b99] rounded border-gray-300 cursor-pointer flex-shrink-0"
                                        />
                                        <span className={`truncate ${isChecked ? 'font-bold text-[#0f5b99]' : ''}`}>
                                            {ff}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-gray-400 font-normal ml-1 flex-shrink-0">
                                        ({count})
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Slot 7 (PSU): Wattage */}
            {activeSlotIndex === 7 && (
                <div className="gr-filter bg-white border border-[#b7b7b7] rounded p-3">
                    <h5 className="title-filter text-[#333] font-bold text-xs uppercase mb-2">
                        Công suất Nguồn
                    </h5>
                    <div className="space-y-1.5">
                        {[
                            { key: 'under-550w', label: 'Dưới 550W' },
                            { key: '550w-750w', label: '550W - 750W' },
                            { key: 'over-750w', label: 'Trên 750W' },
                        ].map((w) => {
                            const isChecked = (selectedSpecs['wattage'] || []).includes(w.key);
                            const count = getSpecCount('wattage', w.key);
                            return (
                                <label
                                    key={w.key}
                                    className="flex items-center justify-between cursor-pointer text-xs text-[#333] hover:text-[#0f5b99] transition-colors"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => onToggleSpec('wattage', w.key)}
                                            className="cb-filter w-3.5 h-3.5 accent-[#0f5b99] rounded border-gray-300 cursor-pointer flex-shrink-0"
                                        />
                                        <span className={`truncate ${isChecked ? 'font-bold text-[#0f5b99]' : ''}`}>
                                            {w.label}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-gray-400 font-normal ml-1 flex-shrink-0">
                                        ({count})
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Slot 8 (Cooler): Cooler Type */}
            {activeSlotIndex === 8 && (
                <div className="gr-filter bg-white border border-[#b7b7b7] rounded p-3">
                    <h5 className="title-filter text-[#333] font-bold text-xs uppercase mb-2">
                        Loại tản nhiệt
                    </h5>
                    <div className="space-y-1.5">
                        {[
                            { key: 'AIR', label: 'Tản nhiệt Khí' },
                            { key: 'AIO', label: 'Tản nhiệt Nước AIO' },
                        ].map((c) => {
                            const isChecked = (selectedSpecs['coolerType'] || []).includes(c.key);
                            const count = getSpecCount('coolerType', c.key);
                            return (
                                <label
                                    key={c.key}
                                    className="flex items-center justify-between cursor-pointer text-xs text-[#333] hover:text-[#0f5b99] transition-colors"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => onToggleSpec('coolerType', c.key)}
                                            className="cb-filter w-3.5 h-3.5 accent-[#0f5b99] rounded border-gray-300 cursor-pointer flex-shrink-0"
                                        />
                                        <span className={`truncate ${isChecked ? 'font-bold text-[#0f5b99]' : ''}`}>
                                            {c.label}
                                        </span>
                                    </div>
                                    <span className="text-[11px] text-gray-400 font-normal ml-1 flex-shrink-0">
                                        ({count})
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupFilter;

