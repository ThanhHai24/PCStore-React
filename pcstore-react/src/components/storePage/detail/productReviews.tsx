import React, { useState } from 'react';
import { Star, Send, Camera, CheckCircle2, User, Trash2, MessageSquare, CornerDownRight } from 'lucide-react';
import type { Product } from '../../../types/product';
import { mockReviewsList, mockQAItems, type QuestionItem } from '../../../data/mockReviews';
import type { ReviewItem, ReviewSummary } from '../../../types/review';

interface ProductReviewsProps {
    product: Product;
}

export const ProductReviews: React.FC<ProductReviewsProps> = ({ product }) => {
    // Static User State
    const user = { fullName: 'Khách hàng', username: 'user', role: 'ADMIN' };
    const isAuthenticated = true;
    const userHasPurchased = true;

    // States for Review Modal / Form
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [userRating, setUserRating] = useState(5);
    const [reviewName, setReviewName] = useState(user.fullName);
    const [reviewComment, setReviewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Reviews Data States (initialize with static mock data)
    const [reviewsList, setReviewsList] = useState<ReviewItem[]>(mockReviewsList);

    // States for Q&A Input (initialize with static mock data)
    const [qaText, setQaText] = useState('');
    const [qaList, setQaList] = useState<QuestionItem[]>(mockQAItems);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Admin Q&A inline reply states
    const [replyingId, setReplyingId] = useState<string | null>(null);
    const [replyText, setReplyText] = useState<string>('');
    const [submittingReply, setSubmittingReply] = useState<boolean>(false);

    const isAdmin = user.role === 'ADMIN';

    const handleOpenModal = () => {
        setReviewName(user.fullName);
        setShowReviewModal(true);
    };

    const handleAddReview = (e: React.FormEvent) => {
        e.preventDefault();
        if (!reviewComment.trim()) return;

        setSubmitting(true);
        setTimeout(() => {
            const newReview: ReviewItem = {
                id: `r-${Date.now()}`,
                userName: reviewName.trim() || 'Khách hàng',
                rating: userRating,
                comment: reviewComment.trim(),
                purchased: true,
                date: new Date().toLocaleDateString('vi-VN'),
            };
            setReviewsList((prev) => [newReview, ...prev]);
            setShowReviewModal(false);
            setReviewComment('');
            setSubmitting(false);
            setToastMessage('Cảm ơn bạn đã gửi đánh giá sản phẩm!');
            setTimeout(() => setToastMessage(null), 3500);
        }, 300);
    };

    const handleDeleteReview = (reviewId: string) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) return;
        setReviewsList((prev) => prev.filter((r) => r.id !== reviewId));
        setToastMessage('Đã xóa đánh giá!');
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleSendQuestion = (e: React.FormEvent) => {
        e.preventDefault();
        if (!qaText.trim()) return;

        const newQa: QuestionItem = {
            id: `q-${Date.now()}`,
            userName: user.fullName,
            question: qaText.trim(),
            date: new Date().toLocaleDateString('vi-VN'),
        };

        setQaList((prev) => [newQa, ...prev]);
        setQaText('');
        setToastMessage('Câu hỏi của bạn đã được gửi, PCStore sẽ trả lời trong thời gian sớm nhất!');
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Admin reply question
    const handleAdminReplySubmit = (questionId: string) => {
        if (!replyText.trim()) return;
        setSubmittingReply(true);
        setTimeout(() => {
            setQaList((prev) =>
                prev.map((q) =>
                    q.id === questionId
                        ? {
                            ...q,
                            answer: {
                                adminName: 'QTV PCStore',
                                text: replyText.trim(),
                                date: new Date().toLocaleDateString('vi-VN'),
                            },
                        }
                        : q
                )
            );
            setReplyText('');
            setReplyingId(null);
            setSubmittingReply(false);
            setToastMessage('QTV đã gửi phản hồi thành công!');
            setTimeout(() => setToastMessage(null), 3000);
        }, 300);
    };

    // Admin delete question
    const handleDeleteQuestion = (questionId: string) => {
        if (!window.confirm('Bạn có chắc chắn muốn xóa câu hỏi này?')) return;
        setQaList((prev) => prev.filter((q) => q.id !== questionId));
        setToastMessage('Đã xóa câu hỏi!');
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Breakdown calculations
    const totalReviews = reviewsList.length;
    const avgRating =
        totalReviews > 0
            ? (reviewsList.reduce((acc, curr) => acc + curr.rating, 0) / totalReviews).toFixed(1)
            : '0.0';

    const starCounts = [5, 4, 3, 2, 1].map((star) => {
        const count = reviewsList.filter((r) => r.rating === star).length;
        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
        return { star, count, percentage };
    });

    return (
        <div className="space-y-6">
            {/* Toast alert */}
            {toastMessage && (
                <div className="fixed top-20 right-4 bg-blue-600 text-white px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center space-x-2 animate-bounce text-xs font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* 1. Bình luận và đánh giá Box */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
                <h3 className="font-extrabold text-base text-gray-900">Bình luận và đánh giá</h3>

                {/* Rating Breakdown Card */}
                <div className="border border-gray-200 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Left Average Score */}
                    <div className="md:col-span-5 text-center border-b md:border-b-0 md:border-r border-gray-200 pb-6 md:pb-0 md:pr-6 space-y-2">
                        <div className="text-4xl font-extrabold text-gray-900">
                            {avgRating}/5
                        </div>
                        <div className="flex items-center justify-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`w-5 h-5 ${star <= Math.round(Number(avgRating))
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'fill-gray-200 text-gray-200'
                                        }`}
                                />
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 font-medium">
                            {totalReviews} đánh giá và nhận xét
                        </p>
                    </div>

                    {/* Right Star Progress Bars */}
                    <div className="md:col-span-7 space-y-2 text-xs">
                        {starCounts.map(({ star, count, percentage }) => (
                            <div key={star} className="flex items-center space-x-3">
                                <span className="w-6 font-bold text-gray-700 flex items-center space-x-1">
                                    <span>{star}</span>
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                </span>
                                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-amber-400 h-full rounded-full transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <span className="w-20 text-right text-gray-600 font-medium">{count} đánh giá</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Action Prompt & Button */}
                <div className="text-center space-y-2 pt-2">
                    <p className="text-xs font-bold text-gray-800">Bạn đánh giá sao sản phẩm này</p>
                    <button
                        onClick={handleOpenModal}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-3 px-8 rounded-xl shadow-md transition-colors uppercase tracking-wider cursor-pointer"
                    >
                        Đánh giá ngay
                    </button>
                    {!isAuthenticated ? (
                        <p className="text-[11px] text-amber-600 font-semibold pt-1">
                            🔒 Bạn cần đăng nhập tài khoản để gửi đánh giá cho sản phẩm này.
                        </p>
                    ) : !userHasPurchased && !isAdmin ? (
                        <p className="text-[11px] text-amber-600 font-semibold pt-1">
                            🛒 Chỉ khách hàng đã mua sản phẩm này mới có thể viết đánh giá & nhận xét.
                        </p>
                    ) : null}
                </div>

                {/* Empty State */}
                {reviewsList.length === 0 && (
                    <div className="border-t border-gray-100 pt-5 text-center py-6 space-y-1">
                        <p className="text-xs text-gray-500 font-semibold">Chưa có đánh giá nào cho sản phẩm này.</p>
                        <p className="text-[11px] text-gray-400">Hãy là người đầu tiên gửi đánh giá cho sản phẩm!</p>
                    </div>
                )}

                {/* Reviews List */}
                {reviewsList.length > 0 && (
                    <div className="border-t border-gray-100 pt-5 space-y-4">
                        <h4 className="font-bold text-xs text-gray-900 uppercase">Đánh giá từ khách hàng ({reviewsList.length})</h4>
                        <div className="space-y-3">
                            {reviewsList.map((rev) => {
                                const canDelete = user && (String(user.id) === String(rev.userId) || user.role === 'ADMIN');
                                return (
                                    <div key={rev.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2 relative group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs overflow-hidden">
                                                    {rev.userAvatar ? (
                                                        <img src={rev.userAvatar} alt={rev.userName} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="w-4 h-4" />
                                                    )}
                                                </div>
                                                <span className="text-xs font-bold text-gray-900">{rev.userName}</span>
                                                {rev.purchased && (
                                                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-semibold flex items-center space-x-0.5">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        <span>Đã mua hàng</span>
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center space-x-2">
                                                <span className="text-[11px] text-gray-400">{rev.date}</span>
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDeleteReview(rev.id)}
                                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                        title="Xóa đánh giá"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-1">
                                            {[1, 2, 3, 4, 5].map((s) => (
                                                <Star
                                                    key={s}
                                                    className={`w-3.5 h-3.5 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'
                                                        }`}
                                                />
                                            ))}
                                        </div>

                                        {rev.title && (
                                            <p className="text-xs font-bold text-gray-900">{rev.title}</p>
                                        )}
                                        <p className="text-xs text-gray-700 leading-relaxed">{rev.comment}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* 2. Hỏi và đáp Box */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                <h3 className="font-extrabold text-base text-gray-900">Hỏi và đáp</h3>

                {/* Input Box */}
                <form onSubmit={handleSendQuestion} className="space-y-2">
                    <div className="flex flex-col sm:flex-row items-stretch gap-3">
                        <textarea
                            rows={3}
                            value={qaText}
                            onChange={(e) => setQaText(e.target.value)}
                            placeholder={
                                isAuthenticated
                                    ? "Xin mời để lại câu hỏi, PCStore sẽ trả lời ngay trong 1h, các câu hỏi sau 22h - 8h sẽ được trả lời vào sáng hôm sau."
                                    : "Vui lòng đăng nhập tài khoản để gửi câu hỏi về sản phẩm này."
                            }
                            className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed resize-none"
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-3 rounded-2xl flex items-center justify-center space-x-2 text-xs transition-colors shrink-0 shadow-md self-end sm:self-auto min-h-[48px]"
                        >
                            <Send className="w-4 h-4" />
                            <span>Gửi</span>
                        </button>
                    </div>

                    {!isAuthenticated && (
                        <p className="text-[11px] text-amber-600 font-bold">
                            🔒 Bạn chưa đăng nhập. Vui lòng đăng nhập tài khoản trước khi gửi câu hỏi.
                        </p>
                    )}

                    <div className="flex items-center space-x-2 text-xs text-gray-600 cursor-pointer hover:text-blue-600 w-fit pt-1">
                        <Camera className="w-4 h-4 text-gray-500" />
                        <span className="font-semibold">Đính kèm ảnh</span>
                    </div>
                </form>

                {/* Q&A List */}
                {qaList.length > 0 && (
                    <div className="border-t border-gray-100 pt-4 space-y-4">
                        {qaList.map((qa) => (
                            <div key={qa.id} className="space-y-2 border-b border-gray-100 pb-3 text-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-bold text-gray-900">{qa.userName}</span>
                                        <span className="text-[11px] text-gray-400">• {qa.date}</span>
                                    </div>

                                    {/* Admin action buttons */}
                                    {isAdmin && (
                                        <div className="flex items-center space-x-2">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setReplyingId(replyingId === qa.id ? null : qa.id);
                                                    setReplyText(qa.answer ? qa.answer.text : '');
                                                }}
                                                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200"
                                            >
                                                <MessageSquare className="w-3.5 h-3.5" />
                                                <span>{qa.answer ? 'Sửa phản hồi' : 'Trả lời QTV'}</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteQuestion(qa.id)}
                                                className="text-gray-400 hover:text-red-600 p-1"
                                                title="Xóa câu hỏi"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <p className="text-gray-800 font-medium pl-2 border-l-2 border-blue-500">{qa.question}</p>

                                {/* Answer Box */}
                                {qa.answer && (
                                    <div className="bg-blue-50/60 p-3 rounded-xl ml-4 space-y-1 border border-blue-100">
                                        <div className="flex items-center space-x-2">
                                            <span className="font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded text-[10px]">
                                                {qa.answer.adminName}
                                            </span>
                                            <span className="text-[10px] text-gray-400">{qa.answer.date}</span>
                                        </div>
                                        <p className="text-gray-700 text-xs">{qa.answer.text}</p>
                                    </div>
                                )}

                                {/* Inline Admin Reply Input Form */}
                                {isAdmin && replyingId === qa.id && (
                                    <div className="ml-4 mt-2 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2 animate-in fade-in zoom-in-95">
                                        <p className="text-[11px] font-bold text-blue-700 flex items-center space-x-1">
                                            <CornerDownRight className="w-3.5 h-3.5" />
                                            <span>Nhập câu trả lời của QTV:</span>
                                        </p>
                                        <textarea
                                            rows={2}
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            placeholder="Nhập nội dung phản hồi cho khách hàng..."
                                            className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 outline-none focus:border-blue-500"
                                        />
                                        <div className="flex items-center space-x-2 justify-end">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setReplyingId(null);
                                                    setReplyText('');
                                                }}
                                                className="px-3 py-1 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-200"
                                            >
                                                Hủy
                                            </button>
                                            <button
                                                type="button"
                                                disabled={submittingReply || !replyText.trim()}
                                                onClick={() => handleAdminReplySubmit(qa.id)}
                                                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                                            >
                                                {submittingReply ? 'Đang gửi...' : 'Gửi phản hồi'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Review Submission Modal */}
            {showReviewModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="font-bold text-sm text-gray-900">Viết đánh giá sản phẩm</h3>
                            <button
                                onClick={() => setShowReviewModal(false)}
                                className="text-gray-400 hover:text-gray-600 font-bold text-sm"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleAddReview} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Đánh giá của bạn:</label>
                                <div className="flex items-center space-x-2">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setUserRating(s)}
                                            className="p-1 focus:outline-none"
                                        >
                                            <Star
                                                className={`w-6 h-6 transition-colors ${s <= userRating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-300'
                                                    }`}
                                            />
                                        </button>
                                    ))}
                                    <span className="font-bold text-amber-600 ml-2">{userRating} sao</span>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Họ tên của bạn *</label>
                                <input
                                    type="text"
                                    required
                                    value={reviewName}
                                    onChange={(e) => setReviewName(e.target.value)}
                                    placeholder="Nhập họ tên"
                                    disabled={isAuthenticated}
                                    className={`w-full border rounded-lg p-2.5 outline-none ${isAuthenticated ? 'bg-gray-100 text-gray-700' : 'border-gray-300 focus:border-blue-500'
                                        }`}
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">Nhận xét của bạn *</label>
                                <textarea
                                    rows={3}
                                    required
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    placeholder="Nhập cảm nhận của bạn về sản phẩm..."
                                    className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-500 leading-relaxed"
                                />
                            </div>

                            <div className="flex items-center justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowReviewModal(false)}
                                    className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
                                    disabled={submitting}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow flex items-center space-x-1 disabled:opacity-50"
                                >
                                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>{submitting ? 'Đang gửi...' : 'Gửi đánh giá'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductReviews;
