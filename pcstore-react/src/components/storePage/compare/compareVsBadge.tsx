import React from 'react';
import { ArrowLeftRight } from 'lucide-react';

interface CompareVsBadgeProps {
    onSwap: () => void;
    disabled?: boolean;
}

export const CompareVsBadge: React.FC<CompareVsBadgeProps> = ({ onSwap, disabled = false }) => {
    return (
        <div className="flex flex-col items-center justify-center text-center space-y-2 py-4 md:py-0 border-y md:border-y-0 md:border-x border-gray-100">
            <button
                onClick={onSwap}
                disabled={disabled}
                className="w-14 h-14 bg-gradient-to-br from-red-600 to-blue-600 rounded-full text-white flex flex-col items-center justify-center font-black shadow-lg hover:scale-110 active:scale-95 transition-transform group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Bấm để đổi vị trí 2 sản phẩm"
            >
                <span className="text-sm leading-none">VS</span>
                <ArrowLeftRight className="w-3.5 h-3.5 mt-0.5 group-hover:rotate-180 transition-transform duration-300" />
            </button>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Đổi vị trí</span>
        </div>
    );
};

export default CompareVsBadge;
