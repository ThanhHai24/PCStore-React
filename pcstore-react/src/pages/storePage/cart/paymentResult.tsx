import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, ShoppingBag, ArrowRight, RefreshCw } from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import { orderService } from '../../../services/orderService';
import { paymentService } from '../../../services/paymentService';

export const PaymentResult: React.FC = () => {
    const [searchParams] = useSearchParams();
    const { clearCart } = useCart();

    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [message, setMessage] = useState('');
    const [gatewayLabel, setGatewayLabel] = useState('ZaloPay Sandbox (QR / ATM)');
    const [displayTxnRef, setDisplayTxnRef] = useState('---');
    const [displayOrderCode, setDisplayOrderCode] = useState<string | null>(null);
    const [displayAmount, setDisplayAmount] = useState<number>(0);

    const vnpResponseCode = searchParams.get('vnp_ResponseCode');
    const vnpTxnRef = searchParams.get('vnp_TxnRef');
    const vnpRawAmount = searchParams.get('vnp_Amount');
    const vnpOrderInfo = searchParams.get('vnp_OrderInfo');

    const zpAppTransId = searchParams.get('apptransid') || searchParams.get('app_trans_id');
    const zpStatus = searchParams.get('status');
    const zpAmount = searchParams.get('amount');

    useEffect(() => {
        let cancelled = false;

        const verifyPayment = async () => {
            // Case 1: ZaloPay Sandbox Return (/payment/zalopay-return)
            if (zpAppTransId || searchParams.get('appid') || zpStatus) {
                setGatewayLabel('ZaloPay Sandbox (QR / Ví / ATM)');
                setDisplayTxnRef(zpAppTransId || '---');
                if (zpAmount) setDisplayAmount(Number(zpAmount) || 0);

                try {
                    const queryObj: Record<string, string> = {};
                    searchParams.forEach((value, key) => {
                        queryObj[key] = value;
                    });

                    // Gọi BE GET /api/payments/zalopay/return để xác thực chữ ký & đồng bộ trạng thái
                    let result = await paymentService.handleZaloPayReturn(queryObj).catch(() => null);

                    // Nếu thiếu hoặc cần truy vấn bổ sung theo appTransId -> gọi GET /api/payments/zalopay/status/{appTransId}
                    if ((!result || result.processing) && zpAppTransId) {
                        const queried = await paymentService.queryZaloPayStatus(zpAppTransId).catch(() => null);
                        if (queried) result = queried;
                    }

                    if (cancelled) return;

                    if (result) {
                        setDisplayTxnRef(result.appTransId || zpAppTransId || '---');
                        setDisplayOrderCode(result.orderCode || null);
                        if (result.amount) setDisplayAmount(result.amount);

                        if (result.paid || String(result.paymentStatus).toUpperCase() === 'SUCCESS') {
                            setSuccess(true);
                            setMessage(result.returnMessage || 'Thanh toán thành công qua ZaloPay Sandbox!');
                            clearCart();
                        } else {
                            setSuccess(false);
                            setMessage(
                                result.returnMessage ||
                                    'Giao dịch ZaloPay chưa hoàn tất hoặc đã bị hủy.'
                            );
                        }
                    } else {
                        setSuccess(false);
                        setMessage('Không thể xác thực kết quả giao dịch với máy chủ ZaloPay.');
                    }
                } catch (err: any) {
                    if (!cancelled) {
                        setSuccess(false);
                        setMessage(err?.message || 'Lỗi xác thực giao dịch ZaloPay.');
                    }
                } finally {
                    if (!cancelled) setLoading(false);
                }
                return;
            }

            // Case 2: Legacy VNPAY Return (/vnpay-return)
            setGatewayLabel('VNPAY Sandbox (QR / ATM)');
            setDisplayTxnRef(vnpTxnRef || '---');
            setDisplayAmount(vnpRawAmount ? Number(vnpRawAmount) / 100 : 0);

            if (!vnpResponseCode || !vnpTxnRef) {
                if (!cancelled) {
                    setSuccess(false);
                    setMessage('Thiếu thông tin xác thực giao dịch từ cổng thanh toán.');
                    setLoading(false);
                }
                return;
            }

            if (vnpResponseCode !== '00') {
                if (!cancelled) {
                    setSuccess(false);
                    setMessage('Thanh toán thất bại hoặc giao dịch bị hủy.');
                    setLoading(false);
                }
                return;
            }

            try {
                const order = await orderService.getOrderByCode(vnpTxnRef).catch(() => null);
                if (cancelled) return;

                if (order && order.status === 'CANCELLED') {
                    setSuccess(false);
                    setMessage('Đơn hàng đã bị hủy trên hệ thống.');
                } else {
                    setSuccess(true);
                    setMessage('Thanh toán thành công qua VNPAY Sandbox!');
                    clearCart();
                }
            } catch {
                if (!cancelled) {
                    setSuccess(false);
                    setMessage('Không thể xác thực trạng thái giao dịch với máy chủ.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        verifyPayment();
        return () => {
            cancelled = true;
        };
    }, [searchParams, zpAppTransId, zpStatus, zpAmount, vnpResponseCode, vnpTxnRef, vnpRawAmount, clearCart]);

    if (loading) {
        return (
            <div className="max-w-[1250px] mx-auto px-4 py-16 flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="text-sm font-bold text-gray-700">Đang xác thực giao dịch thanh toán...</p>
            </div>
        );
    }

    return (
        <div className="max-w-[800px] mx-auto px-4 py-10 sm:py-16">
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-xl text-center space-y-6">
                {success ? (
                    <>
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <CheckCircle2 className="w-12 h-12" />
                        </div>
                        <div className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                                GIAO DỊCH THÀNH CÔNG
                            </span>
                            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                                Cảm ơn bạn đã đặt hàng!
                            </h1>
                            <p className="text-xs text-gray-500 max-w-md mx-auto">{message}</p>
                        </div>

                        {/* Receipt Summary Box */}
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-6 text-left text-xs space-y-3 max-w-lg mx-auto">
                            {displayOrderCode && (
                                <div className="flex justify-between border-b border-gray-200 pb-2">
                                    <span className="text-gray-500 font-medium">Mã đơn hàng:</span>
                                    <span className="font-bold text-gray-900">{displayOrderCode}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-b border-gray-200 pb-2">
                                <span className="text-gray-500 font-medium">Mã giao dịch:</span>
                                <span className="font-bold text-gray-900">{displayTxnRef}</span>
                            </div>
                            <div className="flex justify-between border-b border-gray-200 pb-2">
                                <span className="text-gray-500 font-medium">Số tiền đã thanh toán:</span>
                                <span className="font-extrabold text-red-600 text-sm">
                                    {displayAmount.toLocaleString('vi-VN')}đ
                                </span>
                            </div>
                            <div className="flex justify-between border-b border-gray-200 pb-2">
                                <span className="text-gray-500 font-medium">Phương thức:</span>
                                <span className="font-bold text-blue-600">{gatewayLabel}</span>
                            </div>
                            {vnpOrderInfo && (
                                <div className="flex justify-between">
                                    <span className="text-gray-500 font-medium">Nội dung thanh toán:</span>
                                    <span className="font-medium text-gray-800 truncate max-w-[240px]">
                                        {decodeURIComponent(vnpOrderInfo)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                            <Link
                                to="/account"
                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors shadow-md"
                            >
                                <ShoppingBag className="w-4 h-4" />
                                <span>Xem đơn hàng của tôi</span>
                            </Link>
                            <Link
                                to="/products"
                                className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-6 py-3 rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors"
                            >
                                <span>Tiếp tục mua sắm</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <XCircle className="w-12 h-12" />
                        </div>
                        <div className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                                GIAO DỊCH THẤT BẠI
                            </span>
                            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
                                Thanh toán không thành công!
                            </h1>
                            <p className="text-xs text-gray-500 max-w-md mx-auto">{message}</p>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                            <Link
                                to="/cart"
                                className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-extrabold px-6 py-3 rounded-xl text-xs flex items-center justify-center space-x-2 transition-colors shadow-md"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span>Quay lại giỏ hàng thử lại</span>
                            </Link>
                            <Link
                                to="/"
                                className="w-full sm:w-auto bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-6 py-3 rounded-xl text-xs transition-colors"
                            >
                                Trở về Trang chủ
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PaymentResult;
