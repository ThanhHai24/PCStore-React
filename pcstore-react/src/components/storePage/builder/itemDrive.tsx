import React from 'react';
import { Gift, Plus } from "lucide-react";
import SelectedItem from "./selectedItem";
import type { BuilderProduct } from "../../../data/builderProducts";

interface ItemDriveProps {
    index: number;
    title: string;
    description: string;
    specialOffer?: string;
    selectedProduct?: BuilderProduct;
    quantity?: number;
    maxQuantity?: number;
    onOpenModal?: () => void;
    onUpdateQuantity?: (qty: number) => void;
    onRemoveItem?: () => void;
}

function ItemDrive({
    index,
    title,
    description,
    specialOffer,
    selectedProduct,
    quantity = 1,
    maxQuantity = 99,
    onOpenModal,
    onUpdateQuantity,
    onRemoveItem,
}: ItemDriveProps) {
    const isEven = index % 2 === 0;
    const bgColor = isEven ? "bg-white" : "bg-[#f9f9f9]";

    return (
        <div className={`item-drive flex border-b border-[#e1e1e1] last:border-b-0 ${bgColor}`}>
            <div className="name-item-drive w-[240px] p-3 border-r border-[#e1e1e1] shrink-0">
                <h3 className="text-[14px] uppercase font-bold text-[#333] mb-1">
                    {index}. {title}
                </h3>
                {specialOffer && (
                    <div className="item-speacial-offer flex items-center gap-1.5 text-[#d00] text-xs font-medium mt-1">
                        <Gift size={15} className="shrink-0 text-[#d00]" />
                        <span>{specialOffer}</span>
                    </div>
                )}
            </div>
            <div className="drive-checked flex-1 p-3 flex items-center">
                {selectedProduct ? (
                    <div className="selected-item w-full">
                        <SelectedItem
                            product={selectedProduct}
                            quantity={quantity}
                            maxQuantity={maxQuantity}
                            onQuantityChange={onUpdateQuantity}
                            onChangeProduct={onOpenModal}
                            onRemove={onRemoveItem}
                        />
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={onOpenModal}
                        className="show-popup-select inline-flex items-center gap-1 bg-[#0f5b99] hover:bg-[#0c4a7d] text-white text-xs font-bold px-3 py-1.5 rounded-[3px] cursor-pointer transition-colors"
                    >
                        <Plus size={15} strokeWidth={3} />
                        <span>{description}</span>
                    </button>
                )}
            </div>
        </div>
    );
}

export default ItemDrive;


