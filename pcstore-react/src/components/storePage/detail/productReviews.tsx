import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Star,
    Send,
    Camera,
    CheckCircle2,
    User,
    Trash2,
    MessageSquare,
    CornerDownRight,
    Loader2,
    Edit3,
    X,
    AlertCircle,
    ShieldCheck,
    Image as ImageIcon,
    Filter,
    LogIn,
} from 'lucide-react';
import type { Product } from '../../../types/product';
import type { ReviewItem, CommentItem, ReviewSummary } from '../../../types/review';
import { useAuth } from '../../../context/AuthContext';
import { uploadImage, validateImageFile } from '../../../services/imgbbService';
import { DragAndDropUpload } from '../../admin/common/dragAndDropUpload';
import {
    reviewCommentService,
    syncAdminUserDirectoryIfPossible,
    calculateReviewSummary,
} from '../../../services/reviewCommentService';

interface ProductReviewsProps {
    product: Product;
    onStatsChange?: (stats: {
        avgRating: number;
        reviewCount: number;
        commentCount: number;
    }) => void;
}

const RATING_LABELS: Record<number, string> = {
    1: 'Rất tệ',
    2: 'Không hài lòng',
    3: 'Bình thường',
    4: 'Hài lòng',
    5: 'Tuyệt vời',
};

export const ProductReviews: React.FC<ProductReviewsProps> = ({ product, onStatsChange }) => {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const sectionRef = useRef<HTMLDivElement>(null);

    const isAdmin =
        user?.role === 'ADMIN' ||
        user?.role === 'MANAGER' ||
        (typeof user?.role === 'string' && user.role.startsWith('STAFF'));

    // Data states
    const [reviewsList, setReviewsList] = useState<ReviewItem[]>([]);
    const [reviewSummary, setReviewSummary] = useState<ReviewSummary>({
        totalReviews: 0,
        avgRating: 0,
        starCounts: [5, 4, 3, 2, 1].map((star) => ({ star, count: 0, percentage: 0 })),
    });
    const [commentsList, setCommentsList] = useState<CommentItem[]>([]);
    const [loadingReviews, setLoadingReviews] = useState<boolean>(true);
    const [loadingComments, setLoadingComments] = useState<boolean>(true);
    const [userHasPurchased, setUserHasPurchased] = useState<boolean>(false);
    const [checkingPurchase, setCheckingPurchase] = useState<boolean>(false);

    // Filter & sort states for Reviews
    const [starFilter, setStarFilter] = useState<number | 'ALL' | 'WITH_IMAGES'>('ALL');
    const [sortBy, setSortBy] = useState<'NEWEST' | 'HIGHEST' | 'LOWEST'>('NEWEST');

    // Toast notification
    const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const showNotification = useCallback((text: string, type: 'success' | 'error' = 'success') => {
        setToast({ type, text });
        setTimeout(() => {
            setToast((prev) => (prev?.text === text ? null : prev));
        }, 4000);
    }, []);

    // Review Modal (Create / Edit)
    const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
    const [editingReview, setEditingReview] = useState<ReviewItem | null>(null);
    const [userRating, setUserRating] = useState<number>(5);
    const [reviewComment, setReviewComment] = useState<string>('');
    const [reviewExistingImages, setReviewExistingImages] = useState<string[]>([]);
    const [reviewNewFiles, setReviewNewFiles] = useState<{ file: File; preview: string }[]>([]);
    const [submittingReview, setSubmittingReview] = useState<boolean>(false);
    const [reviewFormError, setReviewFormError] = useState<string | null>(null);
    const reviewFileInputRef = useRef<HTMLInputElement>(null);

    // Comment Create states
    const [commentText, setCommentText] = useState<string>('');
    const [commentFiles, setCommentFiles] = useState<{ file: File; preview: string }[]>([]);
    const [submittingComment, setSubmittingComment] = useState<boolean>(false);
    const commentFileInputRef = useRef<HTMLInputElement>(null);

    // Comment Reply states
    const [replyingToId, setReplyingToId] = useState<string | null>(null);
    const [replyingToUserName, setReplyingToUserName] = useState<string>('');
    const [replyText, setReplyText] = useState<string>('');
    const [replyFiles, setReplyFiles] = useState<{ file: File; preview: string }[]>([]);
    const [submittingReply, setSubmittingReply] = useState<boolean>(false);
    const replyFileInputRef = useRef<HTMLInputElement>(null);

    // Comment Edit states
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState<string>('');
    const [editingCommentImages, setEditingCommentImages] = useState<string[]>([]);
    const [submittingEditComment, setSubmittingEditComment] = useState<boolean>(false);

    // Delete Confirmation Modal state
    const [deleteTarget, setDeleteTarget] = useState<{
        type: 'review' | 'comment';
        id: string;
        previewText: string;
    } | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    // Lightbox Image Preview
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    // Giữ tham chiếu ổn định tới onStatsChange và thông tin hiển thị sản phẩm để tránh vòng lặp re-fetch vô tận
    const onStatsChangeRef = useRef(onStatsChange);
    useEffect(() => {
        onStatsChangeRef.current = onStatsChange;
    }, [onStatsChange]);

    const productMetaRef = useRef({
        name: product?.title,
        image: product?.images?.[0],
    });
    useEffect(() => {
        productMetaRef.current = {
            name: product?.title,
            image: product?.images?.[0],
        };
    }, [product?.title, product?.images]);

    // Load reviews & comments from Backend API
    const fetchAllReviewsAndComments = useCallback(async () => {
        if (!product?.id) return;

        setLoadingReviews(true);
        setLoadingComments(true);

        // Chạy đồng bộ danh bạ user (nếu là ADMIN) song song, không chặn việc tải đánh giá/bình luận
        syncAdminUserDirectoryIfPossible(user?.role).catch(() => {});

        const meta = productMetaRef.current;

        const [revResult, cmtResult] = await Promise.allSettled([
            reviewCommentService.getProductReviews(product.id, 0, 50, meta),
            reviewCommentService.getProductComments(product.id, 0, 50, meta),
        ]);

        let currentAvg = 0;
        let currentRevCount = 0;
        let currentCmtCount = 0;

        if (revResult.status === 'fulfilled') {
            setReviewsList(revResult.value.reviews);
            setReviewSummary(revResult.value.summary);
            currentAvg = revResult.value.summary.avgRating;
            currentRevCount = revResult.value.summary.totalReviews;
        } else {
            console.warn('Không thể tải đánh giá sản phẩm:', revResult.reason);
        }
        setLoadingReviews(false);

        if (cmtResult.status === 'fulfilled') {
            setCommentsList(cmtResult.value.comments);
            currentCmtCount = cmtResult.value.totalCount;
        } else {
            console.warn('Không thể tải bình luận sản phẩm:', cmtResult.reason);
        }
        setLoadingComments(false);

        if (onStatsChangeRef.current) {
            onStatsChangeRef.current({
                avgRating: currentAvg,
                reviewCount: currentRevCount,
                commentCount: currentCmtCount,
            });
        }
    }, [product?.id, user?.role]);

    useEffect(() => {
        fetchAllReviewsAndComments();
    }, [fetchAllReviewsAndComments]);

    // Check if logged-in customer has a COMPLETED order containing this product
    useEffect(() => {
        let isMounted = true;
        if (!isAuthenticated || !product?.id) {
            setUserHasPurchased(false);
            return;
        }

        setCheckingPurchase(true);
        reviewCommentService
            .checkCompletedPurchase(product.id)
            .then((purchased) => {
                if (isMounted) setUserHasPurchased(purchased);
            })
            .finally(() => {
                if (isMounted) setCheckingPurchase(false);
            });

        return () => {
            isMounted = false;
        };
    }, [isAuthenticated, product?.id, user?.id]);

    // Find current user's existing review (since backend allows 1 review per customer per product)
    const myExistingReview = React.useMemo(() => {
        if (!user) return null;
        return reviewsList.find((r) => String(r.userId) === String(user.id)) || null;
    }, [reviewsList, user]);

    // Auto-scroll and open review modal if ?review=true or #reviews is in URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const wantReview = params.get('review') === 'true' || location.hash === '#reviews';
        if (wantReview && !loadingReviews) {
            sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            if (isAuthenticated && (userHasPurchased || myExistingReview) && params.get('review') === 'true') {
                if (myExistingReview) {
                    handleOpenEditReviewModal(myExistingReview);
                } else {
                    handleOpenCreateReviewModal();
                }
            }
        }
    }, [location.search, location.hash, loadingReviews, isAuthenticated, userHasPurchased, myExistingReview]);

    // Sync stats upward whenever reviewsList or commentsList changes
    const syncParentStats = useCallback(
        (nextReviews: ReviewItem[], nextComments: CommentItem[]) => {
            const summary = calculateReviewSummary(nextReviews);
            setReviewSummary(summary);
            const totalComments = nextComments.reduce(
                (acc, c) => acc + (c.isDeleted ? 0 : 1) + c.replies.length,
                0
            );
            onStatsChangeRef.current?.({
                avgRating: summary.avgRating,
                reviewCount: summary.totalReviews,
                commentCount: totalComments,
            });
        },
        []
    );

    // ==================== REVIEW HANDLERS ====================

    const handleOpenCreateReviewModal = () => {
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        setEditingReview(null);
        setUserRating(5);
        setReviewComment('');
        setReviewExistingImages([]);
        setReviewNewFiles([]);
        setReviewFormError(null);
        setShowReviewModal(true);
    };

    const handleOpenEditReviewModal = (review: ReviewItem) => {
        setEditingReview(review);
        setUserRating(review.rating);
        setReviewComment(review.comment);
        setReviewExistingImages(review.images || []);
        setReviewNewFiles([]);
        setReviewFormError(null);
        setShowReviewModal(true);
    };

    const handleSelectReviewImages = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const totalCount = reviewExistingImages.length + reviewNewFiles.length + files.length;
        if (totalCount > 4) {
            setReviewFormError('Bạn chỉ có thể đính kèm tối đa 4 hình ảnh cho một đánh giá.');
            return;
        }

        const validItems: { file: File; preview: string }[] = [];
        for (const file of files) {
            const check = validateImageFile(file, 32);
            if (!check.valid) {
                setReviewFormError(check.error || 'Tệp ảnh không hợp lệ');
                return;
            }
            validItems.push({ file, preview: URL.createObjectURL(file) });
        }

        setReviewFormError(null);
        setReviewNewFiles((prev) => [...prev, ...validItems]);
        if (reviewFileInputRef.current) reviewFileInputRef.current.value = '';
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) {
            navigate('/login');
            return;
        }
        if (!reviewComment.trim()) {
            setReviewFormError('Vui lòng nhập nội dung nhận xét về sản phẩm.');
            return;
        }

        setSubmittingReview(true);
        setReviewFormError(null);

        try {
            // Upload any new images to ImgBB
            const uploadedUrls: string[] = [];
            for (const item of reviewNewFiles) {
                const url = await uploadImage(item.file);
                uploadedUrls.push(url);
            }
            const finalImages = [...reviewExistingImages, ...uploadedUrls];

            if (editingReview) {
                const updated = await reviewCommentService.updateReview(
                    product.id,
                    editingReview.id,
                    {
                        rating: userRating,
                        comment: reviewComment.trim(),
                        images: finalImages,
                        author: {
                            id: user.id,
                            fullName: user.fullName,
                            avatar: user.avatar,
                            role: user.role,
                        },
                    }
                );
                const nextList = reviewsList.map((r) => (r.id === updated.id ? updated : r));
                setReviewsList(nextList);
                syncParentStats(nextList, commentsList);
                showNotification('Đã cập nhật đánh giá sản phẩm thành công!');
            } else {
                const created = await reviewCommentService.createReview(product.id, {
                    rating: userRating,
                    comment: reviewComment.trim(),
                    images: finalImages,
                    author: {
                        id: user.id,
                        fullName: user.fullName,
                        avatar: user.avatar,
                        role: user.role,
                    },
                });
                const nextList = [created, ...reviewsList];
                setReviewsList(nextList);
                syncParentStats(nextList, commentsList);
                showNotification('Cảm ơn bạn đã gửi đánh giá sản phẩm!');
            }

            // Cleanup previews
            reviewNewFiles.forEach((f) => URL.revokeObjectURL(f.preview));
            setReviewNewFiles([]);
            setShowReviewModal(false);
        } catch (err: any) {
            setReviewFormError(
                err.message || 'Không thể gửi đánh giá. Vui lòng kiểm tra điều kiện mua hàng!'
            );
        } finally {
            setSubmittingReview(false);
        }
    };

    // ==================== COMMENT & REPLY HANDLERS ====================

    const handleSelectCommentImages = (
        e: React.ChangeEvent<HTMLInputElement>,
        target: 'root' | 'reply'
    ) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const currentList = target === 'root' ? commentFiles : replyFiles;
        if (currentList.length + files.length > 3) {
            showNotification('Chỉ được đính kèm tối đa 3 ảnh trong mỗi bình luận.', 'error');
            return;
        }

        const validItems: { file: File; preview: string }[] = [];
        for (const file of files) {
            const check = validateImageFile(file, 32);
            if (!check.valid) {
                showNotification(check.error || 'Ảnh không hợp lệ', 'error');
                return;
            }
            validItems.push({ file, preview: URL.createObjectURL(file) });
        }

        if (target === 'root') {
            setCommentFiles((prev) => [...prev, ...validItems]);
            if (commentFileInputRef.current) commentFileInputRef.current.value = '';
        } else {
            setReplyFiles((prev) => [...prev, ...validItems]);
            if (replyFileInputRef.current) replyFileInputRef.current.value = '';
        }
    };

    const handleSendRootComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated || !user) {
            navigate('/login');
            return;
        }
        if (!commentText.trim() && commentFiles.length === 0) return;

        setSubmittingComment(true);
        try {
            const uploadedUrls: string[] = [];
            for (const item of commentFiles) {
                const url = await uploadImage(item.file);
                uploadedUrls.push(url);
            }

            const created = await reviewCommentService.createComment(product.id, {
                content: commentText.trim() || 'Đã gửi hình ảnh đính kèm',
                images: uploadedUrls,
                author: {
                    id: user.id,
                    fullName: user.fullName,
                    avatar: user.avatar,
                    role: user.role,
                },
            });

            const nextComments = [created, ...commentsList];
            setCommentsList(nextComments);
            syncParentStats(reviewsList, nextComments);

            commentFiles.forEach((f) => URL.revokeObjectURL(f.preview));
            setCommentFiles([]);
            setCommentText('');
            showNotification(
                'Câu hỏi / bình luận của bạn đã được gửi thành công!'
            );
        } catch (err: any) {
            showNotification(err.message || 'Không thể gửi bình luận.', 'error');
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleSubmitReply = async (parentCommentId: string) => {
        if (!isAuthenticated || !user) {
            navigate('/login');
            return;
        }
        if (!replyText.trim() && replyFiles.length === 0) return;

        setSubmittingReply(true);
        try {
            const uploadedUrls: string[] = [];
            for (const item of replyFiles) {
                const url = await uploadImage(item.file);
                uploadedUrls.push(url);
            }

            const createdReply = await reviewCommentService.replyComment(
                product.id,
                parentCommentId,
                {
                    content: replyText.trim() || 'Đã gửi hình ảnh đính kèm',
                    images: uploadedUrls,
                    author: {
                        id: user.id,
                        fullName: isAdmin ? `QTV ${user.fullName}` : user.fullName,
                        avatar: user.avatar,
                        role: user.role,
                    },
                }
            );

            const nextComments = commentsList.map((c) =>
                c.id === parentCommentId
                    ? { ...c, replies: [...c.replies, createdReply] }
                    : c
            );
            setCommentsList(nextComments);
            syncParentStats(reviewsList, nextComments);

            replyFiles.forEach((f) => URL.revokeObjectURL(f.preview));
            setReplyFiles([]);
            setReplyText('');
            setReplyingToId(null);
            setReplyingToUserName('');
            showNotification('Đã gửi phản hồi thành công!');
        } catch (err: any) {
            showNotification(err.message || 'Không thể gửi phản hồi.', 'error');
        } finally {
            setSubmittingReply(false);
        }
    };

    const handleSaveEditComment = async (commentId: string) => {
        if (!user || !editingCommentText.trim()) return;
        setSubmittingEditComment(true);
        try {
            const updated = await reviewCommentService.updateComment(product.id, commentId, {
                content: editingCommentText.trim(),
                images: editingCommentImages,
                author: {
                    id: user.id,
                    fullName: isAdmin ? `QTV ${user.fullName}` : user.fullName,
                    avatar: user.avatar,
                    role: user.role,
                },
            });

            const nextComments = commentsList.map((c) => {
                if (c.id === commentId) {
                    return { ...updated, replies: c.replies };
                }
                return {
                    ...c,
                    replies: c.replies.map((r) => (r.id === commentId ? updated : r)),
                };
            });

            setCommentsList(nextComments);
            setEditingCommentId(null);
            setEditingCommentText('');
            setEditingCommentImages([]);
            showNotification('Đã cập nhật bình luận!');
        } catch (err: any) {
            showNotification(err.message || 'Không thể cập nhật bình luận.', 'error');
        } finally {
            setSubmittingEditComment(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            if (deleteTarget.type === 'review') {
                await reviewCommentService.deleteReview(product.id, deleteTarget.id);
                const nextReviews = reviewsList.filter((r) => r.id !== deleteTarget.id);
                setReviewsList(nextReviews);
                syncParentStats(nextReviews, commentsList);
                showNotification('Đã xóa đánh giá thành công!');
            } else {
                await reviewCommentService.deleteComment(product.id, deleteTarget.id);
                const nextComments = commentsList
                    .map((c) => {
                        if (c.id === deleteTarget.id) {
                            if (c.replies.length > 0) {
                                return {
                                    ...c,
                                    isDeleted: true,
                                    content: 'Bình luận này đã bị xóa.',
                                    images: [],
                                };
                            }
                            return null;
                        }
                        return {
                            ...c,
                            replies: c.replies.filter((r) => r.id !== deleteTarget.id),
                        };
                    })
                    .filter(Boolean) as CommentItem[];

                setCommentsList(nextComments);
                syncParentStats(reviewsList, nextComments);
                showNotification('Đã xóa bình luận thành công!');
            }
            setDeleteTarget(null);
        } catch (err: any) {
            showNotification(err.message || 'Không thể xóa mục này.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    // ==================== FILTERED & SORTED REVIEWS ====================

    const filteredReviews = React.useMemo(() => {
        let list = [...reviewsList];
        if (starFilter === 'WITH_IMAGES') {
            list = list.filter((r) => r.images && r.images.length > 0);
        } else if (typeof starFilter === 'number') {
            list = list.filter((r) => Math.round(r.rating) === starFilter);
        }

        if (sortBy === 'HIGHEST') {
            list.sort((a, b) => b.rating - a.rating);
        } else if (sortBy === 'LOWEST') {
            list.sort((a, b) => a.rating - b.rating);
        } else {
            list.sort(
                (a, b) =>
                    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
        }
        return list;
    }, [reviewsList, starFilter, sortBy]);

    const reviewsWithImagesCount = React.useMemo(
        () => reviewsList.filter((r) => r.images && r.images.length > 0).length,
        [reviewsList]
    );

    const totalCommentsCount = React.useMemo(
        () =>
            commentsList.reduce(
                (acc, c) => acc + (c.isDeleted ? 0 : 1) + c.replies.length,
                0
            ),
        [commentsList]
    );

    return (
        <div ref={sectionRef} id="reviews" className="space-y-6 scroll-mt-20">
            {/* Toast Alert */}
            {toast && (
                <div
                    className={`fixed top-20 right-4 px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center space-x-2 animate-in fade-in slide-in-from-top-3 text-xs font-bold ${
                        toast.type === 'success'
                            ? 'bg-blue-600 text-white'
                            : 'bg-red-600 text-white'
                    }`}
                >
                    {toast.type === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-amber-200 shrink-0" />
                    )}
                    <span>{toast.text}</span>
                </div>
            )}

            {/* ==================== 1. ĐÁNH GIÁ SẢN PHẨM BOX ==================== */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-extrabold text-base text-gray-900">
                        Đánh giá & Nhận xét {product.title ? `- ${product.title}` : ''}
                    </h3>
                    <span className="text-xs text-gray-500 font-medium">
                        {reviewSummary.totalReviews} lượt đánh giá từ khách hàng đã mua
                    </span>
                </div>

                {/* Rating Breakdown Card */}
                <div className="border border-gray-200 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-gray-50/40">
                    {/* Left Average Score */}
                    <div className="md:col-span-5 text-center border-b md:border-b-0 md:border-r border-gray-200 pb-6 md:pb-0 md:pr-6 space-y-2">
                        <div className="text-4xl font-extrabold text-gray-900">
                            {reviewSummary.avgRating.toFixed(1)}/5
                        </div>
                        <div className="flex items-center justify-center space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    className={`w-5 h-5 ${
                                        star <= Math.round(reviewSummary.avgRating)
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'fill-gray-200 text-gray-200'
                                    }`}
                                />
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 font-medium">
                            {reviewSummary.totalReviews} đánh giá xác thực
                        </p>
                    </div>

                    {/* Right Star Progress Bars */}
                    <div className="md:col-span-7 space-y-2 text-xs">
                        {reviewSummary.starCounts.map(({ star, count, percentage }) => (
                            <button
                                key={star}
                                type="button"
                                onClick={() =>
                                    setStarFilter(starFilter === star ? 'ALL' : star)
                                }
                                className="w-full flex items-center space-x-3 hover:bg-gray-100/80 p-1 rounded-lg transition-colors cursor-pointer text-left"
                            >
                                <span className="w-8 font-bold text-gray-700 flex items-center space-x-1">
                                    <span>{star}</span>
                                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                </span>
                                <div className="flex-1 bg-gray-200/80 rounded-full h-2.5 overflow-hidden">
                                    <div
                                        className="bg-amber-400 h-full rounded-full transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <span className="w-24 text-right text-gray-600 font-medium">
                                    {count} đánh giá ({percentage}%)
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Action Prompt & Button */}
                <div className="text-center space-y-2.5 pt-1 bg-blue-50/40 border border-blue-100 rounded-2xl p-4">
                    <p className="text-xs font-bold text-gray-800">
                        {myExistingReview
                            ? `Bạn đã đánh giá sản phẩm này ${myExistingReview.rating}/5 sao`
                            : 'Chia sẻ trải nghiệm thực tế của bạn về sản phẩm này'}
                    </p>

                    {!isAuthenticated ? (
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={() => navigate('/login')}
                                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl shadow-md transition-colors cursor-pointer"
                            >
                                <LogIn className="w-4 h-4" />
                                <span>Đăng nhập để gửi đánh giá</span>
                            </button>
                            <p className="text-[11px] text-amber-700 font-medium">
                                🔒 Chỉ khách hàng đã mua sản phẩm trong đơn hàng hoàn tất mới có thể đánh giá sao.
                            </p>
                        </div>
                    ) : myExistingReview ? (
                        <div className="flex items-center justify-center space-x-3">
                            <button
                                type="button"
                                onClick={() => handleOpenEditReviewModal(myExistingReview)}
                                className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-2.5 px-6 rounded-xl shadow-md transition-colors cursor-pointer"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Sửa đánh giá của bạn</span>
                            </button>
                            <button
                                type="button"
                                onClick={() =>
                                    setDeleteTarget({
                                        type: 'review',
                                        id: myExistingReview.id,
                                        previewText: myExistingReview.comment,
                                    })
                                }
                                className="inline-flex items-center space-x-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs py-2.5 px-4 rounded-xl transition-colors cursor-pointer"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Xóa</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <button
                                type="button"
                                onClick={handleOpenCreateReviewModal}
                                disabled={checkingPurchase || (!userHasPurchased && !isAdmin)}
                                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 text-white font-extrabold text-xs py-3 px-8 rounded-xl shadow-md transition-colors uppercase tracking-wider cursor-pointer disabled:cursor-not-allowed"
                            >
                                {checkingPurchase ? 'Đang kiểm tra đơn hàng...' : 'Viết đánh giá ngay'}
                            </button>

                            {!checkingPurchase && !userHasPurchased && !isAdmin && (
                                <p className="text-[11px] text-amber-700 font-semibold">
                                    🛒 Chỉ khách hàng đã mua sản phẩm này trong đơn hàng đã hoàn tất (COMPLETED) mới có thể gửi đánh giá.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Filter & Sort Controls */}
                {reviewsList.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-gray-500 font-semibold mr-1 flex items-center gap-1">
                                <Filter className="w-3.5 h-3.5" /> Lọc theo:
                            </span>
                            <button
                                type="button"
                                onClick={() => setStarFilter('ALL')}
                                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                                    starFilter === 'ALL'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                            >
                                Tất cả ({reviewsList.length})
                            </button>
                            {[5, 4, 3, 2, 1].map((s) => {
                                const c =
                                    reviewSummary.starCounts.find((x) => x.star === s)?.count || 0;
                                return (
                                    <button
                                        key={s}
                                        type="button"
                                        onClick={() => setStarFilter(s)}
                                        className={`px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1 transition-colors cursor-pointer ${
                                            starFilter === s
                                                ? 'bg-blue-600 text-white shadow-xs'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                    >
                                        <span>{s}</span>
                                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                        <span className="opacity-75">({c})</span>
                                    </button>
                                );
                            })}
                            {reviewsWithImagesCount > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setStarFilter('WITH_IMAGES')}
                                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1 transition-colors cursor-pointer ${
                                        starFilter === 'WITH_IMAGES'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    <span>Có hình ảnh ({reviewsWithImagesCount})</span>
                                </button>
                            )}
                        </div>

                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-gray-700 font-semibold outline-none focus:border-blue-500"
                        >
                            <option value="NEWEST">Mới nhất</option>
                            <option value="HIGHEST">Số sao cao nhất</option>
                            <option value="LOWEST">Số sao thấp nhất</option>
                        </select>
                    </div>
                )}

                {/* Loading / Empty / Reviews List */}
                {loadingReviews ? (
                    <div className="py-10 flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                        <p className="text-xs text-gray-500">Đang tải đánh giá sản phẩm...</p>
                    </div>
                ) : filteredReviews.length === 0 ? (
                    <div className="border-t border-gray-100 pt-6 text-center py-6 space-y-1">
                        <p className="text-xs text-gray-500 font-semibold">
                            {reviewsList.length === 0
                                ? 'Chưa có đánh giá nào cho sản phẩm này.'
                                : 'Không có đánh giá nào phù hợp với bộ lọc đã chọn.'}
                        </p>
                        <p className="text-[11px] text-gray-400">
                            {reviewsList.length === 0
                                ? 'Hãy mua sản phẩm và trở thành người đầu tiên gửi đánh giá!'
                                : 'Thử chuyển bộ lọc sang "Tất cả" để xem toàn bộ nhận xét.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3 pt-2">
                        {filteredReviews.map((rev) => {
                            const isOwner = user && String(user.id) === String(rev.userId);
                            const canDelete = isOwner || user?.role === 'ADMIN';

                            return (
                                <div
                                    key={rev.id}
                                    className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 space-y-2.5 hover:border-gray-200 transition-all"
                                >
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center space-x-2.5">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs overflow-hidden shrink-0">
                                                {rev.userAvatar ? (
                                                    <img
                                                        src={rev.userAvatar}
                                                        alt={rev.userName}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <span>
                                                        {rev.userName
                                                            ? rev.userName.charAt(0).toUpperCase()
                                                            : 'K'}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center space-x-2 flex-wrap">
                                                    <span className="text-xs font-bold text-gray-900">
                                                        {rev.userName}
                                                    </span>
                                                    {rev.purchased && (
                                                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold inline-flex items-center space-x-1">
                                                            <CheckCircle2 className="w-3 h-3" />
                                                            <span>Đã mua tại PCStore</span>
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center space-x-2 mt-0.5">
                                                    <div className="flex items-center space-x-0.5">
                                                        {[1, 2, 3, 4, 5].map((s) => (
                                                            <Star
                                                                key={s}
                                                                className={`w-3.5 h-3.5 ${
                                                                    s <= rev.rating
                                                                        ? 'fill-amber-400 text-amber-400'
                                                                        : 'fill-gray-200 text-gray-200'
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <span className="text-[11px] font-semibold text-amber-600">
                                                        {RATING_LABELS[rev.rating] || ''}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2">
                                            <span className="text-[11px] text-gray-400">
                                                {rev.date}
                                                {rev.isEdited ? ' (Đã chỉnh sửa)' : ''}
                                            </span>
                                            {isOwner && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEditReviewModal(rev)}
                                                    className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded-lg hover:bg-blue-50 cursor-pointer"
                                                    title="Chỉnh sửa đánh giá của bạn"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setDeleteTarget({
                                                            type: 'review',
                                                            id: rev.id,
                                                            previewText: rev.comment,
                                                        })
                                                    }
                                                    className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50 cursor-pointer"
                                                    title="Xóa đánh giá"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {rev.comment && (
                                        <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line pl-10">
                                            {rev.comment}
                                        </p>
                                    )}

                                    {/* Attached Review Images */}
                                    {rev.images && rev.images.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pl-10 pt-1">
                                            {rev.images.map((imgUrl, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setLightboxImage(imgUrl)}
                                                    className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 hover:border-blue-500 transition-all shadow-2xs cursor-pointer group relative"
                                                >
                                                    <img
                                                        src={imgUrl}
                                                        alt={`Ảnh đánh giá ${idx + 1}`}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ==================== 2. HỎI ĐÁP & BÌNH LUẬN BOX ==================== */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-base text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                        <span>Hỏi đáp & Bình luận ({totalCommentsCount})</span>
                    </h3>
                </div>

                {/* New Comment Form */}
                <form onSubmit={handleSendRootComment} className="space-y-3">
                    <div className="flex flex-col sm:flex-row items-stretch gap-3">
                        <textarea
                            rows={3}
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            disabled={!isAuthenticated || submittingComment}
                            placeholder={
                                isAuthenticated
                                    ? 'Xin mời để lại câu hỏi hoặc bình luận, PCStore sẽ phản hồi ngay trong thời gian sớm nhất...'
                                    : 'Vui lòng đăng nhập tài khoản để gửi câu hỏi hoặc bình luận về sản phẩm này.'
                            }
                            className="flex-1 bg-white border border-gray-200 rounded-2xl p-4 text-xs text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed resize-none disabled:bg-gray-50"
                        />
                        <button
                            type="submit"
                            disabled={
                                !isAuthenticated ||
                                submittingComment ||
                                (!commentText.trim() && commentFiles.length === 0)
                            }
                            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-extrabold px-6 py-3 rounded-2xl flex items-center justify-center space-x-2 text-xs transition-colors shrink-0 shadow-md self-end sm:self-auto min-h-[48px] cursor-pointer disabled:cursor-not-allowed"
                        >
                            {submittingComment ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Send className="w-4 h-4" />
                            )}
                            <span>{submittingComment ? 'Đang gửi...' : 'Gửi bình luận'}</span>
                        </button>
                    </div>

                    {/* Preview selected images for root comment */}
                    {commentFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {commentFiles.map((item, index) => (
                                <div
                                    key={index}
                                    className="relative w-16 h-16 rounded-xl overflow-hidden border border-blue-200 shadow-2xs"
                                >
                                    <img
                                        src={item.preview}
                                        alt="Preview"
                                        className="w-full h-full object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            URL.revokeObjectURL(item.preview);
                                            setCommentFiles((prev) =>
                                                prev.filter((_, i) => i !== index)
                                            );
                                        }}
                                        className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 hover:bg-red-600 cursor-pointer"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                        {isAuthenticated ? (
                            <div>
                                <input
                                    ref={commentFileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => handleSelectCommentImages(e, 'root')}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => commentFileInputRef.current?.click()}
                                    className="flex items-center space-x-1.5 text-xs text-gray-600 hover:text-blue-600 font-semibold py-1 px-2.5 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                                >
                                    <Camera className="w-4 h-4 text-blue-600" />
                                    <span>Đính kèm ảnh (tối đa 3 ảnh)</span>
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2">
                                <span className="text-[11px] text-amber-600 font-bold">
                                    🔒 Bạn chưa đăng nhập.
                                </span>
                                <button
                                    type="button"
                                    onClick={() => navigate('/login')}
                                    className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer"
                                >
                                    Đăng nhập ngay
                                </button>
                            </div>
                        )}
                    </div>
                </form>

                {/* Comments & Replies Thread List */}
                {loadingComments ? (
                    <div className="py-8 flex flex-col items-center justify-center space-y-2">
                        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                        <p className="text-xs text-gray-500">Đang tải danh sách hỏi đáp...</p>
                    </div>
                ) : commentsList.length === 0 ? (
                    <div className="border-t border-gray-100 pt-6 text-center py-6 space-y-1">
                        <p className="text-xs text-gray-500 font-semibold">
                            Chưa có câu hỏi hay bình luận nào cho sản phẩm này.
                        </p>
                        <p className="text-[11px] text-gray-400">
                            Hãy đặt câu hỏi bên trên nếu bạn cần tư vấn thêm về cấu hình & bảo hành!
                        </p>
                    </div>
                ) : (
                    <div className="border-t border-gray-100 pt-4 space-y-4">
                        {commentsList.map((cmt) => {
                            const isRootOwner =
                                user && String(user.id) === String(cmt.userId) && !cmt.isDeleted;
                            const canDeleteRoot =
                                !cmt.isDeleted && (isRootOwner || user?.role === 'ADMIN');

                            return (
                                <div
                                    key={cmt.id}
                                    className="space-y-3 border-b border-gray-100 pb-4 last:border-b-0 text-xs"
                                >
                                    {/* Root Comment Card */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center space-x-2">
                                                <div
                                                    className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 ${
                                                        cmt.isAdminAuthor
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-gray-200 text-gray-700'
                                                    }`}
                                                >
                                                    {cmt.userAvatar ? (
                                                        <img
                                                            src={cmt.userAvatar}
                                                            alt={cmt.userName}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <User className="w-4 h-4" />
                                                    )}
                                                </div>
                                                <span className="font-bold text-gray-900">
                                                    {cmt.userName}
                                                </span>
                                                {cmt.isAdminAuthor && (
                                                    <span className="inline-flex items-center space-x-1 font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full text-[10px]">
                                                        <ShieldCheck className="w-3 h-3" />
                                                        <span>QTV PCStore</span>
                                                    </span>
                                                )}
                                                <span className="text-[11px] text-gray-400">
                                                    • {cmt.date}
                                                    {cmt.isEdited && !cmt.isDeleted
                                                        ? ' (Đã chỉnh sửa)'
                                                        : ''}
                                                </span>
                                            </div>

                                            {/* Action Buttons on Root Comment */}
                                            {!cmt.isDeleted && (
                                                <div className="flex items-center space-x-2">
                                                    {isAuthenticated && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (replyingToId === cmt.id) {
                                                                    setReplyingToId(null);
                                                                    setReplyText('');
                                                                } else {
                                                                    setReplyingToId(cmt.id);
                                                                    setReplyingToUserName(
                                                                        cmt.userName
                                                                    );
                                                                    setReplyText('');
                                                                }
                                                            }}
                                                            className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                                                        >
                                                            <MessageSquare className="w-3.5 h-3.5" />
                                                            <span>
                                                                {isAdmin ? 'Trả lời QTV' : 'Trả lời'}
                                                            </span>
                                                        </button>
                                                    )}

                                                    {isRootOwner && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingCommentId(cmt.id);
                                                                setEditingCommentText(cmt.content);
                                                                setEditingCommentImages(
                                                                    cmt.images || []
                                                                );
                                                            }}
                                                            className="text-gray-400 hover:text-blue-600 p-1 rounded-lg hover:bg-blue-50 cursor-pointer"
                                                            title="Sửa bình luận"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}

                                                    {canDeleteRoot && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setDeleteTarget({
                                                                    type: 'comment',
                                                                    id: cmt.id,
                                                                    previewText: cmt.content,
                                                                })
                                                            }
                                                            className="text-gray-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 cursor-pointer"
                                                            title="Xóa bình luận"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Inline Edit Form for Root Comment */}
                                        {editingCommentId === cmt.id ? (
                                            <div className="pl-9 space-y-2">
                                                <textarea
                                                    rows={2}
                                                    value={editingCommentText}
                                                    onChange={(e) =>
                                                        setEditingCommentText(e.target.value)
                                                    }
                                                    className="w-full bg-white border border-blue-400 rounded-xl p-2.5 text-xs text-gray-800 outline-none"
                                                />
                                                <div className="flex items-center justify-end space-x-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingCommentId(null)}
                                                        className="px-3 py-1 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                                                    >
                                                        Hủy
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            submittingEditComment ||
                                                            !editingCommentText.trim()
                                                        }
                                                        onClick={() => handleSaveEditComment(cmt.id)}
                                                        className="px-4 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                                                    >
                                                        {submittingEditComment
                                                            ? 'Đang lưu...'
                                                            : 'Lưu thay đổi'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="pl-9 space-y-2">
                                                <p
                                                    className={`leading-relaxed whitespace-pre-line ${
                                                        cmt.isDeleted
                                                            ? 'italic text-gray-400'
                                                            : 'text-gray-800 font-medium border-l-2 border-blue-500 pl-2.5'
                                                    }`}
                                                >
                                                    {cmt.content}
                                                </p>

                                                {cmt.images && cmt.images.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 pt-1">
                                                        {cmt.images.map((imgUrl, idx) => (
                                                            <button
                                                                key={idx}
                                                                type="button"
                                                                onClick={() =>
                                                                    setLightboxImage(imgUrl)
                                                                }
                                                                className="w-16 h-16 rounded-xl overflow-hidden border border-gray-200 hover:border-blue-500 cursor-pointer"
                                                            >
                                                                <img
                                                                    src={imgUrl}
                                                                    alt="Đính kèm"
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Replies List */}
                                    {cmt.replies && cmt.replies.length > 0 && (
                                        <div className="ml-8 sm:ml-10 space-y-2.5 border-l-2 border-blue-100 pl-3">
                                            {cmt.replies.map((rep) => {
                                                const isReplyOwner =
                                                    user && String(user.id) === String(rep.userId);
                                                const canDeleteReply =
                                                    isReplyOwner || user?.role === 'ADMIN';

                                                return (
                                                    <div
                                                        key={rep.id}
                                                        className={`p-3 rounded-xl space-y-1.5 border ${
                                                            rep.isAdminAuthor
                                                                ? 'bg-blue-50/60 border-blue-100'
                                                                : 'bg-gray-50 border-gray-100'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                                            <div className="flex items-center space-x-2">
                                                                <span
                                                                    className={`font-bold text-xs ${
                                                                        rep.isAdminAuthor
                                                                            ? 'text-blue-700'
                                                                            : 'text-gray-900'
                                                                    }`}
                                                                >
                                                                    {rep.userName}
                                                                </span>
                                                                {rep.isAdminAuthor && (
                                                                    <span className="inline-flex items-center space-x-0.5 font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded text-[10px]">
                                                                        <ShieldCheck className="w-3 h-3" />
                                                                        <span>QTV PCStore</span>
                                                                    </span>
                                                                )}
                                                                <span className="text-[10px] text-gray-400">
                                                                    • {rep.date}
                                                                    {rep.isEdited
                                                                        ? ' (Đã chỉnh sửa)'
                                                                        : ''}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center space-x-1.5">
                                                                {isReplyOwner && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setEditingCommentId(
                                                                                rep.id
                                                                            );
                                                                            setEditingCommentText(
                                                                                rep.content
                                                                            );
                                                                            setEditingCommentImages(
                                                                                rep.images || []
                                                                            );
                                                                        }}
                                                                        className="text-gray-400 hover:text-blue-600 p-1 rounded cursor-pointer"
                                                                        title="Sửa phản hồi"
                                                                    >
                                                                        <Edit3 className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                                {canDeleteReply && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setDeleteTarget({
                                                                                type: 'comment',
                                                                                id: rep.id,
                                                                                previewText:
                                                                                    rep.content,
                                                                            })
                                                                        }
                                                                        className="text-gray-400 hover:text-red-600 p-1 rounded cursor-pointer"
                                                                        title="Xóa phản hồi"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {editingCommentId === rep.id ? (
                                                            <div className="space-y-2 pt-1">
                                                                <textarea
                                                                    rows={2}
                                                                    value={editingCommentText}
                                                                    onChange={(e) =>
                                                                        setEditingCommentText(
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className="w-full bg-white border border-blue-400 rounded-xl p-2 text-xs text-gray-800 outline-none"
                                                                />
                                                                <div className="flex items-center justify-end space-x-2">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setEditingCommentId(null)
                                                                        }
                                                                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-200 cursor-pointer"
                                                                    >
                                                                        Hủy
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        disabled={
                                                                            submittingEditComment ||
                                                                            !editingCommentText.trim()
                                                                        }
                                                                        onClick={() =>
                                                                            handleSaveEditComment(
                                                                                rep.id
                                                                            )
                                                                        }
                                                                        className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
                                                                    >
                                                                        Lưu
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <p className="text-gray-700 text-xs leading-relaxed whitespace-pre-line">
                                                                    {rep.content}
                                                                </p>
                                                                {rep.images &&
                                                                    rep.images.length > 0 && (
                                                                        <div className="flex flex-wrap gap-2 pt-1">
                                                                            {rep.images.map(
                                                                                (imgUrl, idx) => (
                                                                                    <button
                                                                                        key={idx}
                                                                                        type="button"
                                                                                        onClick={() =>
                                                                                            setLightboxImage(
                                                                                                imgUrl
                                                                                            )
                                                                                        }
                                                                                        className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 hover:border-blue-500 cursor-pointer"
                                                                                    >
                                                                                        <img
                                                                                            src={
                                                                                                imgUrl
                                                                                            }
                                                                                            alt="Ảnh phản hồi"
                                                                                            className="w-full h-full object-cover"
                                                                                        />
                                                                                    </button>
                                                                                )
                                                                            )}
                                                                        </div>
                                                                    )}
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Inline Reply Input Form */}
                                    {replyingToId === cmt.id && (
                                        <div className="ml-8 sm:ml-10 mt-2 p-3.5 bg-gray-50 rounded-2xl border border-blue-200 space-y-2.5 animate-in fade-in zoom-in-95">
                                            <div className="flex items-center justify-between">
                                                <p className="text-[11px] font-bold text-blue-700 flex items-center space-x-1">
                                                    <CornerDownRight className="w-3.5 h-3.5" />
                                                    <span>
                                                        Phản hồi bình luận của{' '}
                                                        <strong>{replyingToUserName}</strong>:
                                                    </span>
                                                </p>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setReplyingToId(null);
                                                        setReplyText('');
                                                    }}
                                                    className="text-gray-400 hover:text-gray-600 cursor-pointer"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>

                                            <textarea
                                                rows={2}
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                placeholder="Nhập nội dung phản hồi..."
                                                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs text-gray-800 outline-none focus:border-blue-500"
                                            />

                                            {replyFiles.length > 0 && (
                                                <div className="flex flex-wrap gap-2">
                                                    {replyFiles.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-300"
                                                        >
                                                            <img
                                                                src={item.preview}
                                                                alt="Preview"
                                                                className="w-full h-full object-cover"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    URL.revokeObjectURL(
                                                                        item.preview
                                                                    );
                                                                    setReplyFiles((prev) =>
                                                                        prev.filter(
                                                                            (_, i) => i !== idx
                                                                        )
                                                                    );
                                                                }}
                                                                className="absolute top-0 right-0 bg-black/70 text-white p-0.5 rounded-bl cursor-pointer"
                                                            >
                                                                <X className="w-2.5 h-2.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between pt-1">
                                                <div>
                                                    <input
                                                        ref={replyFileInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        multiple
                                                        onChange={(e) =>
                                                            handleSelectCommentImages(e, 'reply')
                                                        }
                                                        className="hidden"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            replyFileInputRef.current?.click()
                                                        }
                                                        className="text-[11px] font-semibold text-gray-600 hover:text-blue-600 flex items-center space-x-1 cursor-pointer"
                                                    >
                                                        <Camera className="w-3.5 h-3.5" />
                                                        <span>Đính kèm ảnh</span>
                                                    </button>
                                                </div>

                                                <div className="flex items-center space-x-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setReplyingToId(null);
                                                            setReplyText('');
                                                        }}
                                                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-200 cursor-pointer"
                                                    >
                                                        Hủy
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            submittingReply ||
                                                            (!replyText.trim() &&
                                                                replyFiles.length === 0)
                                                        }
                                                        onClick={() => handleSubmitReply(cmt.id)}
                                                        className="px-4 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 flex items-center space-x-1 cursor-pointer"
                                                    >
                                                        {submittingReply && (
                                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                        )}
                                                        <span>
                                                            {submittingReply
                                                                ? 'Đang gửi...'
                                                                : 'Gửi phản hồi'}
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ==================== 3. REVIEW CREATE / EDIT MODAL ==================== */}
            {showReviewModal && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !submittingReview) {
                            setShowReviewModal(false);
                        }
                    }}
                >
                    <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="font-extrabold text-sm text-gray-900">
                                    {editingReview
                                        ? 'Chỉnh sửa đánh giá sản phẩm'
                                        : 'Viết đánh giá sản phẩm'}
                                </h3>
                                <p className="text-[11px] text-gray-500 truncate max-w-xs">
                                    {product.title}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowReviewModal(false)}
                                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {reviewFormError && (
                            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start space-x-2">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                                <span>{reviewFormError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
                            <div>
                                <label className="block font-bold text-gray-700 mb-1.5">
                                    Mức độ hài lòng của bạn:
                                </label>
                                <div className="flex items-center space-x-2 bg-amber-50/60 border border-amber-200/70 p-3 rounded-2xl justify-center">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setUserRating(s)}
                                            className="p-1 focus:outline-none transform hover:scale-110 transition-transform cursor-pointer"
                                        >
                                            <Star
                                                className={`w-7 h-7 transition-colors ${
                                                    s <= userRating
                                                        ? 'fill-amber-400 text-amber-400'
                                                        : 'fill-gray-200 text-gray-300'
                                                }`}
                                            />
                                        </button>
                                    ))}
                                    <span className="font-extrabold text-amber-700 ml-2 text-xs">
                                        {userRating}/5 - {RATING_LABELS[userRating]}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Tài khoản đánh giá
                                </label>
                                <input
                                    type="text"
                                    disabled
                                    value={user?.fullName || user?.username || 'Khách hàng'}
                                    className="w-full border border-gray-200 rounded-xl p-2.5 bg-gray-100 text-gray-700 font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-gray-700 mb-1">
                                    Nhận xét chi tiết <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    rows={4}
                                    required
                                    value={reviewComment}
                                    onChange={(e) => setReviewComment(e.target.value)}
                                    placeholder="Chia sẻ trải nghiệm thực tế của bạn về hiệu năng, nhiệt độ, chất lượng đóng gói..."
                                    className="w-full border border-gray-300 rounded-xl p-3 outline-none focus:border-blue-500 leading-relaxed"
                                />
                            </div>

                            {/* Image Attachments for Review */}
                            <div className="space-y-3">
                                <label className="block text-sm font-bold text-gray-700">
                                    Hình ảnh thực tế (Tùy chọn, tối đa 4 ảnh)
                                </label>

                                {reviewExistingImages.length + reviewNewFiles.length < 4 && (
                                    <DragAndDropUpload
                                        multiple={true}
                                        accept="image/*"
                                        maxFiles={4 - (reviewExistingImages.length + reviewNewFiles.length)}
                                        maxSizeMB={32}
                                        title="Kéo thả ảnh thực tế sản phẩm vào đây hoặc"
                                        browseText="chọn từ máy tính"
                                        subtitle={`PNG, JPG, WEBP, GIF · Tối đa ${
                                            4 - (reviewExistingImages.length + reviewNewFiles.length)
                                        } ảnh tiếp theo (32 MB / tệp)`}
                                        onFilesSelect={(files) => {
                                            const validItems: { file: File; preview: string }[] = [];
                                            for (const file of files) {
                                                const check = validateImageFile(file, 32);
                                                if (check.valid) {
                                                    validItems.push({ file, preview: URL.createObjectURL(file) });
                                                }
                                            }
                                            setReviewNewFiles((prev) => [...prev, ...validItems]);
                                        }}
                                    />
                                )}

                                {(reviewExistingImages.length > 0 ||
                                    reviewNewFiles.length > 0) && (
                                    <div className="flex flex-wrap gap-2 pt-1">
                                        {reviewExistingImages.map((url, idx) => (
                                            <div
                                                key={`exist-${idx}`}
                                                className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200"
                                            >
                                                <img
                                                    src={url}
                                                    alt="Ảnh cũ"
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setReviewExistingImages((prev) =>
                                                            prev.filter((_, i) => i !== idx)
                                                        )
                                                    }
                                                    className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 hover:bg-red-600 cursor-pointer"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                        {reviewNewFiles.map((item, idx) => (
                                            <div
                                                key={`new-${idx}`}
                                                className="relative w-16 h-16 rounded-xl overflow-hidden border border-blue-300"
                                            >
                                                <img
                                                    src={item.preview}
                                                    alt="Ảnh mới"
                                                    className="w-full h-full object-cover"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        URL.revokeObjectURL(item.preview);
                                                        setReviewNewFiles((prev) =>
                                                            prev.filter((_, i) => i !== idx)
                                                        );
                                                    }}
                                                    className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 hover:bg-red-600 cursor-pointer"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowReviewModal(false)}
                                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 cursor-pointer"
                                    disabled={submittingReview}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingReview}
                                    className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow flex items-center space-x-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                    {submittingReview && (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    )}
                                    <span>
                                        {submittingReview
                                            ? 'Đang lưu...'
                                            : editingReview
                                            ? 'Cập nhật đánh giá'
                                            : 'Gửi đánh giá'}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ==================== 4. DELETE CONFIRMATION MODAL ==================== */}
            {deleteTarget && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
                    onClick={(e) => {
                        if (e.target === e.currentTarget && !isDeleting) {
                            setDeleteTarget(null);
                        }
                    }}
                >
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
                        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-extrabold text-sm text-gray-900">
                                Xác nhận xóa{' '}
                                {deleteTarget.type === 'review' ? 'đánh giá' : 'bình luận'}?
                            </h4>
                            <p className="text-xs text-gray-500 line-clamp-2 italic px-2">
                                "{deleteTarget.previewText}"
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-2.5 pt-2">
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => setDeleteTarget(null)}
                                className="py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="button"
                                disabled={isDeleting}
                                onClick={handleConfirmDelete}
                                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-50"
                            >
                                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>{isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== 5. IMAGE LIGHTBOX MODAL ==================== */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4"
                    onClick={() => setLightboxImage(null)}
                >
                    <div className="relative max-w-3xl max-h-[85vh]">
                        <button
                            type="button"
                            onClick={() => setLightboxImage(null)}
                            className="absolute -top-3 -right-3 bg-white text-gray-900 rounded-full p-1.5 shadow-lg hover:bg-gray-100 cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <img
                            src={lightboxImage}
                            alt="Xem ảnh lớn"
                            className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductReviews;
