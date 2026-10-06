import React, { useState, useEffect } from 'react';
import { Phone, Mail, ChevronUp, Truck, RefreshCcw, CircleDollarSign, Headphones, MapPin, X } from 'lucide-react';
import MessendgerLogo from "../../../assets/images/facebook_messenger.png";
import ZaloLogo from "../../../assets/images/zalo.png";
import leftbanner from "../../../assets/images/leftbanner.jpg";
import rightbanner from "../../../assets/images/rightbanner.jpg";
import bct from "../../../assets/images/footer-bct.png";
import dmca from "../../../assets/images/dmca-compliant-grayscale.png"

interface ContactBranch {
    id: number;
    name: string;
    image: string;
    address: string;
    mapUrl: string;
    phone: string;
    email: string;
    hours: string;
}

const contactBranches: ContactBranch[] = [
    {
        id: 1,
        name: 'CƠ SỞ HÀ NỘI - 1',
        image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80',
        address: 'Hà Nội',
        mapUrl: 'https://maps.google.com/?q=17+Ha+Ke+Tan+Hanoi',
        phone: '0123.456.789',
        email: 'example@example.com',
        hours: '08:30 - 20:30',
    },
    {
        id: 2,
        name: 'CƠ SỞ HÀ NỘI - 2',
        image: 'https://images.unsplash.com/photo-1526738549149-8e07eca6c147?w=800&auto=format&fit=crop&q=80',
        address: 'Hà Nội',
        mapUrl: 'https://maps.google.com/?q=10+ngo+93+Tran+Thai+Tong+Hanoi',
        phone: '0345.678.901',
        email: 'example@example.com',
        hours: '08:00 - 20:30',
    },
    {
        id: 3,
        name: 'CƠ SỞ HỒ CHÍ MINH',
        image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
        address: 'TP. Hồ Chí Minh',
        mapUrl: 'https://maps.google.com/?q=249+Ly+Thuong+Kiet+HCM',
        phone: '0567.890.123',
        email: 'example@example.com',
        hours: '08:30 - 20:30',
    },
];

export const Footer: React.FC = () => {
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [showLeftBanner, setShowLeftBanner] = useState(true);
    const [showRightBanner, setShowRightBanner] = useState(true);
    const [showChatZalo, setShowChatZalo] = useState(true);
    const [showChatFacebook, setShowChatFacebook] = useState(true);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }

            if (window.scrollY > 100) {
                setIsScrolled(true);
            } else {
                setIsScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <footer className="w-full bg-white text-gray-700 font-sans text-sm border-t border-gray-200 selection:bg-blue-500 selection:text-white">
            <div className="border-b border-gray-200 bg-[#e5e5e5]">
                <div className="max-w-[1250px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
                    <div className="flex items-center gap-3.5 bg-white p-4 rounded-lg shadow-sm h-full">
                        <Truck className="w-10 h-10 text-blue-600 shrink-0" />
                        <div className="text-sm leading-tight">
                            <strong className="block font-bold text-gray-900 mb-0.5">CHÍNH SÁCH GIAO HÀNG</strong>
                            <span className="text-gray-500 text-xs sm:text-sm">Nhận hàng và thanh toán tại nhà</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3.5 bg-white p-4 rounded-lg shadow-sm h-full">
                        <RefreshCcw className="w-10 h-10 text-blue-600 shrink-0" />
                        <div className="text-sm leading-tight">
                            <strong className="block font-bold text-gray-900 mb-0.5">ĐỔI TRẢ DỄ DÀNG</strong>
                            <span className="text-gray-500 text-xs sm:text-sm">1 Đổi 1 trong 15 ngày</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3.5 bg-white p-4 rounded-lg shadow-sm h-full">
                        <CircleDollarSign className="w-10 h-10 text-blue-600 shrink-0" />
                        <div className="text-sm leading-tight">
                            <strong className="block font-bold text-gray-900 mb-0.5">THANH TOÁN TIỆN LỢI</strong>
                            <span className="text-gray-500 text-xs sm:text-sm">Tiền mặt, CK, Trả góp 0%</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3.5 bg-white p-4 rounded-lg shadow-sm h-full">
                        <Headphones className="w-10 h-10 text-blue-600 shrink-0" />
                        <div className="text-sm leading-tight">
                            <strong className="block font-bold text-gray-900 mb-0.5">HỖ TRỢ NHIỆT TÌNH</strong>
                            <span className="text-gray-500 text-xs sm:text-sm">Tư vấn, giải đáp mọi thắc mắc</span>
                        </div>
                    </div>
                </div>
            </div>
            {/* 1. TOP CONTACT BRANCHES SECTION */}
            <div className="bg-[#f7f7f7] border-b border-gray-200 py-6">
                <div className="max-w-[1250px] mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {contactBranches.map((branch) => (
                            <div key={branch.id} className="flex flex-col rounded-none ">
                                {/* Header bar */}
                                <div className="flex items-stretch font-bold text-sm">
                                    <div className="bg-[#fbbb21] text-gray-900 w-8 flex items-center justify-center shrink-0">
                                        {branch.id}
                                    </div>
                                    <div className="bg-[#2563eb] text-white flex-1 px-3 py-1.5 uppercase truncate">
                                        {branch.name}
                                    </div>
                                </div>

                                {/* Branch image */}
                                <div className="w-full h-44 overflow-hidden bg-gray-100 mt-5">
                                    <img
                                        src={branch.image}
                                        alt={branch.name}
                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                                    />
                                </div>

                                {/* Branch info */}
                                <div className="p-3.5 space-y-2 text-xs sm:text-sm text-gray-800">
                                    <div className="flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-gray-700 shrink-0 mt-0.5" />
                                        <div>
                                            <span>{branch.address}</span>
                                            <a
                                                href={branch.mapUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline font-medium block mt-0.5"
                                            >
                                                [ Xem đường đi ]
                                            </a>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-gray-700 shrink-0" />
                                        <span>
                                            Hotline:{' '}
                                            <a
                                                href={`tel:${branch.phone.split('-')[0].trim().replace(/\./g, '')}`}
                                                className="text-blue-600 hover:underline font-semibold"
                                            >
                                                {branch.phone}
                                            </a>
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-gray-700 shrink-0" />
                                        <span>
                                            Email:{' '}
                                            <a
                                                href={`mailto:${branch.email}`}
                                                className="text-blue-600 hover:underline"
                                            >
                                                {branch.email}
                                            </a>
                                        </span>
                                    </div>

                                    <div className="pl-6 text-gray-700">
                                        Giờ mở cửa: {branch.hours}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 2. MAIN FOOTER NAVIGATION (4 COLUMNS) */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {/* COLUMN 1: GIỚI THIỆU NGUYỄN CÔNG */}
                    <div>
                        <h3 className="text-gray-900 font-bold text-base mb-4 uppercase tracking-wide">
                            Giới Thiệu PCStore
                        </h3>
                        <ul className="space-y-2.5 text-black text-sm">
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Giới thiệu công ty
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Thông tin liên hệ
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Tin tức
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Tuyển dụng
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Hệ thống cửa hàng
                                </a>
                            </li>
                        </ul>

                        {/* Social Media & Certification Badges */}
                        <div className="mt-6 space-y-4">
                            {/* Social Icons */}
                            <div className="flex items-center space-x-3">
                                {/* Instagram */}
                                <a
                                    href="#"
                                    aria-label="Instagram"
                                    className="w-9 h-9 rounded bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 flex items-center justify-center text-white hover:opacity-90 transition-opacity shadow-sm"
                                >
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                </a>
                                {/* Facebook */}
                                <a
                                    href="#"
                                    aria-label="Facebook"
                                    className="w-9 h-9 rounded bg-[#1877F2] flex items-center justify-center text-white hover:opacity-90 transition-opacity shadow-sm"
                                >
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                        <path d="M9 8H6v4h3v12h5V12h3.642L18 8h-4V6.333C14 5.374 14.5 5 15.5 5H18V0h-3.808C10.592 0 9 1.583 9 4.615V8z" />
                                    </svg>
                                </a>
                                {/* Youtube */}
                                <a
                                    href="#"
                                    aria-label="Youtube"
                                    className="w-9 h-9 rounded bg-[#FF0000] flex items-center justify-center text-white hover:opacity-90 transition-opacity shadow-sm"
                                >
                                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                    </svg>
                                </a>
                                {/* TikTok */}
                                <a
                                    href="#"
                                    aria-label="TikTok"
                                    className="w-9 h-9 rounded bg-[#000000] flex items-center justify-center text-white hover:opacity-90 transition-opacity shadow-sm"
                                >
                                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-1-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.29 1.76-.22.84-.04 1.77.47 2.47.53.76 1.45 1.21 2.37 1.19 1.17.03 2.27-.64 2.81-1.67.43-.8.47-1.74.47-2.64V.02z" />
                                    </svg>
                                </a>
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2 pt-2 items-center">
                                {/* Bộ Công Thương Badge */}
                                <a href="#" className="inline-block hover:opacity-90 transition-opacity">
                                    <img src={bct} alt="Bộ Công Thương" className='h-16 w-24 object-contain' />
                                </a>

                                {/* DMCA Badge */}
                                <a href="#" className="inline-block hover:opacity-90 transition-opacity">
                                    <img src={dmca} alt="DMCA" className='h-16 w-24 object-contain' />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* COLUMN 2: HỖ TRỢ KHÁCH HÀNG */}
                    <div>
                        <h3 className="text-gray-900 font-bold text-base mb-4 uppercase tracking-wide">
                            Hỗ Trợ Khách Hàng
                        </h3>
                        <ul className="space-y-2.5 text-black text-sm">
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Hướng dẫn mua hàng trực tuyến
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Hướng dẫn thanh toán
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Gửi yêu cầu bảo hành
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Góp ý, Khiếu Nại
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* COLUMN 3: CHÍNH SÁCH CHUNG */}
                    <div>
                        <h3 className="text-gray-900 font-bold text-base mb-4 uppercase tracking-wide">
                            Chính Sách Chung
                        </h3>
                        <ul className="space-y-2.5 text-black text-sm">
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Chính sách, quy định chung
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Chính sách vận chuyển
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Chính sách bảo hành
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Dịch vụ tính phí
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Chính sách nhập lại tính phí
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Chính sách cho doanh nghiệp
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Chính sách bảo mật
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* COLUMN 4: THÔNG TIN KHUYẾN MẠI */}
                    <div>
                        <h3 className="text-gray-900 font-bold text-base mb-4 uppercase tracking-wide">
                            Thông Tin Khuyến Mại
                        </h3>
                        <ul className="space-y-2.5 text-black text-sm">
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Thông tin khuyến mại
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Sản phẩm khuyến mại
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Sản phẩm bán chạy
                                </a>
                            </li>
                            <li>
                                <a href="#" className="hover:text-blue-600 transition-colors">
                                    Sản phẩm mới
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* 3. BOTTOM LEGAL & COMPANY INFO SECTION */}
            <div className="bg-[#efefef] py-6 text-gray-600 text-xs sm:text-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2 text-left">
                    <p className="font-semibold text-gray-700 uppercase">
                        WEBSITE ĐƯỢC SỞ HỮU VÀ QUẢN LÝ BỞI PCSTORE
                    </p>
                    <p className="font-bold text-gray-900">
                        CÔNG TY TNHH MÁY TÍNH PCSTORE
                    </p>
                    <p>
                        Địa chỉ: Hà Nội
                    </p>
                    <p>
                        Mã số thuế: 0123456789 do Sở Kế Hoạch và Đầu Tư TP.Hà Nội
                    </p>
                    <p>
                        Mua hàng:{' '}
                        <a href="tel:0123456789" className="font-semibold text-gray-800 hover:text-blue-600">
                            0123.456.789
                        </a>{' '}
                        -{' '}
                        <a href="tel:0987654321" className="font-semibold text-gray-800 hover:text-blue-600">
                            0987.654.321
                        </a>
                    </p>
                    <p className="leading-relaxed">
                        <span className="font-semibold text-gray-800">GÓP Ý:</span>{' '}
                        <a href="tel:0123456789" className="hover:text-blue-600">0123.456.789</a> -{' '}
                        <a href="tel:0987654321" className="hover:text-blue-600">0987.654.321</a>.{' '}
                        <span>Email: </span>
                        <a href="mailto:info@example.vn" className="text-blue-600 hover:underline">
                            info@example.vn
                        </a>
                        .{' '}
                        <span>Website: </span>
                        <a href="#" target="_self" className="text-blue-600 hover:underline">
                            example.vn
                        </a>
                        .{' '}
                        <span>Fanpage: </span>
                        <a
                            href="https://www.facebook.com/"
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline break-all"
                        >
                            www.facebook.com/PCSTORE
                        </a>
                        .
                    </p>
                </div>
            </div>

            {/* 4. FLOATING WIDGETS (Zalo, Messenger, Scroll to top) */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col space-y-2.5 items-end">
                {/* Chat Zalo widget */}
                {showChatZalo && (
                    <div className="relative group/widget">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                setShowChatZalo(false);
                            }}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-800/80 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-colors z-10"
                            title="Ẩn"
                        >
                            <X className="w-3 h-3" />
                        </button>
                        <a
                            href="#"
                            className="w-[175px] flex items-center space-x-3 bg-white border border-gray-200 text-[#0066ff] px-3.5 py-2 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 group hover:-translate-y-0.5"
                        >
                            <img className="h-10 w-10 object-contain shrink-0" src={ZaloLogo} alt="zalo" />
                            <div className="text-left leading-tight">
                                <div className="text-sm font-bold text-[#0066ff]">
                                    Chat Zalo
                                </div>
                                <div className="text-xs font-medium text-[#0066ff] mt-0.5">(8h-22h30)</div>
                            </div>
                        </a>
                    </div>
                )}

                {/* Chat Facebook widget */}
                {showChatFacebook && (
                    <div className="relative group/widget">
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                setShowChatFacebook(false);
                            }}
                            className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-gray-800/80 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-colors z-10"
                            title="Ẩn"
                        >
                            <X className="w-3 h-3" />
                        </button>
                        <a
                            href="#"
                            className="w-[175px] flex items-center space-x-3 bg-white border border-gray-200 text-[#0066ff] px-3.5 py-2 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 group hover:-translate-y-0.5"
                        >
                            <img className="h-10 w-10 object-contain shrink-0" src={MessendgerLogo} alt="messenger" />
                            <div className="text-left leading-tight">
                                <div className="text-sm font-bold text-[#0066ff]">
                                    Chat Facebook
                                </div>
                                <div className="text-xs font-medium text-[#0066ff] mt-0.5">(8h-22h30)</div>
                            </div>
                        </a>
                    </div>
                )}

                {/* Scroll to Top button */}
                {showScrollTop && (
                    <button
                        onClick={scrollToTop}
                        aria-label="Cuộn lên đầu trang"
                        className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-all duration-200 hover:scale-105 active:scale-95 mt-2"
                    >
                        <ChevronUp className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* 5. FIXED SIDE BANNERS (Flush against screen edges) */}
            <div className="hidden xl:block">
                {/* Left Banner */}
                {showLeftBanner && (
                    <div
                        className={`fixed z-40 transition-all duration-300 ease-in-out left-0 ${isScrolled ? 'top-[80px] -translate-y-0' : 'top-1/2 -translate-y-1/2'
                            }`}
                    >
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                setShowLeftBanner(false);
                            }}
                            className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-gray-900/80 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-colors z-50 group"
                            title="Ẩn"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                        <a href="#">
                            <img
                                src={leftbanner}
                                alt="Left Banner"
                                className="w-[140px] 2xl:w-[150px] h-auto shadow-md hover:scale-105 transition-transform rounded-r-lg"
                            />
                        </a>
                    </div>
                )}

                {/* Right Banner */}
                {showRightBanner && (
                    <div
                        className={`fixed z-40 transition-all duration-300 ease-in-out right-0 ${isScrolled ? 'top-[80px] -translate-y-0' : 'top-1/2 -translate-y-1/2'
                            }`}
                    >
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                setShowRightBanner(false);
                            }}
                            className="absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full bg-gray-900/80 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-colors z-50 group"
                            title="Ẩn"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                        <a href="#">
                            <img
                                src={rightbanner}
                                alt="Right Banner"
                                className="w-[140px] 2xl:w-[150px] h-auto shadow-md hover:scale-105 transition-transform rounded-l-lg"
                            />
                        </a>
                    </div>
                )}
            </div>

        </footer>

    );
};

export default Footer;
