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
import { AdminTable, type Column } from '../../../components/admin/common/table';
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

    // ==================== KPI CALCULATIONS ====================

    const totalReviews = allReviews.length;
    const avgSystemRating =
        totalReviews > 0
            ? (allReviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1)
            : '0.0';
    const positiveReviewsCount = allReviews.filter((r) => r.rating >= 4).length;
    const lowReviewsCount = allReviews.filter((r) => r.rating <= 2).length;

    const totalRootComments = allComments.length;
    const unansweredCommentsCount = allComments.filter(
        (c) => !c.replies.some((rep) => rep.isAdminAuthor)
    ).length;
    const answeredCommentsCount = totalRootComments - unansweredCommentsCount;
    const totalRepliesCount = allComments.reduce((acc, c) => acc + c.replies.length, 0);

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
            render: (item) => (
                <div className="flex items-center gap-3 max-w-xs">
                    {item.productImage && (
                        <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-10 h-10 rounded-xl object-cover border border-gray-200 shrink-0"
                        />
                    )}
                    <div className="min-w-0">
                        <Link
                            to={`/product/${item.productId}#reviews`}
                            target="_blank"
                            className="text-xs font-bold text-gray-900 hover:text-blue-600 line-clamp-1 flex items-center gap-1"
                        >
                            <span className="truncate">
                                {item.productName || `Sản phẩm #${item.productId}`}
                            </span>
                            <ExternalLink className="w-3 h-3 shrink-0 text-gray-400" />
                        </Link>
                        <span className="text-[11px] text-gray-400 font-mono">
                            ID SP: #{item.productId}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'customer',
            header: 'Khách hàng',
            render: (item) => (
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                        {item.userAvatar ? (
                            <img
                                src={item.userAvatar}
                                alt={item.userName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <User className="w-4 h-4" />
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-900">{item.userName}</p>
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> Đã mua hàng
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'rating',
            header: 'Đánh giá',
            align: 'center',
            render: (item) => (
                <div className="inline-flex flex-col items-center gap-1">
                    <div className="flex items-center space-x-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                    s <= item.rating
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'fill-gray-200 text-gray-200'
                                }`}
                            />
                        ))}
                    </div>
                    <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.rating >= 4
                                ? 'bg-emerald-50 text-emerald-700'
                                : item.rating === 3
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-rose-50 text-rose-700'
                        }`}
                    >
                        {item.rating}/5 sao
                    </span>
                </div>
            ),
        },
        {
            key: 'comment',
            header: 'Nội dung nhận xét',
            render: (item) => (
                <div className="max-w-md space-y-1.5">
                    <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">
                        {item.comment || <span className="italic text-gray-400">Không có lời bình</span>}
                    </p>
                    {item.images && item.images.length > 0 && (
                        <div className="flex items-center gap-1.5">
                            {item.images.map((img, i) => (
                                <img
                                    key={i}
                                    src={img}
                                    alt="Ảnh"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxUrl(img);
                                    }}
                                    className="w-8 h-8 rounded-lg object-cover border border-gray-200 cursor-pointer hover:border-blue-500"
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
            render: (item) => (
                <div className="text-xs text-gray-500">
                    <p>{item.date}</p>
                    {item.isEdited && (
                        <span className="text-[10px] text-amber-600 font-medium">Đã chỉnh sửa</span>
                    )}
                </div>
            ),
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (item) => (
                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={() => setSelectedReview(item)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Xem chi tiết đánh giá"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            setDeleteTarget({
                                type: 'review',
                                productId: String(item.productId),
                                id: item.id,
                                title: `Đánh giá ${item.rating} sao của ${item.userName}`,
                                subtitle: item.comment,
                            })
                        }
                        className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa đánh giá"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    const commentColumns: Column<CommentItem>[] = [
        {
            key: 'product',
            header: 'Sản phẩm',
            render: (item) => (
                <div className="flex items-center gap-3 max-w-xs">
                    {item.productImage && (
                        <img
                            src={item.productImage}
                            alt={item.productName}
                            className="w-10 h-10 rounded-xl object-cover border border-gray-200 shrink-0"
                        />
                    )}
                    <div className="min-w-0">
                        <Link
                            to={`/product/${item.productId}#reviews`}
                            target="_blank"
                            className="text-xs font-bold text-gray-900 hover:text-blue-600 line-clamp-1 flex items-center gap-1"
                        >
                            <span className="truncate">
                                {item.productName || `Sản phẩm #${item.productId}`}
                            </span>
                            <ExternalLink className="w-3 h-3 shrink-0 text-gray-400" />
                        </Link>
                        <span className="text-[11px] text-gray-400 font-mono">
                            ID SP: #{item.productId}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'author',
            header: 'Người gửi',
            render: (item) => (
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-bold text-xs flex items-center justify-center shrink-0">
                        <User className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-900">{item.userName}</p>
                        {item.isAdminAuthor ? (
                            <span className="text-[10px] text-blue-600 font-bold">QTV PCStore</span>
                        ) : (
                            <span className="text-[10px] text-gray-400">Khách hàng</span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'content',
            header: 'Câu hỏi / Bình luận',
            render: (item) => (
                <div className="max-w-md space-y-1">
                    <p className="text-xs text-gray-800 font-medium line-clamp-2 leading-relaxed">
                        {item.content}
                    </p>
                    {item.images && item.images.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-0.5">
                            {item.images.map((img, i) => (
                                <img
                                    key={i}
                                    src={img}
                                    alt="Ảnh"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLightboxUrl(img);
                                    }}
                                    className="w-8 h-8 rounded-lg object-cover border border-gray-200 cursor-pointer"
                                />
                            ))}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái phản hồi',
            align: 'center',
            render: (item) => {
                const hasAdminReply = item.replies.some((r) => r.isAdminAuthor);
                return (
                    <div className="inline-flex flex-col items-center gap-1">
                        {hasAdminReply ? (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Đã trả lời ({item.replies.length})</span>
                            </span>
                        ) : (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Chờ QTV phản hồi</span>
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'date',
            header: 'Thời gian',
            render: (item) => <span className="text-xs text-gray-500">{item.date}</span>,
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (item) => (
                <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedComment(item);
                            setReplyText('');
                            setReplyFiles([]);
                        }}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                        title="Xem hội thoại & trả lời khách hàng"
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Trả lời</span>
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            setDeleteTarget({
                                type: 'comment',
                                productId: String(item.productId),
                                id: item.id,
                                title: `Bình luận của ${item.userName}`,
                                subtitle: item.content,
                            })
                        }
                        className="p-1.5 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa bình luận"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-xl font-extrabold text-gray-900 flex items-center gap-2.5">
                        <MessageSquare className="w-6 h-6 text-blue-600" />
                        <span>Quản lý Đánh giá & Bình luận Sản phẩm</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Theo dõi đánh giá sao từ khách hàng đã mua và phản hồi câu hỏi tư vấn trực tuyến
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    <AdminButton
                        type="button"
                        variant="secondary"
                        icon={RefreshCw}
                        onClick={fetchAllData}
                        isLoading={loading}
                    >
                        Làm mới dữ liệu
                    </AdminButton>
                </div>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-xs w-fit">
                <button
                    type="button"
                    onClick={() => setActiveTab('reviews')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        activeTab === 'reviews'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <Star className="w-4 h-4" />
                    <span>Đánh giá sản phẩm ({totalReviews})</span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('comments')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                        activeTab === 'comments'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    <MessageSquare className="w-4 h-4" />
                    <span>Hỏi đáp & Bình luận ({totalRootComments})</span>
                    {unansweredCommentsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-black">
                            {unansweredCommentsCount} chờ
                        </span>
                    )}
                </button>
            </div>

            {/* KPI Cards */}
            {activeTab === 'reviews' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500">Tổng lượt đánh giá</p>
                            <p className="text-2xl font-black text-gray-900 mt-1">{totalReviews}</p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Star className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500">Điểm sao trung bình</p>
                            <p className="text-2xl font-black text-amber-500 mt-1">
                                {avgSystemRating} / 5.0
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
                            <Star className="w-5 h-5 fill-amber-400" />
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500">
                                Đánh giá tích cực (4-5 sao)
                            </p>
                            <p className="text-2xl font-black text-emerald-600 mt-1">
                                {positiveReviewsCount}
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500">
                                Cần lưu ý (1-2 sao)
                            </p>
                            <p className="text-2xl font-black text-rose-600 mt-1">
                                {lowReviewsCount}
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500">
                                Tổng câu hỏi / bình luận
                            </p>
                            <p className="text-2xl font-black text-gray-900 mt-1">
                                {totalRootComments}
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500">
                                Chờ QTV phản hồi
                            </p>
                            <p className="text-2xl font-black text-amber-600 mt-1">
                                {unansweredCommentsCount}
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500">Đã phản hồi</p>
                            <p className="text-2xl font-black text-emerald-600 mt-1">
                                {answeredCommentsCount}
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-gray-500">
                                Tổng lượt phản hồi
                            </p>
                            <p className="text-2xl font-black text-indigo-600 mt-1">
                                {totalRepliesCount}
                            </p>
                        </div>
                        <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <CornerDownRight className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            )}

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
                        <div className="flex items-center justify-between w-full">
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
                    <div className="space-y-5 text-xs">
                        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                                {selectedReview.productImage && (
                                    <img
                                        src={selectedReview.productImage}
                                        alt={selectedReview.productName}
                                        className="w-14 h-14 rounded-xl object-cover border border-gray-200"
                                    />
                                )}
                                <div>
                                    <p className="font-extrabold text-sm text-gray-900">
                                        {selectedReview.productName ||
                                            `Sản phẩm #${selectedReview.productId}`}
                                    </p>
                                    <Link
                                        to={`/product/${selectedReview.productId}#reviews`}
                                        target="_blank"
                                        className="text-blue-600 hover:underline font-bold inline-flex items-center gap-1 mt-1"
                                    >
                                        <span>Mở trang chi tiết sản phẩm</span>
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </Link>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs inline-flex items-center gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Đã mua hàng (COMPLETED)
                                </span>
                            </div>
                        </div>

                        <div className="p-5 rounded-2xl border border-gray-200 space-y-3 bg-white">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <div>
                                    <p className="font-bold text-sm text-gray-900">
                                        Khách hàng: {selectedReview.userName}
                                    </p>
                                    <p className="text-gray-400 text-[11px]">
                                        Mã KH: #{selectedReview.userId} • Thời gian:{' '}
                                        {selectedReview.date}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star
                                            key={s}
                                            className={`w-5 h-5 ${
                                                s <= selectedReview.rating
                                                    ? 'fill-amber-400 text-amber-400'
                                                    : 'fill-gray-200 text-gray-200'
                                            }`}
                                        />
                                    ))}
                                </div>
                            </div>

                            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                                {selectedReview.comment}
                            </p>

                            {selectedReview.images && selectedReview.images.length > 0 && (
                                <div className="pt-2 space-y-2">
                                    <p className="font-bold text-gray-600">
                                        Hình ảnh đính kèm ({selectedReview.images.length}):
                                    </p>
                                    <div className="flex flex-wrap gap-3">
                                        {selectedReview.images.map((url, idx) => (
                                            <img
                                                key={idx}
                                                src={url}
                                                alt="Ảnh đánh giá"
                                                onClick={() => setLightboxUrl(url)}
                                                className="w-24 h-24 rounded-xl object-cover border border-gray-200 hover:border-blue-500 cursor-pointer shadow-xs"
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
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
                        {/* Product Banner */}
                        <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                                {selectedComment.productImage && (
                                    <img
                                        src={selectedComment.productImage}
                                        alt={selectedComment.productName}
                                        className="w-12 h-12 rounded-xl object-cover border border-gray-200"
                                    />
                                )}
                                <div>
                                    <p className="font-bold text-gray-900 text-sm">
                                        {selectedComment.productName ||
                                            `Sản phẩm #${selectedComment.productId}`}
                                    </p>
                                    <Link
                                        to={`/product/${selectedComment.productId}#reviews`}
                                        target="_blank"
                                        className="text-blue-600 hover:underline font-semibold inline-flex items-center gap-1"
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

                        {/* Root Question Card */}
                        <div className="p-4 rounded-2xl bg-white border border-gray-200 space-y-2 shadow-2xs">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-sm text-gray-900">
                                        {selectedComment.userName}
                                    </span>
                                    <span className="text-gray-400">• {selectedComment.date}</span>
                                </div>
                                <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 font-mono text-[10px]">
                                    Comment #{selectedComment.id}
                                </span>
                            </div>
                            <p className="text-gray-800 text-sm font-medium border-l-3 border-blue-500 pl-3 py-0.5 whitespace-pre-line">
                                {selectedComment.content}
                            </p>
                            {selectedComment.images && selectedComment.images.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {selectedComment.images.map((img, i) => (
                                        <img
                                            key={i}
                                            src={img}
                                            alt="Ảnh câu hỏi"
                                            onClick={() => setLightboxUrl(img)}
                                            className="w-20 h-20 rounded-xl object-cover border border-gray-200 cursor-pointer"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Replies List */}
                        <div className="space-y-3">
                            <h4 className="font-extrabold text-gray-800 uppercase tracking-wider text-[11px]">
                                Danh sách phản hồi ({selectedComment.replies.length})
                            </h4>

                            {selectedComment.replies.length === 0 ? (
                                <div className="p-4 rounded-2xl bg-amber-50/50 border border-dashed border-amber-200 text-amber-800 text-center">
                                    Câu hỏi này chưa có phản hồi. Hãy nhập câu trả lời của QTV bên dưới!
                                </div>
                            ) : (
                                <div className="space-y-2.5 pl-4 border-l-2 border-blue-200">
                                    {selectedComment.replies.map((rep) => {
                                        const isMyReply =
                                            user && String(user.id) === String(rep.userId);
                                        return (
                                            <div
                                                key={rep.id}
                                                className={`p-3.5 rounded-2xl border space-y-1.5 ${
                                                    rep.isAdminAuthor
                                                        ? 'bg-blue-50/60 border-blue-200'
                                                        : 'bg-gray-50 border-gray-200'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-gray-900">
                                                            {rep.userName}
                                                        </span>
                                                        {rep.isAdminAuthor && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                                                                <ShieldCheck className="w-3 h-3" />
                                                                <span>QTV PCStore</span>
                                                            </span>
                                                        )}
                                                        <span className="text-gray-400 text-[11px]">
                                                            • {rep.date}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1">
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
                                                                className="p-1 text-gray-500 hover:text-blue-600 rounded cursor-pointer"
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
                                                            className="p-1 text-gray-500 hover:text-rose-600 rounded cursor-pointer"
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
                                                            className="w-full bg-white border border-blue-400 rounded-xl p-2.5 text-xs outline-none"
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    setEditingReplyId(null)
                                                                }
                                                                className="px-3 py-1 rounded-lg bg-gray-200 text-gray-700 font-semibold cursor-pointer"
                                                            >
                                                                Hủy
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={savingReplyEdit}
                                                                onClick={() =>
                                                                    handleSaveReplyEdit(rep.id)
                                                                }
                                                                className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold cursor-pointer"
                                                            >
                                                                {savingReplyEdit
                                                                    ? 'Đang lưu...'
                                                                    : 'Lưu'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <p className="text-gray-800 whitespace-pre-line leading-relaxed">
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
                                                                        className="w-16 h-16 rounded-lg object-cover border border-gray-200 cursor-pointer"
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

                        {/* Admin Reply Input Form */}
                        <form
                            onSubmit={handleSendAdminReply}
                            className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-3"
                        >
                            <label className="block font-extrabold text-blue-900 text-xs flex items-center gap-1.5">
                                <CornerDownRight className="w-4 h-4 text-blue-600" />
                                <span>Gửi phản hồi chính thức từ QTV PCStore:</span>
                            </label>
                            <textarea
                                rows={3}
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Nhập nội dung tư vấn, giải đáp cho khách hàng..."
                                className="w-full bg-white border border-gray-300 rounded-xl p-3 text-xs text-gray-800 outline-none focus:border-blue-500"
                            />

                            {replyFiles.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {replyFiles.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="relative w-14 h-14 rounded-xl overflow-hidden border border-blue-300"
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
                                                className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 cursor-pointer"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex items-center justify-between">
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
                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                                    >
                                        <Camera className="w-4 h-4" />
                                        <span>Đính kèm ảnh minh họa</span>
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={
                                        submittingReply ||
                                        (!replyText.trim() && replyFiles.length === 0)
                                    }
                                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                                >
                                    {submittingReply ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
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
                        className="max-w-3xl max-h-[85vh] rounded-2xl object-contain"
                    />
                </div>
            )}
        </div>
    );
};

export default ReviewCommentList;

