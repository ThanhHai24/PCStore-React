import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../../components/storePage/builder/modal';
import ItemDrive from '../../../components/storePage/builder/itemDrive';
import { AlertTriangle, CheckCircle2, Image, Printer, RotateCcw, Sheet, ShoppingCart, Zap, Loader2 } from 'lucide-react';
import type { BuilderProduct } from '../../../data/builderProducts';
import { fetchApiBuilderProducts } from '../../../utils/pcBuilderApiAdapter';
import { useCart } from '../../../context/CartContext';
import type { Product } from '../../../types/product';
import {
    calculateRecommendedPsu,
    calculateTotalTdp,
    validatePcBuild,
    getMaxProductQuantity,
    getMaxRamQuantity,
} from '../../../utils/pcBuilderValidator';

const driveItems = [
    { index: 1, title: 'CPU - Bộ Vi Xử Lý', description: 'Chọn CPU - Bộ Vi Xử Lý', specialOffer: 'Sale CPU sập sàn' },
    { index: 2, title: 'Main - Bo Mạch Chủ', description: 'Chọn Main- Bo Mạch Chủ' },
    { index: 3, title: 'RAM - Bộ Nhớ Trong', description: 'Chọn RAM - Bộ Nhớ Trong' },
    { index: 4, title: 'VGA - Card Màn Hình', description: 'Chọn VGA - Card Màn Hình', specialOffer: 'Giảm đến 57%' },
    { index: 5, title: 'SSD - Ổ Cứng SSD', description: 'Chọn SSD - Ổ Cứng SSD' },
    { index: 6, title: 'HDD - Ổ Cứng HDD', description: 'Chọn HDD - Ổ Cứng HDD' },
    { index: 7, title: 'PSU - Nguồn Máy Tính', description: 'Chọn PSU - Nguồn Máy Tính' },
    { index: 8, title: 'Tản Nhiệt CPU', description: 'Chọn Tản Nhiệt CPU' },
    { index: 9, title: 'Case - Vỏ Máy Tính', description: 'Chọn Case - Vỏ Máy Tính' },
    { index: 10, title: 'Fan Tản nhiệt', description: 'Chọn Fan Tản nhiệt' },
];

export const BuildPc: React.FC = () => {
    const navigate = useNavigate();
    const { addToCart } = useCart();

    // Toast state
    const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'warning' | 'error' }>({
        show: false,
        message: '',
        type: 'success',
    });

    const showToast = (message: string, type: 'success' | 'warning' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => {
            setToast((prev) => ({ ...prev, show: false }));
        }, 3000);
    };

    // Multi-configuration slots (Configs 1 to 5)
    const [configs, setConfigs] = useState<
        Record<number, Record<number, { product: BuilderProduct; quantity: number }>>
    >({
        1: {},
        2: {},
        3: {},
        4: {},
        5: {},
    });
    const [activeConfigId, setActiveConfigId] = useState<number>(1);

    const selectedItems = configs[activeConfigId] || {};

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);

    // API builder products state
    const [builderProducts, setBuilderProducts] = useState<BuilderProduct[]>([]);

    useEffect(() => {
        fetchApiBuilderProducts().then((products) => {
            setBuilderProducts(products);
        });
    }, []);

    const handleSwitchConfig = (configId: number) => {
        setActiveConfigId(configId);
    };

    const handleOpenModal = (slotIndex: number) => {
        setActiveSlotIndex(slotIndex);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setActiveSlotIndex(null);
    };

    const handleSelectProduct = (product: BuilderProduct) => {
        if (activeSlotIndex !== null) {
            const maxInfo = getMaxProductQuantity(product, activeSlotIndex, selectedItems);
            if (maxInfo.maxQty <= 0) {
                if (maxInfo.ramLimit !== undefined && maxInfo.ramLimit <= 0) {
                    showToast(`Không thể chọn bộ RAM này vì vượt quá số khe cắm trên Bo mạch chủ!`, 'warning');
                } else {
                    showToast(`Sản phẩm này hiện đã hết hàng!`, 'warning');
                }
                return;
            }

            setConfigs((prev) => {
                const currentConfig = { ...(prev[activeConfigId] || {}) };
                const existingQty = currentConfig[activeSlotIndex]?.quantity || 1;
                const finalQty = Math.min(existingQty, maxInfo.maxQty);

                currentConfig[activeSlotIndex] = {
                    product,
                    quantity: finalQty,
                };

                // If Mainboard changed (slotIndex === 2), auto-adjust existing RAM (slotIndex === 3)
                if (activeSlotIndex === 2 && currentConfig[3]) {
                    const ramItem = currentConfig[3];
                    const newMaxRamQty = getMaxRamQuantity(ramItem.product, product);
                    if (newMaxRamQty <= 0) {
                        delete currentConfig[3];
                        showToast(`Đã bỏ RAM khỏi cấu hình do Bo mạch chủ mới không phù hợp khe RAM!`, 'warning');
                    } else if (ramItem.quantity > newMaxRamQty) {
                        currentConfig[3] = {
                            ...ramItem,
                            quantity: newMaxRamQty,
                        };
                        showToast(`Đã tự động chỉnh số lượng RAM xuống ${newMaxRamQty} bộ cho khớp khe cắm trên Bo mạch chủ!`, 'warning');
                    }
                }

                return {
                    ...prev,
                    [activeConfigId]: currentConfig,
                };
            });
        }
    };

    const handleUpdateQuantity = (slotIndex: number, quantity: number) => {
        setConfigs((prev) => {
            const currentConfig = prev[activeConfigId] || {};
            const targetItem = currentConfig[slotIndex];
            if (!targetItem) return prev;

            const maxInfo = getMaxProductQuantity(targetItem.product, slotIndex, currentConfig);
            let validQty = quantity;

            if (quantity > maxInfo.maxQty) {
                validQty = maxInfo.maxQty;
                if (maxInfo.ramLimit !== undefined && quantity > maxInfo.ramLimit) {
                    showToast(`Số lượng RAM không được vượt quá số khe cắm trên Bo mạch chủ (Tối đa ${maxInfo.ramLimit} bộ)!`, 'warning');
                } else if (quantity > maxInfo.stockLimit) {
                    showToast(`Số lượng không được vượt quá số lượng tồn kho (Tối đa ${maxInfo.stockLimit} sản phẩm)!`, 'warning');
                }
            }

            return {
                ...prev,
                [activeConfigId]: {
                    ...currentConfig,
                    [slotIndex]: {
                        ...targetItem,
                        quantity: Math.max(1, validQty),
                    },
                },
            };
        });
    };

    const handleRemoveItem = (slotIndex: number) => {
        setConfigs((prev) => {
            const currentConfig = { ...(prev[activeConfigId] || {}) };
            delete currentConfig[slotIndex];
            return {
                ...prev,
                [activeConfigId]: currentConfig,
            };
        });
    };

    const handleReset = () => {
        setConfigs((prev) => ({
            ...prev,
            [activeConfigId]: {},
        }));
    };

    // Add active configuration items to Cart & redirect
    const handleAddToCart = () => {
        const itemsList = Object.values(selectedItems);
        if (itemsList.length === 0) {
            showToast(`Vui lòng chọn ít nhất 1 linh kiện trong Cấu hình ${activeConfigId} trước khi thêm vào giỏ hàng!`, 'warning');
            return;
        }

        itemsList.forEach(({ product, quantity }) => {
            const cartProduct: Product = {
                id: String(product.id),
                title: product.title,
                images: product.image ? [product.image] : [],
                price: `${product.price.toLocaleString('vi-VN')}đ`,
                numericPrice: product.price,
                marketPrice: product.marketPrice ? `${product.marketPrice.toLocaleString('vi-VN')}đ` : undefined,
                discountPercent: product.discountPercent,
                inStock: product.stockStatus === 'Còn hàng',
                warrantyInfo: product.warranty || '36 tháng',
                rating: 5,
                reviewCount: 0,
                viewCount: 0,
                commentCount: 0,
                purchaseCount: 0,
                promotions: [],
                specsTable: [],
            };
            addToCart(cartProduct, quantity);
        });

        showToast(`Đã thêm ${itemsList.length} linh kiện của Cấu hình ${activeConfigId} vào giỏ hàng! Đang chuyển hướng...`, 'success');

        // Redirect to cart page after short delay
        setTimeout(() => {
            navigate('/cart');
            window.scrollTo({ top: 0, behavior: 'instant' });
        }, 1000);
    };

    // Export Excel CSV
    const handleExportExcel = () => {
        const itemsList = Object.values(selectedItems);
        if (itemsList.length === 0) {
            showToast(`Chưa có linh kiện nào trong Cấu hình ${activeConfigId} để xuất Excel!`, 'warning');
            return;
        }
        let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
        csvContent += 'STT,Tên linh kiện,Mã sản phẩm,Bảo hành,Số lượng,Đơn giá (VNĐ),Thành tiền (VNĐ)\n';
        itemsList.forEach(({ product, quantity }, idx) => {
            const line = `${idx + 1},"${product.title.replace(/"/g, '""')}","${product.productCode}","${product.warranty || ''}",${quantity},${product.price},${product.price * quantity}`;
            csvContent += line + '\n';
        });
        csvContent += `,,,,,,TỔNG CỘNG: ${totalCost.toLocaleString('vi-VN')} VNĐ\n`;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `PC_Builder_CauHinh_${activeConfigId}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Print view
    const handlePrint = () => {
        window.print();
    };

    const totalCost = Object.values(selectedItems).reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
    );

    // Validate hardware compatibility
    const compatibilityIssues = validatePcBuild(selectedItems);
    const totalTdp = calculateTotalTdp(selectedItems);
    const recommendedPsu = calculateRecommendedPsu(selectedItems);

    // Group issues by slotIndex for ItemDrive mapping
    const slotIssuesMap: Record<number, string[]> = {};
    compatibilityIssues.forEach((issue) => {
        issue.affectedSlots.forEach((slot) => {
            if (!slotIssuesMap[slot]) slotIssuesMap[slot] = [];
            if (!slotIssuesMap[slot].includes(issue.message)) {
                slotIssuesMap[slot].push(issue.message);
            }
        });
    });

    const activeSlot = driveItems.find((item) => item.index === activeSlotIndex);
    const filteredProducts = activeSlotIndex
        ? builderProducts.filter((p) => p.slotIndex === activeSlotIndex)
        : [];

    return (
        <div className="max-w-[1250px] mx-auto px-4 py-6 space-y-6">
            <div className="build-pc-content text-[#464646]">
                <div className="banner-swiper">
                    <div className="swiper-wrapper">
                        <div className="item">
                            <a href="">
                                <img src="src/assets/images/builderbanner/1.jpg" alt="" />
                            </a>
                        </div>
                        <div className="item">
                            <a href="">
                                <img src="src/assets/images/builderbanner/2.jpg" alt="" />
                            </a>
                        </div>
                    </div>
                </div>
                <h1 className="text-[30px] mb-[10px] leading-[36px] text-center font-[500]">
                    Build PC - Xây dựng cấu hình máy tính PC giá rẻ dễ dàng
                </h1>
                <h2 className="text-[26px] leading-[30px] mb-[10px] font-[500]">
                    Chọn linh kiện xây dựng cấu hình - Tự build PC
                </h2>
                <ul className="list-btn-action flex flex-wrap gap-[5px] mb-4">
                    {[1, 2, 3, 4, 5].map((configNum) => {
                        const count = Object.keys(configs[configNum] || {}).length;
                        const isActive = activeConfigId === configNum;
                        return (
                            <li key={configNum} className="text-[16px] text-white font-bold text-center py-0.5">
                                <span
                                    onClick={() => handleSwitchConfig(configNum)}
                                    className={`${isActive
                                        ? 'bg-[#ff9f00] font-extrabold shadow-md'
                                        : 'bg-[#0f5b99] hover:bg-[#0c4a7d]'
                                        } transition-all block uppercase leading-[40px] text-[14px] px-[20px] rounded-sm cursor-pointer`}
                                >
                                    Cấu hình {configNum} {count > 0 && `(${count})`}
                                </span>
                            </li>
                        );
                    })}
                </ul>
                <ul className="actions flex gap-[5px] mb-4">
                    <li className="text-[16px] text-white font-bold text-center py-0.5">
                        <span
                            onClick={handleReset}
                            className="bg-[#0f5b99] hover:bg-[#0c4a7d] transition-colors block uppercase leading-[40px] text-[14px] px-[20px] rounded-sm cursor-pointer flex items-center gap-1"
                        >
                            Làm mới <RotateCcw size={19} />
                        </span>
                    </li>
                </ul>

                {/* System Power & Compatibility Status Bar */}
                <div className="mb-4 space-y-2">
                    {/* Compatibility Alert Banner */}
                    {compatibilityIssues.length > 0 ? (
                        <div className="bg-red-50 border-l-4 border-red-600 p-4 rounded shadow-sm">
                            <div className="flex items-center gap-2 text-red-800 font-bold text-base mb-1">
                                <AlertTriangle size={20} className="text-red-600 shrink-0" />
                                <span>Cảnh báo không tương thích ({compatibilityIssues.length} lỗi):</span>
                            </div>
                            <ul className="list-disc list-inside space-y-1 pl-1 text-sm text-red-700 font-medium">
                                {compatibilityIssues.map((issue) => (
                                    <li key={issue.id}>
                                        <span className="font-bold text-red-800">[{issue.ruleName}]:</span> {issue.message}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : Object.keys(selectedItems).length > 0 ? (
                        <div className="bg-emerald-50 border border-emerald-300 p-3 rounded text-emerald-800 flex items-center gap-2 font-medium text-sm">
                            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                            <span>Cấu hình hoàn toàn tương thích! Các linh kiện hoạt động tốt cùng nhau.</span>
                        </div>
                    ) : null}

                    {/* Stats Bar */}
                    {Object.keys(selectedItems).length > 0 && (
                        <div className="bg-gray-100 p-3 rounded border border-gray-300 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-gray-700">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1">
                                    <Zap size={16} className="text-amber-500" />
                                    Tổng công suất tiêu thụ (TDP): <strong className="text-black text-sm">{totalTdp}W</strong>
                                </span>
                                <span className="text-gray-400">|</span>
                                <span>
                                    Công suất nguồn đề xuất: <strong className="text-[#0f5b99] text-sm">≥ {recommendedPsu}W</strong>
                                </span>
                            </div>
                            <div className="text-gray-500">
                                Đã chọn: <span className="font-bold text-black">{Object.keys(selectedItems).length}</span> linh kiện
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end mb-4">
                    <p className="text-[18px] text-[#d00] font-semibold">
                        Chi phí dự tính: <span>{totalCost.toLocaleString('vi-VN')} đ</span>
                    </p>
                </div>

                <div className="list-drive list-none border border-[#e1e1e1] clear-both">
                    {driveItems.map((item) => {
                        const selectedProd = selectedItems[item.index]?.product;
                        const maxQty = selectedProd
                            ? getMaxProductQuantity(selectedProd, item.index, selectedItems).maxQty
                            : 99;

                        return (
                            <ItemDrive
                                key={item.index}
                                index={item.index}
                                title={item.title}
                                description={item.description}
                                specialOffer={item.specialOffer}
                                selectedProduct={selectedProd}
                                quantity={selectedItems[item.index]?.quantity}
                                maxQuantity={maxQty}
                                issues={slotIssuesMap[item.index] || []}
                                onOpenModal={() => handleOpenModal(item.index)}
                                onUpdateQuantity={(qty) => handleUpdateQuantity(item.index, qty)}
                                onRemoveItem={() => handleRemoveItem(item.index)}
                            />
                        );
                    })}
                </div>

                <div className="flex justify-end my-4">
                    <p className="text-[18px] text-[#d00] font-semibold">
                        Chi phí dự tính: <span>{totalCost.toLocaleString('vi-VN')} đ</span>
                    </p>
                </div>

                <ul className="list-btn-action flex flex-wrap gap-3">
                    <li>
                        <span
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-[#0f5b99] hover:bg-[#0c4a7d] text-white py-2 px-4 rounded text-sm font-semibold cursor-pointer transition-colors"
                        >
                            Tải ảnh cấu hình
                            <Image size={18} />
                        </span>
                    </li>
                    <li>
                        <span
                            onClick={handleExportExcel}
                            className="flex items-center gap-2 bg-[#0f5b99] hover:bg-[#0c4a7d] text-white py-2 px-4 rounded text-sm font-semibold cursor-pointer transition-colors"
                        >
                            Tải file Excel cấu hình
                            <Sheet size={18} />
                        </span>
                    </li>
                    <li>
                        <span
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-[#0f5b99] hover:bg-[#0c4a7d] text-white py-2 px-4 rounded text-sm font-semibold cursor-pointer transition-colors"
                        >
                            Xem & In
                            <Printer size={18} />
                        </span>
                    </li>
                    <li>
                        <span
                            onClick={handleAddToCart}
                            className="flex items-center gap-2 bg-[#d00] hover:bg-[#b00] text-white py-2 px-4 rounded text-sm font-semibold cursor-pointer transition-colors shadow-sm"
                        >
                            Thêm vào giỏ hàng
                            <ShoppingCart size={18} />
                        </span>
                    </li>
                </ul>
            </div>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                categoryTitle={activeSlot ? activeSlot.description : 'Chọn linh kiện'}
                products={filteredProducts}
                activeSlotIndex={activeSlotIndex}
                selectedItems={selectedItems}
                onSelectProduct={handleSelectProduct}
            />

            {/* Toast Notification Popup */}
            {toast.show && (
                <div className={`fixed top-24 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center space-x-3.5 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-300 max-w-md ${toast.type === 'success'
                    ? 'bg-gray-900/95 text-white border-emerald-500/50 shadow-emerald-950/20'
                    : toast.type === 'warning'
                        ? 'bg-amber-900/95 text-white border-amber-500/50 shadow-amber-950/20'
                        : 'bg-red-900/95 text-white border-red-500/50 shadow-red-950/20'
                    }`}>
                    {toast.type === 'success' && (
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 border border-emerald-500/40">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                    )}
                    {toast.type === 'warning' && (
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 border border-amber-500/40">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                        </div>
                    )}
                    <div className="flex-1 leading-snug">{toast.message}</div>
                    {toast.type === 'success' && (
                        <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                    )}
                </div>
            )}
        </div>
    );
};

export default BuildPc;


