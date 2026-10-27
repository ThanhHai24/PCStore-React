import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Cpu,
  Layers,
  Laptop,
  Search,
  Plus,
  Trash2,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  Code,
  Sliders,
  DollarSign,
  Package,
  Sparkles,
  Edit2,
  ListFilter
} from 'lucide-react';
import type { ProductType } from '../../types/adminProduct';
import {
  PC_STANDARD_PARTS,
  LAPTOP_STANDARD_FIELDS,
  COMPONENT_SPEC_TEMPLATES,
  detectComponentTemplate,
  detectProductTypeFromCategory,
  getSpecTemplateForCategory,
  mergeSpecsWithTemplate,
  type SpecItemData,
  type ComponentTemplate
} from '../../config/specTemplates';
import { adminProductService } from '../../services/adminProductService';

export interface DynamicSpecFormProps {
  value: string;
  onChange: (value: string) => void;
  productType?: ProductType | string;
  categoryName?: string;
  readOnly?: boolean;
  availableProducts?: any[];
}

export const DynamicSpecForm: React.FC<DynamicSpecFormProps> = ({
  value,
  onChange,
  productType = 'COMPONENT',
  categoryName = '',
  readOnly = false,
  availableProducts = [],
}) => {
  // Category Spec Info (Auto detected from categoryName)
  const categorySpecInfo = useMemo(() => getSpecTemplateForCategory(categoryName), [categoryName]);

  // Mode selection: directly determined by category / productType ('PC' | 'LAPTOP' | 'COMPONENT')
  const activeMode: 'PC' | 'LAPTOP' | 'COMPONENT' = useMemo(() => {
    const pt = (productType || '').toUpperCase();
    if (pt === 'PC' || pt === 'LAPTOP') return pt as 'PC' | 'LAPTOP';
    return categorySpecInfo.mode;
  }, [productType, categorySpecInfo.mode]);

  const [isRawMode, setIsRawMode] = useState<boolean>(false);

  // Selected template for COMPONENT mode
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    categorySpecInfo.template?.id || 'vga'
  );

  // Track fields where user opted to enter custom text instead of select dropdown
  const [customModeFields, setCustomModeFields] = useState<Record<string, boolean>>({});

  // Active component template definition
  const currentComponentTemplate = useMemo(() => {
    if (categorySpecInfo.template) return categorySpecInfo.template;
    return COMPONENT_SPEC_TEMPLATES.find((t) => t.id === selectedTemplateId) || null;
  }, [categorySpecInfo.template, selectedTemplateId]);

  // Parse incoming value string
  const parseValueToItems = useCallback((valStr: string): SpecItemData[] => {
    if (!valStr || !valStr.trim()) return [];
    const trimmed = valStr.trim();

    // 1. JSON parse
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item: any) => ({
            key: String(item.key || item.name || 'Thông số'),
            name: String(item.value || item.name || item.val || ''),
            warranty: item.warranty || undefined,
            productId: item.productId ? String(item.productId) : undefined,
            productCode: item.productCode || item.sku || undefined,
            productPrice: item.productPrice || item.price ? Number(item.productPrice || item.price) : undefined,
          }));
        }
        if (typeof parsed === 'object') {
          return Object.entries(parsed).map(([k, v]) => ({
            key: k,
            name: String(v),
            warranty: undefined,
          }));
        }
      } catch {
        // Fall back to plain text
      }
    }

    // 2. Line by line parsing (key: value)
    const lines = trimmed.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
    const parsedLines: SpecItemData[] = [];
    for (const line of lines) {
      const cleanLine = line.replace(/^[-*•]\s*/, '');
      if (cleanLine.includes(':')) {
        const [k, ...rest] = cleanLine.split(':');
        parsedLines.push({
          key: k.trim(),
          name: rest.join(':').trim(),
          warranty: undefined,
        });
      } else {
        parsedLines.push({
          key: 'Thông số',
          name: cleanLine,
          warranty: undefined,
        });
      }
    }
    return parsedLines;
  }, []);

  // Parsed Specs Items State (Immediately initialized with value or category template)
  const [items, setItems] = useState<SpecItemData[]>(() => {
    const parsed = parseValueToItems(value);
    if (parsed.length > 0) return parsed;
    if (!readOnly && categorySpecInfo.items.length > 0) return categorySpecInfo.items;
    return [];
  });

  const [rawText, setRawText] = useState<string>(() => {
    if (value && value.trim()) return value;
    if (!readOnly && categorySpecInfo.items.length > 0) {
      return JSON.stringify(categorySpecInfo.items, null, 2);
    }
    return '';
  });

  // Ref to track last emitted value to prevent circular feedback loops
  const lastEmittedValueRef = useRef<string | null>(null);

  // Ref to track previous category to detect category changes
  const prevCategoryRef = useRef<string>(categoryName);

  // Product Selection Modal State (For PC mode)
  const [pickerSlotKey, setPickerSlotKey] = useState<string | null>(null);
  const [pickerSlotLabel, setPickerSlotLabel] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [remoteProducts, setRemoteProducts] = useState<any[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState<boolean>(false);
  const [manualInputName, setManualInputName] = useState<string>('');
  const [manualInputWarranty, setManualInputWarranty] = useState<string>('36 Tháng');

  // Keep selectedTemplateId in sync when category changes
  useEffect(() => {
    if (categorySpecInfo.template) {
      setSelectedTemplateId(categorySpecInfo.template.id);
    }
  }, [categorySpecInfo.template]);

  // On initial mount, emit template if parent value was empty
  useEffect(() => {
    if ((!value || !value.trim() || value.trim() === '[]') && !readOnly && categorySpecInfo.items.length > 0) {
      const initialJson = JSON.stringify(categorySpecInfo.items, null, 2);
      lastEmittedValueRef.current = initialJson;
      onChange(initialJson);
    }
  }, []);

  // Auto update specs when categoryName changes
  useEffect(() => {
    if (prevCategoryRef.current !== categoryName) {
      prevCategoryRef.current = categoryName;
      if (!readOnly && categorySpecInfo.items.length > 0) {
        const newSpecStr = mergeSpecsWithTemplate(value, categorySpecInfo.items);
        const parsed = parseValueToItems(newSpecStr);
        setItems(parsed);
        setRawText(newSpecStr);
        lastEmittedValueRef.current = newSpecStr;
        onChange(newSpecStr);
        if (categorySpecInfo.template) {
          setSelectedTemplateId(categorySpecInfo.template.id);
        }
      }
    }
  }, [categoryName, categorySpecInfo, readOnly, value, parseValueToItems, onChange]);

  // Sync internal items when `value` prop changes from outside
  useEffect(() => {
    if (lastEmittedValueRef.current !== null && value === lastEmittedValueRef.current) {
      return;
    }
    lastEmittedValueRef.current = value || '';
    const parsed = parseValueToItems(value);

    // If external value is empty and not read-only, auto-populate from category template
    if (parsed.length === 0 && !readOnly && categorySpecInfo.items.length > 0) {
      setItems(categorySpecInfo.items);
      const initialJson = JSON.stringify(categorySpecInfo.items, null, 2);
      setRawText(initialJson);
      lastEmittedValueRef.current = initialJson;
      onChange(initialJson);
    } else {
      setItems(parsed);
      setRawText(value || '');
    }
  }, [value, parseValueToItems, readOnly, categorySpecInfo, onChange]);

  // Emit change to parent
  const emitChanges = useCallback(
    (newItems: SpecItemData[]) => {
      setItems(newItems);
      // Keep items that have key or name or productId
      const validItems = newItems.filter(
        (i) => (i.key && i.key.trim() !== '') || (i.name && i.name.trim() !== '') || i.productId
      );
      const jsonString = validItems.length > 0 ? JSON.stringify(validItems, null, 2) : '';
      lastEmittedValueRef.current = jsonString;
      setRawText(jsonString);
      onChange(jsonString);
    },
    [onChange]
  );

  // Apply a template (for Component mode or reset)
  const applyTemplate = (template: ComponentTemplate) => {
    setSelectedTemplateId(template.id);
    const existingMap = new Map(items.map((i) => [i.key.toLowerCase().trim(), i]));
    const newItems: SpecItemData[] = template.fields.map((f) => {
      const existing = existingMap.get(f.key.toLowerCase().trim());
      return {
        key: f.key,
        name: existing?.name || f.defaultValue || '',
        warranty: existing?.warranty || f.defaultWarranty || '36 Tháng',
      };
    });
    emitChanges(newItems);
  };

  // Apply Laptop Standard fields
  const applyLaptopTemplate = () => {
    const existingMap = new Map(items.map((i) => [i.key.toLowerCase().trim(), i]));
    const newItems: SpecItemData[] = LAPTOP_STANDARD_FIELDS.map((f) => {
      const existing = existingMap.get(f.key.toLowerCase().trim());
      return {
        key: f.key,
        name: existing?.name || f.defaultValue || '',
        warranty: existing?.warranty || '24 Tháng',
      };
    });
    emitChanges(newItems);
  };

  // Search products for PC component picker
  const handleSearchRemoteProducts = async (keyword: string) => {
    setSearchKeyword(keyword);
    if (!keyword.trim()) {
      setRemoteProducts([]);
      return;
    }
    try {
      setIsSearchingRemote(true);
      const res = await adminProductService.getAllProducts({ keyword: keyword.trim(), size: 20 });
      if (res && res.content) {
        setRemoteProducts(res.content);
      }
    } catch (err) {
      console.warn('Failed to search products:', err);
    } finally {
      setIsSearchingRemote(false);
    }
  };

  // Filtered available products for picker
  const filteredAvailableProducts = useMemo(() => {
    if (!pickerSlotKey) return [];
    const kw = searchKeyword.trim().toLowerCase();

    // Pool from local availableProducts
    const localList = (availableProducts || []).map((p: any) => ({
      id: String(p.numericId || p.id),
      name: p.name || '',
      sku: p.sku || p.code || '',
      price: p.price || 0,
      image: p.image || p.imageUrl || '',
      category: p.category || '',
      productType: p.productType || '',
    }));

    // If remote products exist, merge them
    const remoteList = remoteProducts.map((p: any) => ({
      id: String(p.id),
      name: p.name || '',
      sku: p.code || '',
      price: p.price || 0,
      image: p.imageUrl || '',
      category: '',
      productType: p.productType || '',
    }));

    const combined = [...remoteList];
    const seenIds = new Set(combined.map((c) => c.id));
    for (const loc of localList) {
      if (!seenIds.has(loc.id)) {
        combined.push(loc);
        seenIds.add(loc.id);
      }
    }

    if (!kw) {
      // Find matching keywords for this slot
      const partDef = PC_STANDARD_PARTS.find((p) => p.key === pickerSlotKey);
      if (partDef && partDef.categoryKeywords.length > 0) {
        // Prioritize items that match slot keyword
        return combined.sort((a, b) => {
          const aMatch = partDef.categoryKeywords.some((k) => a.name.toLowerCase().includes(k) || a.category.toLowerCase().includes(k));
          const bMatch = partDef.categoryKeywords.some((k) => b.name.toLowerCase().includes(k) || b.category.toLowerCase().includes(k));
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
          return 0;
        });
      }
      return combined;
    }

    return combined.filter(
      (p) =>
        p.name.toLowerCase().includes(kw) ||
        p.sku.toLowerCase().includes(kw) ||
        p.id.includes(kw)
    );
  }, [pickerSlotKey, searchKeyword, availableProducts, remoteProducts]);

  // Select product for PC slot
  const handleSelectProductForSlot = (slotKey: string, product: any, defaultWarranty = '36 Tháng') => {
    const existingIdx = items.findIndex((i) => i.key.toUpperCase() === slotKey.toUpperCase());
    const newItem: SpecItemData = {
      key: slotKey,
      name: product.name,
      productId: String(product.id),
      productCode: product.sku || product.code,
      productPrice: product.price,
      warranty: defaultWarranty,
    };

    let updated: SpecItemData[];
    if (existingIdx >= 0) {
      updated = [...items];
      updated[existingIdx] = {
        ...updated[existingIdx],
        ...newItem,
        warranty: updated[existingIdx].warranty || defaultWarranty,
      };
    } else {
      updated = [...items, newItem];
    }

    emitChanges(updated);
    setPickerSlotKey(null);
    setSearchKeyword('');
    setRemoteProducts([]);
  };

  // Set manual component for slot
  const handleSaveManualSlot = (slotKey: string) => {
    if (!manualInputName.trim()) return;
    const existingIdx = items.findIndex((i) => i.key.toUpperCase() === slotKey.toUpperCase());
    const newItem: SpecItemData = {
      key: slotKey,
      name: manualInputName.trim(),
      warranty: manualInputWarranty || '36 Tháng',
      productId: undefined,
    };

    let updated: SpecItemData[];
    if (existingIdx >= 0) {
      updated = [...items];
      updated[existingIdx] = newItem;
    } else {
      updated = [...items, newItem];
    }

    emitChanges(updated);
    setPickerSlotKey(null);
    setManualInputName('');
  };

  // Remove component from PC slot
  const handleRemoveSlot = (slotKey: string) => {
    const updated = items.filter((i) => i.key.toUpperCase() !== slotKey.toUpperCase());
    emitChanges(updated);
  };

  // Update warranty for PC slot
  const handleUpdateSlotWarranty = (slotKey: string, warranty: string) => {
    const updated = items.map((i) => {
      if (i.key.toUpperCase() === slotKey.toUpperCase()) {
        return { ...i, warranty };
      }
      return i;
    });
    emitChanges(updated);
  };

  // Update key/name in generic/laptop table
  const handleUpdateItem = (index: number, field: 'key' | 'name' | 'warranty', val: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: val };
    emitChanges(updated);
  };

  const handleAddItem = (key = '', name = '', warranty = '') => {
    emitChanges([...items, { key, name, warranty }]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index);
    emitChanges(updated);
  };

  // Apply raw JSON changes
  const handleApplyRawJson = (text: string) => {
    setRawText(text);
    const parsed = parseValueToItems(text);
    setItems(parsed);
    onChange(text);
  };

  // =========================================================================
  // READ-ONLY VIEWER MODE (For Detail Modal)
  // =========================================================================
  if (readOnly) {
    if (items.length === 0) {
      return (
        <div className="p-6 text-center rounded-2xl bg-gray-50 border border-dashed border-gray-200">
          <Layers className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">Chưa cập nhật bảng thông số kỹ thuật chi tiết</p>
          <p className="text-xs text-gray-400 mt-1">Sản phẩm này chưa có thông tin phần cứng hoặc linh kiện cấu thành.</p>
        </div>
      );
    }

    if (activeMode === 'PC') {
      return (
        <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-xs bg-white">
          <div className="bg-sky-50/70 px-4 py-3 border-b border-sky-100 flex items-center justify-between">
            <span className="text-xs font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-sky-600" />
              Bảng linh kiện cấu hình PC ({items.length} thành phần)
            </span>
            <span className="text-xs text-sky-600 font-medium">Bảo hành linh kiện chính hãng</span>
          </div>
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-700 font-bold uppercase text-left border-b border-gray-200">
                <th className="px-4 py-3 w-28 sm:w-36">Linh kiện</th>
                <th className="px-4 py-3">Tên sản phẩm chi tiết</th>
                <th className="px-4 py-3 w-28 sm:w-36 text-center">Bảo hành</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-sky-50/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900 uppercase">
                    <span className="inline-block px-2.5 py-1 rounded-md bg-gray-100 text-gray-800 text-xs font-bold">
                      {item.key}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-medium leading-relaxed">
                    {item.productId ? (
                      <div className="flex items-center gap-2">
                        <span className="text-blue-600 font-semibold">{item.name}</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-200">
                          ID: #{item.productId}
                        </span>
                      </div>
                    ) : (
                      item.name
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600 text-xs font-medium">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      {item.warranty || 'Chính hãng'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-xs bg-white">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <span className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
            {activeMode === 'LAPTOP' ? <Laptop className="w-4 h-4 text-indigo-600" /> : <Layers className="w-4 h-4 text-blue-600" />}
            {activeMode === 'LAPTOP' ? 'Thông số kỹ thuật Laptop' : 'Bảng thông số kỹ thuật chi tiết'}
          </span>
          <span className="text-xs text-gray-500 font-medium">{items.length} mục thông số</span>
        </div>
        <table className="w-full text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50/80 text-gray-700 font-bold uppercase text-left border-b border-gray-200">
              <th className="px-4 py-3 w-1/3 sm:w-1/4">Thông số</th>
              <th className="px-4 py-3">Giá trị chi tiết</th>
              {items.some((i) => i.warranty) && <th className="px-4 py-3 w-28 text-center">Bảo hành</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                <td className="px-4 py-3 font-semibold text-gray-800">
                  {item.key}
                </td>
                <td className="px-4 py-3 text-gray-700 font-medium leading-relaxed whitespace-pre-wrap">
                  {item.name}
                </td>
                {items.some((i) => i.warranty) && (
                  <td className="px-4 py-3 text-center text-xs text-gray-600">
                    {item.warranty && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {item.warranty}
                      </span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // =========================================================================
  // EDIT / FORM MODE
  // =========================================================================
  return (
    <div className="space-y-4">
      {/* Unified Top Header: Category Auto-sync & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-sky-50/80 to-indigo-50/80 border border-blue-200/80 shadow-2xs">
        <div className="flex items-center gap-2.5 text-xs text-blue-900">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            {activeMode === 'PC' ? (
              <Cpu className="w-4 h-4" />
            ) : activeMode === 'LAPTOP' ? (
              <Laptop className="w-4 h-4" />
            ) : (
              <Layers className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-gray-600 font-medium">Mẫu thông số theo danh mục:</span>
              <span className="font-bold text-blue-700 bg-white/90 px-2.5 py-0.5 rounded-lg border border-blue-200 shadow-3xs">
                {categoryName || 'Mặc định'}
              </span>
              {activeMode === 'COMPONENT' && categorySpecInfo.template && (
                <span className="text-gray-500 text-[11px]">
                  ({categorySpecInfo.template.name})
                </span>
              )}
              {activeMode === 'LAPTOP' && (
                <span className="text-indigo-600 font-semibold text-[11px]">(Mẫu chuẩn Laptop)</span>
              )}
              {activeMode === 'PC' && (
                <span className="text-sky-600 font-semibold text-[11px]">(Mẫu 9 linh kiện PC)</span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Form tự động điều chỉnh theo danh mục sản phẩm đã chọn
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              if (activeMode === 'LAPTOP') {
                applyLaptopTemplate();
              } else if (activeMode === 'PC') {
                const pcItems = PC_STANDARD_PARTS.map((p) => ({
                  key: p.key,
                  name: '',
                  warranty: p.defaultWarranty,
                }));
                emitChanges(pcItems);
              } else if (categorySpecInfo.template) {
                applyTemplate(categorySpecInfo.template);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 text-xs font-semibold transition-all shadow-3xs active:scale-95 cursor-pointer"
            title="Khôi phục lại các trường thông số chuẩn của danh mục này"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Tải lại mẫu chuẩn
          </button>

          {/* Raw JSON toggle */}
          <button
            type="button"
            onClick={() => setIsRawMode(!isRawMode)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-3xs cursor-pointer ${
              isRawMode
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
            title="Chuyển đổi xem dạng JSON thô"
          >
            <Code className="w-3.5 h-3.5" />
            {isRawMode ? 'Form nhập liệu' : 'JSON thô'}
          </button>
        </div>
      </div>

      {/* RAW JSON MODE */}
      {isRawMode ? (
        <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <Code className="w-4 h-4 text-blue-600" />
              Chỉnh sửa định dạng JSON hoặc Văn bản thuần
            </label>
            <span className="text-[11px] text-gray-500">Được tự động đồng bộ khi chuyển chế độ</span>
          </div>
          <textarea
            rows={12}
            value={rawText}
            onChange={(e) => handleApplyRawJson(e.target.value)}
            placeholder='[\n  { "key": "CPU", "name": "Intel Core i5-13400F", "productId": "12", "warranty": "36 Tháng" }\n]'
            className="w-full px-4 py-3 rounded-xl border border-gray-300 font-mono text-xs text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 leading-relaxed"
          />
        </div>
      ) : activeMode === 'PC' ? (
        /* ========================================================================= */
        /* PC MODE: CHỌN LINH KIỆN TỪ DANH SÁCH SẢN PHẨM                            */
        /* (cpu, mainboard, ram, ssd, hdd, psu, case, cooler, casefan)               */
        /* ========================================================================= */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-100 flex items-start gap-3">
            <Cpu className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-sky-900 uppercase tracking-wider">
                Cấu hình linh kiện bộ PC (Chọn từ danh sách sản phẩm)
              </h4>
              <p className="text-xs text-sky-700 mt-0.5 leading-relaxed">
                Các linh kiện được chọn sẽ tự động liên kết tới sản phẩm trong cửa hàng (có ID, tên và bảo hành). Khách hàng có thể bấm vào để xem chi tiết từng linh kiện.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {PC_STANDARD_PARTS.map((part) => {
              const selectedItem = items.find((i) => i.key.toUpperCase() === part.key.toUpperCase());
              const isSelected = Boolean(selectedItem && selectedItem.name);

              return (
                <div
                  key={part.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-white border-blue-200 shadow-xs ring-1 ring-blue-500/10'
                      : 'bg-gray-50/60 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Slot Info */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {part.key.slice(0, 3)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900 uppercase">{part.label}</span>
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" /> Đã chọn
                            </span>
                          )}
                        </div>
                        {isSelected ? (
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-blue-700">{selectedItem?.name}</span>
                            {selectedItem?.productId && (
                              <span className="text-[11px] font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-200">
                                SKU/ID: #{selectedItem.productId}
                              </span>
                            )}
                            {selectedItem?.productPrice && selectedItem.productPrice > 0 && (
                              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {selectedItem.productPrice.toLocaleString('vi-VN')} đ
                              </span>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 mt-0.5">Chưa chọn linh kiện cho phần này</p>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions & Warranty */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {isSelected ? (
                        <>
                          <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-xl">
                            <ShieldCheck className="w-3.5 h-3.5 text-gray-500" />
                            <input
                              type="text"
                              value={selectedItem?.warranty || part.defaultWarranty}
                              onChange={(e) => handleUpdateSlotWarranty(part.key, e.target.value)}
                              placeholder="36 Tháng"
                              title="Thời hạn bảo hành"
                              className="w-20 text-xs text-gray-800 bg-transparent font-medium focus:outline-none"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setPickerSlotKey(part.key);
                              setPickerSlotLabel(part.label);
                              setSearchKeyword('');
                              setManualInputName(selectedItem?.name || '');
                              setManualInputWarranty(selectedItem?.warranty || part.defaultWarranty);
                            }}
                            className="px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            Đổi linh kiện
                          </button>

                          <button
                            type="button"
                            onClick={() => handleRemoveSlot(part.key)}
                            className="p-1.5 rounded-xl border border-gray-200 text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Xóa linh kiện này khỏi cấu hình"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setPickerSlotKey(part.key);
                            setPickerSlotLabel(part.label);
                            setSearchKeyword('');
                            setManualInputName('');
                            setManualInputWarranty(part.defaultWarranty);
                          }}
                          className="px-3.5 py-1.5 rounded-xl border border-dashed border-blue-300 bg-white hover:bg-blue-50/70 text-blue-600 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Chọn {part.key}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add extra custom component button for PC */}
          <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-500">Cần thêm linh kiện phụ (quạt phụ, màn hình kèm, tai nghe)?</span>
            <button
              type="button"
              onClick={() => {
                const customKey = prompt('Nhập tên mã linh kiện bổ sung (Ví dụ: Fan Case 2, Màn hình kèm):', 'Linh kiện kèm theo');
                if (customKey && customKey.trim()) {
                  setPickerSlotKey(customKey.trim());
                  setPickerSlotLabel(customKey.trim());
                  setSearchKeyword('');
                  setManualInputName('');
                  setManualInputWarranty('12 Tháng');
                }
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Thêm linh kiện khác
            </button>
          </div>
        </div>
      ) : activeMode === 'LAPTOP' ? (
        /* ========================================================================= */
        /* LAPTOP MODE: NHẬP TRỰC TIẾP THÔNG SỐ CẤU HÌNH                            */
        /* (Không chọn từ danh sách sản phẩm)                                        */
        /* ========================================================================= */
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <Laptop className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                  Cấu hình chi tiết Laptop (Nhập thông số trực tiếp)
                </h4>
                <p className="text-xs text-indigo-700 mt-0.5 leading-relaxed">
                  Nhập thông tin vi xử lý, RAM, ổ cứng, màn hình, pin và các tính năng của Laptop. Không cần chọn từ danh sách sản phẩm.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={applyLaptopTemplate}
              className="shrink-0 px-3 py-1.5 rounded-xl border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50 text-xs font-semibold flex items-center gap-1 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Áp dụng mẫu chuẩn Laptop
            </button>
          </div>

          <div className="space-y-2.5">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 p-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all items-center"
              >
                <div className="col-span-12 sm:col-span-3">
                  <input
                    type="text"
                    value={item.key}
                    onChange={(e) => handleUpdateItem(idx, 'key', e.target.value)}
                    placeholder="Tên thông số"
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
                <div className="col-span-10 sm:col-span-8">
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                    placeholder="Nhập giá trị chi tiết cấu hình..."
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Xóa thông số này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => handleAddItem('', '', '24 Tháng')}
            className="w-full py-2.5 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 hover:bg-indigo-50 text-indigo-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Thêm trường thông số cấu hình Laptop
          </button>
        </div>
      ) : (
        /* ========================================================================= */
        /* COMPONENT MODE: CÁC MẪU LINH KIỆN KHÁC (VGA, RAM, SSD, CPU, MAIN, ...)   */
        /* (Người dùng có thể chọn mẫu và tùy chỉnh sau)                             */
        /* ========================================================================= */
        <div className="space-y-4">


          {/* Fields list */}
          <div className="space-y-2.5">
            {items.map((item, idx) => {
              const fieldDef = currentComponentTemplate?.fields.find(
                (f) => f.key.toLowerCase().trim() === item.key.toLowerCase().trim()
              );
              const hasOptions = !!(fieldDef?.options && fieldDef.options.length > 0);
              const isCustom = !!customModeFields[item.key];

              return (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 p-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all items-center"
                >
                  <div className="col-span-12 sm:col-span-4">
                    <input
                      type="text"
                      value={item.key}
                      onChange={(e) => handleUpdateItem(idx, 'key', e.target.value)}
                      placeholder="Tên thông số kỹ thuật"
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-800 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  </div>
                  <div className="col-span-10 sm:col-span-7">
                    {hasOptions && !isCustom ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <select
                          value={item.name}
                          onChange={(e) => {
                            if (e.target.value === '__custom__') {
                              setCustomModeFields((prev) => ({ ...prev, [item.key]: true }));
                            } else {
                              handleUpdateItem(idx, 'name', e.target.value);
                            }
                          }}
                          className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 cursor-pointer"
                        >
                          <option value="">
                            -- {fieldDef?.placeholder || `Chọn ${fieldDef?.label || item.key}`} --
                          </option>
                          {fieldDef?.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                          {item.name && !fieldDef?.options?.includes(item.name) && (
                            <option value={item.name}>{item.name}</option>
                          )}
                          <option value="__custom__">✏️ Nhập giá trị khác (Tự do)...</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setCustomModeFields((prev) => ({ ...prev, [item.key]: true }))}
                          className="p-2 rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors shrink-0"
                          title="Nhập giá trị tùy chỉnh tự do"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : hasOptions && isCustom ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                          placeholder={fieldDef?.placeholder || 'Nhập giá trị tùy chỉnh...'}
                          className="flex-1 px-3 py-2 rounded-lg border border-emerald-300 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setCustomModeFields((prev) => ({ ...prev, [item.key]: false }))}
                          className="px-2.5 py-2 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200 text-xs font-medium flex items-center gap-1 transition-colors shrink-0"
                          title="Chuyển về chọn từ danh sách"
                        >
                          <ListFilter className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Chọn</span>
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                        placeholder={fieldDef?.placeholder || 'Giá trị thông số...'}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                      />
                    )}
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-2 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Xóa trường này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => handleAddItem('', '', '36 Tháng')}
            className="w-full py-2.5 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50 text-emerald-600 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Thêm thông số kỹ thuật mới
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CHỌN LINH KIỆN TỪ DANH SÁCH CHO PC                                  */}
      {/* ========================================================================= */}
      {pickerSlotKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-sky-50/70">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-sky-600" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Chọn linh kiện cho: <span className="text-sky-600 uppercase">{pickerSlotLabel}</span>
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">Tìm kiếm và chọn từ danh mục sản phẩm của hệ thống</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPickerSlotKey(null)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => handleSearchRemoteProducts(e.target.value)}
                  placeholder={`Tìm kiếm tên hoặc mã SKU linh kiện (${pickerSlotKey})...`}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-2xs"
                  autoFocus
                />
                {isSearchingRemote && (
                  <RefreshCw className="w-4 h-4 text-blue-500 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
                )}
              </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-gray-100 max-h-[420px]">
              {filteredAvailableProducts.length > 0 ? (
                filteredAvailableProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-blue-50/40 p-2 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 shrink-0 overflow-hidden flex items-center justify-center">
                        {prod.image ? (
                          <img src={prod.image} alt={prod.name} className="w-full h-full object-contain" />
                        ) : (
                          <Package className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900 group-hover:text-blue-600 truncate transition-colors">
                            {prod.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {prod.sku && (
                            <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                              SKU: {prod.sku}
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-gray-400">ID: #{prod.id}</span>
                          {prod.price > 0 && (
                            <span className="text-xs font-bold text-emerald-600">
                              {Number(prod.price).toLocaleString('vi-VN')} đ
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectProductForSlot(pickerSlotKey, prod)}
                      className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-2xs shrink-0 flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Chọn
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-gray-600">Không tìm thấy sản phẩm phù hợp</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Bạn có thể tự gõ tên linh kiện ở phần bên dưới nếu chưa có sản phẩm trong hệ thống.
                  </p>
                </div>
              )}
            </div>

            {/* Footer / Manual Input Alternative */}
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex flex-col gap-2.5">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Hoặc tự nhập tên linh kiện (nếu chưa có trong hệ thống):
              </span>
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  value={manualInputName}
                  onChange={(e) => setManualInputName(e.target.value)}
                  placeholder={`Tên linh kiện (${pickerSlotKey})...`}
                  className="flex-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <input
                  type="text"
                  value={manualInputWarranty}
                  onChange={(e) => setManualInputWarranty(e.target.value)}
                  placeholder="36 Tháng"
                  className="w-full sm:w-28 px-3 py-2 rounded-xl border border-gray-200 text-xs text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <button
                  type="button"
                  onClick={() => handleSaveManualSlot(pickerSlotKey)}
                  disabled={!manualInputName.trim()}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-900 disabled:opacity-40 text-white text-xs font-bold transition-all shrink-0"
                >
                  Lưu nhập tay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
