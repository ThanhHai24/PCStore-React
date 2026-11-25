import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Star,
    MessageSquare,
    Trash2,
    Eye,
    RefreshCw,
    CheckCircle2,
    AlertTriangle,
    ExternalLink,
    Send,
    ShieldCheck,
    User,
    Package,
    CornerDownRight,
    Camera,
    X,
    Edit3,
    Loader2,
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import {
    AdminTable,
    AdminActionDropdown,
    type Column,
} from '../../../components/admin/common/table';
import {
    AdminModal,
    AdminButton,
} from '../../../components/admin/common/modal';
import { AdminConfirmModal } from '../../../components/admin/common/confirmModal';
import { useToast } from '../../../components/admin/common/toast';
import { useAuth } from '../../../context/AuthContext';
import { getProducts, getDefaultImageForProduct } from '../../../services/productService';
import {
    reviewCommentService,
    syncAdminUserDirectoryIfPossible,
} from '../../../services/reviewCommentService';
import { uploadImage, validateImageFile } from '../../../services/imgbbService';
import type { ReviewItem, CommentItem } from '../../../types/review';
import type { ProductResponse } from '../../../types/adminProduct';

export const ReviewCommentList: React.FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();

    // Active management tab: 'reviews' | 'comments'
    const [activeTab, setActiveTab] = useState<'reviews' | 'comments'>('reviews');

    // Catalog products & aggregated items
    const [products, setProducts] = useState<ProductResponse[]>([]);
    const [allReviews, setAllReviews] = useState<ReviewItem[]>([]);
    const [allComments, setAllComments] = useState<CommentItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    // Search & Filters
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterValues, setFilterValues] = useState<Record<string, any>>({
        productId: '',
        rating: '',
        replyStatus: '',
    });

    // Pagination
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(10);

    // Selected Review Detail Modal
    const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);

    // Selected Comment Thread Modal (for viewing & replying)
    const [selectedComment, setSelectedComment] = useState<CommentItem | null>(null);
    const [replyText, setReplyText] = useState<string>('');
    const [replyFiles, setReplyFiles] = useState<{ file: File; preview: string }[]>([]);
    const [submittingReply, setSubmittingReply] = useState<boolean>(false);
    const replyFileRef = useRef<HTMLInputElement>(null);

    // Edit reply inside modal
    const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
    const [editingReplyText, setEditingReplyText] = useState<string>('');
    const [editingReplyImages, setEditingReplyImages] = useState<string[]>([]);
    const [savingReplyEdit, setSavingReplyEdit] = useState<boolean>(false);

    // Delete Confirm Modal
    const [deleteTarget, setDeleteTarget] = useState<{
        type: 'review' | 'comment';
        productId: string;
        id: string;
        title: string;
        subtitle: string;
    } | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);

    // Lightbox image
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    // Fetch all products + their reviews and comments
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            await syncAdminUserDirectoryIfPossible(user?.role || 'ADMIN');

            const prodRes = await getProducts({ page: 0, size: 50, sort: ['id,desc'] });
            const prodList = prodRes.content || [];
            setProducts(prodList);

            const reviewsCollector: ReviewItem[] = [];
            const commentsCollector: CommentItem[] = [];

            await Promise.all(
                prodList.map(async (prod) => {
                    const firstUrl = prod.imageUrl?.split(';')[0]?.trim();
                    const prodImg =
                        firstUrl && !firstUrl.includes('example.com')
                            ? firstUrl
                            : getDefaultImageForProduct(prod);

                    const [revSettled, cmtSettled] = await Promise.allSettled([
                        reviewCommentService.getProductReviews(prod.id, 0, 50, {
                            name: prod.name,
                            image: prodImg,
                        }),
                        reviewCommentService.getProductComments(prod.id, 0, 50, {
                            name: prod.name,
                            image: prodImg,
                        }),
                    ]);

                    if (revSettled.status === 'fulfilled') {
                        reviewsCollector.push(...revSettled.value.reviews);
                    }
                    if (cmtSettled.status === 'fulfilled') {
                        commentsCollector.push(
                            ...cmtSettled.value.comments.filter((c) => !c.isDeleted)
                        );
                    }
                })
            );

            reviewsCollector.sort(
                (a, b) =>
                    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );
            commentsCollector.sort(
                (a, b) =>
                    new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
            );

            setAllReviews(reviewsCollector);
            setAllComments(commentsCollector);
        } catch (err: any) {
            toast.error(err.message || 'Không thể tải dữ liệu đánh giá & bình luận.');
        } finally {
            setLoading(false);
        }
    }, [user?.role, toast]);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Reset page when switching tabs or filters
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery, filterValues]);

    // ==================== TAB COUNTERS ====================

    const totalReviews = allReviews.length;
    const totalRootComments = allComments.length;
    const unansweredCommentsCount = allComments.filter(
        (c) => !c.replies.some((rep) => rep.isAdminAuthor)
    ).length;

    // ==================== FILTERED LISTS ====================

    const filteredReviews = React.useMemo(() => {
        return allReviews.filter((r) => {
            if (filterValues.productId && String(r.productId) !== String(filterValues.productId)) {
                return false;
            }
            if (filterValues.rating && Math.round(r.rating) !== Number(filterValues.rating)) {
                return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchName = (r.userName || '').toLowerCase().includes(q);
                const matchProduct = (r.productName || '').toLowerCase().includes(q);
                const matchComment = (r.comment || '').toLowerCase().includes(q);
                if (!matchName && !matchProduct && !matchComment) return false;
            }
            return true;
        });
    }, [allReviews, filterValues, searchQuery]);

    const filteredComments = React.useMemo(() => {
        return allComments.filter((c) => {
            if (filterValues.productId && String(c.productId) !== String(filterValues.productId)) {
                return false;
            }
            const hasAdminReply = c.replies.some((rep) => rep.isAdminAuthor);
            if (filterValues.replyStatus === 'UNANSWERED' && hasAdminReply) {
                return false;
            }
            if (filterValues.replyStatus === 'ANSWERED' && !hasAdminReply) {
                return false;
            }
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase().trim();
                const matchUser = (c.userName || '').toLowerCase().includes(q);
                const matchProduct = (c.productName || '').toLowerCase().includes(q);
                const matchContent = (c.content || '').toLowerCase().includes(q);
                if (!matchUser && !matchProduct && !matchContent) return false;
            }
            return true;
        });
    }, [allComments, filterValues, searchQuery]);

    const currentDataList = activeTab === 'reviews' ? filteredReviews : filteredComments;
    const totalPages = Math.max(1, Math.ceil(currentDataList.length / pageSize));
    const paginatedReviews = filteredReviews.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );
    const paginatedComments = filteredComments.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    // ==================== ADMIN ACTIONS ====================

    const handleSendAdminReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedComment || !user) return;
        if (!replyText.trim() && replyFiles.length === 0) return;

        setSubmittingReply(true);
        try {
            const uploadedUrls: string[] = [];
            for (const f of replyFiles) {
                const url = await uploadImage(f.file);
                uploadedUrls.push(url);
            }

            const createdReply = await reviewCommentService.replyComment(
                selectedComment.productId,
                selectedComment.id,
                {
                    content: replyText.trim() || 'Đã gửi hình ảnh đính kèm',
                    images: uploadedUrls,
                    author: {
                        id: user.id,
                        fullName: `QTV ${user.fullName || user.username}`,
                        avatar: user.avatar,
                        role: user.role || 'ADMIN',
                    },
                }
            );

            const updatedComment: CommentItem = {
                ...selectedComment,
                replies: [...selectedComment.replies, createdReply],
            };

            setSelectedComment(updatedComment);
            setAllComments((prev) =>
                prev.map((c) => (c.id === updatedComment.id ? updatedComment : c))
            );

            replyFiles.forEach((f) => URL.revokeObjectURL(f.preview));
            setReplyFiles([]);
            setReplyText('');
            toast.success('Đã gửi phản hồi QTV thành công!');
        } catch (err: any) {
            toast.error(err.message || 'Không thể gửi phản hồi.');
        } finally {
            setSubmittingReply(false);
        }
    };

    const handleSaveReplyEdit = async (replyId: string) => {
        if (!selectedComment || !user || !editingReplyText.trim()) return;
        setSavingReplyEdit(true);
        try {
            const updatedReply = await reviewCommentService.updateComment(
                selectedComment.productId,
                replyId,
                {
                    content: editingReplyText.trim(),
                    images: editingReplyImages,
                    author: {
                        id: user.id,
                        fullName: `QTV ${user.fullName || user.username}`,
                        avatar: user.avatar,
                        role: user.role || 'ADMIN',
                    },
                }
            );

            const updatedComment: CommentItem = {
                ...selectedComment,
                replies: selectedComment.replies.map((r) =>
                    r.id === replyId ? updatedReply : r
                ),
            };
            setSelectedComment(updatedComment);
            setAllComments((prev) =>
                prev.map((c) => (c.id === updatedComment.id ? updatedComment : c))
            );
            setEditingReplyId(null);
            setEditingReplyText('');
            toast.success('Đã cập nhật nội dung phản hồi!');
        } catch (err: any) {
            toast.error(err.message || 'Không thể cập nhật phản hồi.');
        } finally {
            setSavingReplyEdit(false);
        }
    };

    const handleDeleteReplyInModal = async (replyId: string) => {
        if (!selectedComment) return;
        try {
            await reviewCommentService.deleteComment(selectedComment.productId, replyId);
            const updatedComment: CommentItem = {
                ...selectedComment,
                replies: selectedComment.replies.filter((r) => r.id !== replyId),
            };
            setSelectedComment(updatedComment);
            setAllComments((prev) =>
                prev.map((c) => (c.id === updatedComment.id ? updatedComment : c))
            );
            toast.success('Đã xóa phản hồi!');
        } catch (err: any) {
            toast.error(err.message || 'Không thể xóa phản hồi.');
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            if (deleteTarget.type === 'review') {
                await reviewCommentService.deleteReview(deleteTarget.productId, deleteTarget.id);
                setAllReviews((prev) =>
                    prev.filter(
                        (r) =>
                            !(
                                String(r.productId) === String(deleteTarget.productId) &&
                                r.id === deleteTarget.id
                            )
                    )
                );
                if (selectedReview?.id === deleteTarget.id) {
                    setSelectedReview(null);
                }
                toast.success('Đã xóa đánh giá sản phẩm thành công!');
            } else {
                await reviewCommentService.deleteComment(deleteTarget.productId, deleteTarget.id);
                setAllComments((prev) =>
                    prev.filter(
                        (c) =>
                            !(
                                String(c.productId) === String(deleteTarget.productId) &&
                                c.id === deleteTarget.id
                            )
                    )
                );
                if (selectedComment?.id === deleteTarget.id) {
                    setSelectedComment(null);
                }
                toast.success('Đã xóa bình luận thành công!');
            }
            setDeleteTarget(null);
        } catch (err: any) {
            toast.error(err.message || 'Không thể xóa dữ liệu.');
        } finally {
            setIsDeleting(false);
        }
    };

    // ==================== FILTER FIELDS & COLUMNS ====================

    const productOptions = React.useMemo(
        () =>
            products.map((p) => ({
                label: `#${p.id} - ${p.name}`,
                value: String(p.id),
            })),
        [products]
    );

    const reviewFilterFields: FilterField[] = [
        {
            name: 'productId',
            label: 'Sản phẩm',
            type: 'select',
            placeholder: 'Tất cả sản phẩm',
            options: productOptions,
            icon: Package,
        },
        {
            name: 'rating',
            label: 'Số sao',
            type: 'select',
            placeholder: 'Tất cả mức sao',
            options: [
                { label: '5 Sao (Tuyệt vời)', value: '5' },
                { label: '4 Sao (Hài lòng)', value: '4' },
                { label: '3 Sao (Bình thường)', value: '3' },
                { label: '2 Sao (Không hài lòng)', value: '2' },
                { label: '1 Sao (Rất tệ)', value: '1' },
            ],
            icon: Star,
        },
    ];

    const commentFilterFields: FilterField[] = [
        {
            name: 'productId',
            label: 'Sản phẩm',
            type: 'select',
            placeholder: 'Tất cả sản phẩm',
            options: productOptions,
            icon: Package,
        },
        {
            name: 'replyStatus',
            label: 'Phản hồi',
            type: 'select',
            placeholder: 'Tất cả trạng thái',
            options: [
                { label: 'Chờ QTV phản hồi', value: 'UNANSWERED' },
                { label: 'Đã có QTV phản hồi', value: 'ANSWERED' },
            ],
            icon: MessageSquare,
        },
    ];

    const reviewColumns: Column<ReviewItem>[] = [
        {
            key: 'product',
            header: 'Sản phẩm',
            align: 'left',
            render: (item) => (
                <div className="flex items-center gap-2.5 max-w-[260px] min-w-0">
                    {item.productImage && (
                        <div className="w-9 h-9 aspect-square rounded-md border border-slate-200 bg-white p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                            <img
                                src={item.productImage}
                                alt={item.productName}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    )}
                    <div className="min-w-0">
                        <Link
                            to={`/product/${item.productId}#reviews`}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[13px] font-medium text-slate-900 hover:text-blue-600 line-clamp-1 flex items-center gap-1"
                        >
                            <span className="truncate">
                                {item.productName || `Sản phẩm #${item.productId}`}
                            </span>
                            <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                        </Link>
                        <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                            #{item.productId}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'customer',
            header: 'Khách hàng & Đánh giá',
            align: 'left',
            render: (item) => (
                <div className="space-y-1 min-w-[140px]">
                    <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-medium text-slate-900 truncate max-w-[160px]" title={item.userName}>
                            {item.userName}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5" aria-label={`${item.rating} trên 5 sao`}>
                            {[1, 2, 3, 4, 5].map((s) => (
                                <Star
                                    key={s}
                                    className={`w-3.5 h-3.5 ${
                                        s <= item.rating
                                            ? 'fill-amber-400 text-amber-400'
                                            : 'fill-slate-200 text-slate-200'
                                    }`}
                                />
                            ))}
                        </div>
                        <span className="text-[11px] font-medium text-slate-600 tabular-nums">
                            {item.rating}/5
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'comment',
            header: 'Nội dung nhận xét',
            align: 'left',
            render: (item) => (
                <div className="max-w-[340px] space-y-1.5">
                    <p className="text-xs text-slate-700 line-clamp-2 break-words leading-relaxed">
                        {item.comment || <span className="text-slate-400">—</span>}
                    </p>
                    {item.images && item.images.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            {item.images.map((img, i) => (
                                <img
                                    key={i}
                                    src={img}
                                    alt="Ảnh đánh giá"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxUrl(img);
                                    }}
                                    className="w-8 h-8 aspect-square rounded-md object-cover border border-slate-200 cursor-pointer hover:border-blue-500 transition-colors"
                                />
                            ))}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'date',
            header: 'Thời gian',
            align: 'right',
            render: (item) => (
                <div className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                    <p>{item.date}</p>
                    {item.isEdited && (
                        <span className="text-[11px] text-slate-400">Đã sửa</span>
                    )}
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (item) => (
                <AdminActionDropdown
                    onView={() => setSelectedReview(item)}
                    viewLabel="Xem chi tiết đánh giá"
                    onDelete={() =>
                        setDeleteTarget({
                            type: 'review',
                            productId: String(item.productId),
                            id: item.id,
                            title: `Đánh giá ${item.rating} sao của ${item.userName}`,
                            subtitle: item.comment,
                        })
                    }
                    deleteLabel="Xóa đánh giá"
                    deleteDescription="Xóa bài đánh giá này khỏi sản phẩm"
                />
            ),
        },
    ];

    const commentColumns: Column<CommentItem>[] = [
        {
            key: 'product',
            header: 'Sản phẩm',
            align: 'left',
            render: (item) => (
                <div className="flex items-center gap-2.5 max-w-[260px] min-w-0">
                    {item.productImage && (
                        <div className="w-9 h-9 aspect-square rounded-md border border-slate-200 bg-white p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                            <img
                                src={item.productImage}
                                alt={item.productName}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    )}
                    <div className="min-w-0">
                        <Link
                            to={`/product/${item.productId}#reviews`}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[13px] font-medium text-slate-900 hover:text-blue-600 line-clamp-1 flex items-center gap-1"
                        >
                            <span className="truncate">
                                {item.productName || `Sản phẩm #${item.productId}`}
                            </span>
                            <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                        </Link>
                        <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                            #{item.productId}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'author',
            header: 'Người gửi',
            align: 'left',
            render: (item) => (
                <div className="flex items-center gap-2.5 min-w-0 max-w-[180px]">
                    <div className="w-8 h-8 rounded-md bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[13px] font-medium text-slate-900 truncate" title={item.userName}>
                            {item.userName}
                        </p>
                        <span className="text-[11px] text-slate-500">
                            {item.isAdminAuthor ? 'QTV PCStore' : 'Khách hàng'}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'content',
            header: 'Câu hỏi / Bình luận',
            align: 'left',
            render: (item) => (
                <div className="max-w-[340px] space-y-1.5">
                    <p className="text-xs text-slate-700 line-clamp-2 break-words leading-relaxed">
                        {item.content}
                    </p>
                    {item.images && item.images.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            {item.images.map((img, i) => (
                                <img
                                    key={i}
                                    src={img}
                                    alt="Ảnh bình luận"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxUrl(img);
                                    }}
                                    className="w-8 h-8 aspect-square rounded-md object-cover border border-slate-200 cursor-pointer hover:border-blue-500 transition-colors"
                                />
                            ))}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            align: 'left',
            render: (item) => {
                const hasAdminReply = item.replies.some((r) => r.isAdminAuthor);
                return hasAdminReply ? (
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span>Đã trả lời</span>
                        <span className="text-slate-400 tabular-nums">({item.replies.length})</span>
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span>Chờ phản hồi</span>
                    </span>
                );
            },
        },
        {
            key: 'date',
            header: 'Thời gian',
            align: 'right',
            render: (item) => (
                <span className="text-xs text-slate-500 tabular-nums whitespace-nowrap">
                    {item.date}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (item) => (
                <AdminActionDropdown
                    actions={[
                        {
                            key: 'reply',
                            label: 'Xem hội thoại & trả lời khách hàng',
                            icon: MessageSquare,
                            variant: 'primary',
                            onClick: () => {
                                setSelectedComment(item);
                                setReplyText('');
                                setReplyFiles([]);
                            },
                        },
                    ]}
                    onDelete={() =>
                        setDeleteTarget({
                            type: 'comment',
                            productId: String(item.productId),
                            id: item.id,
                            title: `Bình luận của ${item.userName}`,
                            subtitle: item.content,
                        })
                    }
                    deleteLabel="Xóa bình luận"
                    deleteDescription="Xóa câu hỏi / bình luận này"
                />
            ),
        },
    ];

    return (
        <div className="w-full space-y-4 min-w-0 font-sans">
            {/* Compact Page Header (Borderless) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                    <h1 className="text-2xl font-semibold text-slate-900 tracking-tight truncate">
                        Quản lý đánh giá & bình luận
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Theo dõi đánh giá sao từ khách hàng đã mua và phản hồi câu hỏi tư vấn trực tuyến
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={fetchAllData}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium text-xs rounded-md border border-slate-200 transition-colors disabled:opacity-60 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
                        <span>Làm mới</span>
                    </button>
                </div>
            </div>

            {/* Segmented Mode Switcher Tabs (No Redundant KPI Cards) */}
            <div
                role="tablist"
                aria-label="Phân loại đánh giá và bình luận"
                className="inline-flex items-center p-1 bg-slate-100 rounded-md border border-slate-200"
            >
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'reviews'}
                    onClick={() => setActiveTab('reviews')}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 ${
                        activeTab === 'reviews'
                            ? 'bg-white text-slate-900 font-semibold border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900 font-medium border border-transparent'
                    }`}
                >
                    <Star className={`w-3.5 h-3.5 ${activeTab === 'reviews' ? 'text-amber-500' : 'text-slate-400'}`} />
                    <span>Đánh giá sản phẩm</span>
                    <span
                        className={`px-1.5 py-0.5 rounded-md text-[11px] font-medium tabular-nums ${
                            activeTab === 'reviews' ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/70 text-slate-600'
                        }`}
                    >
                        {totalReviews}
                    </span>
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'comments'}
                    onClick={() => setActiveTab('comments')}
                    className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40 ${
                        activeTab === 'comments'
                            ? 'bg-white text-slate-900 font-semibold border border-slate-200'
                            : 'text-slate-600 hover:text-slate-900 font-medium border border-transparent'
                    }`}
                >
                    <MessageSquare className={`w-3.5 h-3.5 ${activeTab === 'comments' ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>Hỏi đáp & Bình luận</span>
                    <span
                        className={`px-1.5 py-0.5 rounded-md text-[11px] font-medium tabular-nums ${
                            activeTab === 'comments' ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/70 text-slate-600'
                        }`}
                    >
                        {totalRootComments}
                    </span>
                    {unansweredCommentsCount > 0 && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 tabular-nums">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {unansweredCommentsCount} chờ
                        </span>
                    )}
                </button>
            </div>

            {/* Filter Bar */}
            <AdminFilter
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder={
                    activeTab === 'reviews'
                        ? 'Tìm theo tên sản phẩm, khách hàng hoặc nội dung đánh giá...'
                        : 'Tìm theo tên sản phẩm, người hỏi hoặc nội dung bình luận...'
                }
                fields={activeTab === 'reviews' ? reviewFilterFields : commentFilterFields}
                values={filterValues}
                onChange={setFilterValues}
                onReset={() => {
                    setSearchQuery('');
                    setFilterValues({ productId: '', rating: '', replyStatus: '' });
                }}
            />

            {/* Data Table */}
            {activeTab === 'reviews' ? (
                <AdminTable<ReviewItem>
                    columns={reviewColumns}
                    data={paginatedReviews}
                    rowKey={(r) => `${r.productId}_${r.id}`}
                    loading={loading}
                    emptyText="Chưa có đánh giá sản phẩm nào khớp với bộ lọc."
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredReviews.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                    itemUnitName="đánh giá"
                    onRowClick={(r) => setSelectedReview(r)}
                />
            ) : (
                <AdminTable<CommentItem>
                    columns={commentColumns}
                    data={paginatedComments}
                    rowKey={(c) => `${c.productId}_${c.id}`}
                    loading={loading}
                    emptyText="Chưa có câu hỏi hay bình luận nào khớp với bộ lọc."
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filteredComments.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                    itemUnitName="bình luận"
                    onRowClick={(c) => {
                        setSelectedComment(c);
                        setReplyText('');
                        setReplyFiles([]);
                    }}
                />
            )}

            {/* ==================== MODAL 1: REVIEW DETAIL ==================== */}
            <AdminModal
                isOpen={!!selectedReview}
                onClose={() => setSelectedReview(null)}
                title="Chi tiết Đánh giá Sản phẩm"
                subtitle={selectedReview?.productName || `Sản phẩm #${selectedReview?.productId}`}
                icon={Star}
                showFooter={true}
                footer={
                    selectedReview ? (
                        <div className="flex items-center justify-end gap-3 w-full">
                            <AdminButton
                                type="button"
                                variant="danger"
                                icon={Trash2}
                                onClick={() =>
                                    setDeleteTarget({
                                        type: 'review',
                                        productId: String(selectedReview.productId),
                                        id: selectedReview.id,
                                        title: `Đánh giá của ${selectedReview.userName}`,
                                        subtitle: selectedReview.comment,
                                    })
                                }
                            >
                                Xóa đánh giá này
                            </AdminButton>
                            <AdminButton
                                type="button"
                                variant="secondary"
                                onClick={() => setSelectedReview(null)}
                            >
                                Đóng
                            </AdminButton>
                        </div>
                    ) : undefined
                }
            >
                {selectedReview && (
                    <div className="space-y-4 text-xs">
                        {/* Flat Product Context Strip */}
                        <div className="pb-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                {selectedReview.productImage && (
                                    <div className="w-12 h-12 aspect-square rounded-md border border-slate-200 bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden">
                                        <img
                                            src={selectedReview.productImage}
                                            alt={selectedReview.productName}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="font-semibold text-sm text-slate-900 truncate">
                                        {selectedReview.productName ||
                                            `Sản phẩm #${selectedReview.productId}`}
                                    </p>
                                    <Link
                                        to={`/product/${selectedReview.productId}#reviews`}
                                        target="_blank"
                                        className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1 mt-0.5"
                                    >
                                        <span>Mở trang sản phẩm</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Đã mua hàng
                            </span>
                        </div>

                        {/* Customer & Rating Header */}
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                                <p className="font-semibold text-sm text-slate-900">
                                    {selectedReview.userName}
                                </p>
                                <p className="text-slate-500 text-[11px] tabular-nums mt-0.5">
                                    Mã KH: #{selectedReview.userId} · {selectedReview.date}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                            key={s}
                                            className={`w-4 h-4 ${
                                                s <= selectedReview.rating
                                                    ? 'fill-amber-400 text-amber-400'
                                                    : 'fill-slate-200 text-slate-200'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <span className="text-xs font-semibold text-slate-700 tabular-nums">
                                    {selectedReview.rating}/5
                                </span>
                            </div>
                        </div>

                        {/* Quoted Review Content */}
                        <div className="border-l-2 border-slate-300 bg-slate-50/70 pl-3.5 pr-3 py-2.5 rounded-r-md">
                            <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-line break-words">
                                {selectedReview.comment || 'Không có lời bình.'}
                            </p>
                        </div>

                        {selectedReview.images && selectedReview.images.length > 0 && (
                            <div className="pt-1 space-y-2">
                                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider tabular-nums">
                                    Hình ảnh đính kèm ({selectedReview.images.length})
                                </p>
                                <div className="flex flex-wrap gap-2.5">
                                    {selectedReview.images.map((url, idx) => (
                                        <img
                                            key={idx}
                                            src={url}
                                            alt="Ảnh đánh giá"
                                            onClick={() => setLightboxUrl(url)}
                                            className="w-20 h-20 aspect-square rounded-md object-cover border border-slate-200 hover:border-blue-500 cursor-pointer transition-colors"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </AdminModal>

            {/* ==================== MODAL 2: COMMENT THREAD & ADMIN REPLY ==================== */}
            <AdminModal
                isOpen={!!selectedComment}
                onClose={() => setSelectedComment(null)}
                title="Chi tiết Bình luận & Phản hồi Khách hàng"
                subtitle={selectedComment?.productName || `Sản phẩm #${selectedComment?.productId}`}
                icon={MessageSquare}
                showFooter={false}
            >
                {selectedComment && (
                    <div className="space-y-5 text-xs">
                        {/* Flat Product Context Strip */}
                        <div className="pb-4 border-b border-slate-200 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3 min-w-0">
                                {selectedComment.productImage && (
                                    <div className="w-11 h-11 aspect-square rounded-md border border-slate-200 bg-white p-1 flex items-center justify-center shrink-0 overflow-hidden">
                                        <img
                                            src={selectedComment.productImage}
                                            alt={selectedComment.productName}
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                )}
                                <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 text-sm truncate">
                                        {selectedComment.productName ||
                                            `Sản phẩm #${selectedComment.productId}`}
                                    </p>
                                    <Link
                                        to={`/product/${selectedComment.productId}#reviews`}
                                        target="_blank"
                                        className="text-blue-600 hover:underline font-medium inline-flex items-center gap-1 mt-0.5"
                                    >
                                        <span>Xem trên trang bán hàng</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>

                            <AdminButton
                                type="button"
                                variant="danger"
                                size="sm"
                                icon={Trash2}
                                onClick={() =>
                                    setDeleteTarget({
                                        type: 'comment',
                                        productId: String(selectedComment.productId),
                                        id: selectedComment.id,
                                        title: `Bình luận của ${selectedComment.userName}`,
                                        subtitle: selectedComment.content,
                                    })
                                }
                            >
                                Xóa câu hỏi
                            </AdminButton>
                        </div>

                        {/* Root Question Quote (Flat, Left-Border Accent) */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-semibold text-sm text-slate-900 truncate">
                                        {selectedComment.userName}
                                    </span>
                                    <span className="text-slate-500 tabular-nums shrink-0">· {selectedComment.date}</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-mono tabular-nums text-[11px] shrink-0">
                                    #{selectedComment.id}
                                </span>
                            </div>
                            <div className="border-l-2 border-blue-600 bg-slate-50/70 pl-3.5 pr-3 py-2.5 rounded-r-md">
                                <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-line break-words">
                                    {selectedComment.content}
                                </p>
                            </div>
                            {selectedComment.images && selectedComment.images.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {selectedComment.images.map((img, i) => (
                                        <img
                                            key={i}
                                            src={img}
                                            alt="Ảnh câu hỏi"
                                            onClick={() => setLightboxUrl(img)}
                                            className="w-16 h-16 aspect-square rounded-md object-cover border border-slate-200 hover:border-blue-500 cursor-pointer transition-colors"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Replies List */}
                        <div className="space-y-2.5 pt-1 border-t border-slate-200">
                            <h4 className="font-semibold text-slate-500 uppercase tracking-wider text-[11px] pt-2 tabular-nums">
                                Phản hồi ({selectedComment.replies.length})
                            </h4>

                            {selectedComment.replies.length === 0 ? (
                                <div className="p-3.5 rounded-md bg-slate-50 border border-dashed border-slate-200 text-slate-500 text-center">
                                    Câu hỏi này chưa có phản hồi. Hãy nhập câu trả lời của QTV bên dưới.
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-200 border border-slate-200 rounded-md bg-white">
                                    {selectedComment.replies.map((rep) => {
                                        const isMyReply =
                                            user && String(user.id) === String(rep.userId);
                                        return (
                                            <div
                                                key={rep.id}
                                                className={`p-3.5 space-y-1.5 ${
                                                    rep.isAdminAuthor
                                                        ? 'bg-slate-50/60'
                                                        : 'bg-white'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-slate-900">
                                                            {rep.userName}
                                                        </span>
                                                        {rep.isAdminAuthor && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-white text-blue-700 border border-blue-200">
                                                                <ShieldCheck className="w-3 h-3" />
                                                                <span>QTV PCStore</span>
                                                            </span>
                                                        )}
                                                        <span className="text-slate-400 text-[11px] tabular-nums">
                                                            · {rep.date}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {isMyReply && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setEditingReplyId(rep.id);
                                                                    setEditingReplyText(
                                                                        rep.content
                                                                    );
                                                                    setEditingReplyImages(
                                                                        rep.images || []
                                                                    );
                                                                }}
                                                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                                                                title="Sửa phản hồi"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleDeleteReplyInModal(rep.id)
                                                            }
                                                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600/40"
                                                            title="Xóa phản hồi"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {editingReplyId === rep.id ? (
                                                    <div className="space-y-2 pt-1">
                                                        <textarea
                                                            rows={2}
                                                            value={editingReplyText}
                                                            onChange={(e) =>
                                                                setEditingReplyText(e.target.value)
                                                            }
                                                            className="w-full bg-white border border-slate-300 rounded-md p-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15"
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setEditingReplyId(null)
                                                                }
                                                                className="px-3 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium cursor-pointer"
                                                            >
                                                                Hủy
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={savingReplyEdit}
                                                                onClick={() =>
                                                                    handleSaveReplyEdit(rep.id)
                                                                }
                                                                className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
                                                            >
                                                                {savingReplyEdit
                                                                    ? 'Đang lưu...'
                                                                    : 'Lưu'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <p className="text-slate-700 whitespace-pre-line break-words leading-relaxed">
                                                            {rep.content}
                                                        </p>
                                                        {rep.images && rep.images.length > 0 && (
                                                            <div className="flex flex-wrap gap-2 pt-1">
                                                                {rep.images.map((img, i) => (
                                                                    <img
                                                                        key={i}
                                                                        src={img}
                                                                        alt="Ảnh trả lời"
                                                                        onClick={() =>
                                                                            setLightboxUrl(img)
                                                                        }
                                                                        className="w-16 h-16 aspect-square rounded-md object-cover border border-slate-200 cursor-pointer"
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Flat Admin Reply Input Form */}
                        <form
                            onSubmit={handleSendAdminReply}
                            className="pt-4 border-t border-slate-200 space-y-3"
                        >
                            <label className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                                <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                                <span>Gửi phản hồi chính thức từ QTV PCStore</span>
                            </label>
                            <textarea
                                rows={3}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Nhập nội dung tư vấn, giải đáp cho khách hàng..."
                                className="w-full bg-white border border-slate-200 rounded-md p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15"
                            />

                            {replyFiles.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {replyFiles.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="relative w-14 h-14 aspect-square rounded-md overflow-hidden border border-slate-200"
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
                                                    setReplyFiles((prev) =>
                                                        prev.filter((_, i) => i !== idx)
                                                    );
                                                }}
                                                className="absolute top-0.5 right-0.5 bg-slate-900/75 text-white rounded-md p-0.5 cursor-pointer"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <input
                                        ref={replyFileRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files || []);
                                            const next: { file: File; preview: string }[] = [];
                                            for (const f of files) {
                                                const v = validateImageFile(f, 32);
                                                if (v.valid) {
                                                    next.push({
                                                        file: f,
                                                        preview: URL.createObjectURL(f),
                                                    });
                                                }
                                            }
                                            setReplyFiles((prev) => [...prev, ...next]);
                                            if (replyFileRef.current)
                                                replyFileRef.current.value = '';
                                        }}
                                        className="hidden"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => replyFileRef.current?.click()}
                                        className="text-xs font-medium text-slate-600 hover:text-blue-600 flex items-center gap-1.5 cursor-pointer rounded-md px-2 py-1 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                                    >
                                        <Camera className="w-4 h-4" />
                                        <span>Đính kèm ảnh</span>
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={
                                        submittingReply ||
                                        (!replyText.trim() && replyFiles.length === 0)
                                    }
                                    className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs border border-blue-600 flex items-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
                                >
                                    {submittingReply ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Send className="w-3.5 h-3.5" />
                                    )}
                                    <span>
                                        {submittingReply ? 'Đang gửi...' : 'Gửi phản hồi QTV'}
                                    </span>
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </AdminModal>

            {/* ==================== DELETE CONFIRM MODAL ==================== */}
            <AdminConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleConfirmDelete}
                isLoading={isDeleting}
                variant="danger"
                title={
                    deleteTarget?.type === 'review'
                        ? 'Xác nhận xóa đánh giá sản phẩm?'
                        : 'Xác nhận xóa bình luận?'
                }
                message="Hành động này sẽ xóa mục đã chọn khỏi trang chi tiết sản phẩm."
                itemPreview={
                    deleteTarget
                        ? {
                              title: deleteTarget.title,
                              subtitle: deleteTarget.subtitle,
                          }
                        : undefined
                }
                confirmText="Xóa vĩnh viễn"
            />

            {/* Lightbox */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4"
                    onClick={() => setLightboxUrl(null)}
                >
                    <img
                        src={lightboxUrl}
                        alt="Xem ảnh lớn"
                        className="max-w-3xl max-h-[85vh] rounded-md object-contain"
                    />
                </div>
            )}
        </div>
    );
};

export default ReviewCommentList;

