import React, { useState, useRef } from 'react';
import {
    Users,
    UserCheck,
    Shield,
    Lock,
    Unlock,
    Plus,
    Edit,
    Trash2,
    Eye,
    CheckCircle2,
    XCircle,
    X,
    Save,
    Mail,
    Phone,
    Key,
    User,
    ShieldCheck,
    Download,
    Calendar,
    Clock,
    Check,
    Package,
    PieChart,
    Upload,
    Camera,
    Copy,
    BadgeCheck,
    ExternalLink,
    MapPin,
    CreditCard,
    Award,
    Activity
} from 'lucide-react';
import { AdminFilter, type FilterField } from '../../../components/admin/common/filter';
import { AdminTable, type Column } from '../../../components/admin/common/table';
import { AdminModal, type ModalTab } from '../../../components/admin/common/modal';
import { useToast } from '../../../components/admin/common/toast';

export interface UserItem {
    id: string;
    username: string;
    fullName: string;
    email: string;
    phone: string;
    role: 'ADMIN' | 'MANAGER' | 'WAREHOUSE' | 'SALES' | 'STAFF' | 'CUSTOMER';
    status: 'ACTIVE' | 'BLOCKED' | 'UNVERIFIED';
    avatar: string;
    createdAt: string;
    ordersCount: number;
    totalSpent: string;
}

// Mock User Data
const INITIAL_USERS: UserItem[] = [
    {
        id: 'u-1',
        username: 'admin_pcstore',
        fullName: 'Nguyễn Thanh Hải',
        email: 'admin@pcstore.com',
        phone: '0988.123.456',
        role: 'ADMIN',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-01-15',
        ordersCount: 12,
        totalSpent: '145,500,000 ₫',
    },
    {
        id: 'u-2',
        username: 'tran_minh_khoa',
        fullName: 'Trần Minh Khoa',
        email: 'khoa.tran@gmail.com',
        phone: '0912.345.678',
        role: 'STAFF',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-02-10',
        ordersCount: 8,
        totalSpent: '68,200,000 ₫',
    },
    {
        id: 'u-3',
        username: 'le_thi_mai',
        fullName: 'Lê Thị Mai',
        email: 'mai.le@yahoo.com',
        phone: '0977.889.900',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-03-01',
        ordersCount: 15,
        totalSpent: '92,400,000 ₫',
    },
    {
        id: 'u-4',
        username: 'pham_quang_huy',
        fullName: 'Phạm Quang Huy',
        email: 'huy.pq@pcstore.com',
        phone: '0933.456.789',
        role: 'STAFF',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-01-20',
        ordersCount: 5,
        totalSpent: '34,900,000 ₫',
    },
    {
        id: 'u-5',
        username: 'hoang_anh_tuan',
        fullName: 'Hoàng Anh Tuấn',
        email: 'tuan.ha@gmail.com',
        phone: '0909.112.233',
        role: 'CUSTOMER',
        status: 'BLOCKED',
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-02-18',
        ordersCount: 2,
        totalSpent: '12,500,000 ₫',
    },
    {
        id: 'u-6',
        username: 'do_my_linh',
        fullName: 'Đỗ Mỹ Linh',
        email: 'linh.do@outlook.com',
        phone: '0966.554.433',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-03-12',
        ordersCount: 9,
        totalSpent: '54,000,000 ₫',
    },
    {
        id: 'u-7',
        username: 'vu_duc_thang',
        fullName: 'Vũ Đức Thắng',
        email: 'thang.vu@gmail.com',
        phone: '0944.332.211',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-03-15',
        ordersCount: 4,
        totalSpent: '28,700,000 ₫',
    },
    {
        id: 'u-8',
        username: 'bui_ngoc_lan',
        fullName: 'Bùi Ngọc Lan',
        email: 'lan.bn@pcstore.com',
        phone: '0981.234.567',
        role: 'STAFF',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-01-25',
        ordersCount: 7,
        totalSpent: '48,600,000 ₫',
    },
    {
        id: 'u-9',
        username: 'ngo_gia_bao',
        fullName: 'Ngô Gia Bảo',
        email: 'bao.ngo@gmail.com',
        phone: '0922.334.455',
        role: 'CUSTOMER',
        status: 'UNVERIFIED',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-03-22',
        ordersCount: 0,
        totalSpent: '0 ₫',
    },
    {
        id: 'u-10',
        username: 'dang_thu_thao',
        fullName: 'Đặng Thu Thảo',
        email: 'thao.dt@gmail.com',
        phone: '0971.123.789',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-02-28',
        ordersCount: 11,
        totalSpent: '76,300,000 ₫',
    },
    {
        id: 'u-11',
        username: 'dinh_tien_dung',
        fullName: 'Đinh Tiến Dũng',
        email: 'dung.dt@pcstore.com',
        phone: '0962.345.678',
        role: 'STAFF',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-02-05',
        ordersCount: 6,
        totalSpent: '41,500,000 ₫',
    },
    {
        id: 'u-12',
        username: 'nguyen_hoang_nam',
        fullName: 'Nguyễn Hoàng Nam',
        email: 'nam.nh@gmail.com',
        phone: '0938.876.543',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-03-05',
        ordersCount: 14,
        totalSpent: '110,200,000 ₫',
    },
    {
        id: 'u-13',
        username: 'cao_thi_yen',
        fullName: 'Cao Thị Yến',
        email: 'yen.cao@gmail.com',
        phone: '0915.678.901',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-03-18',
        ordersCount: 3,
        totalSpent: '19,800,000 ₫',
    },
    {
        id: 'u-14',
        username: 'phan_van_tai',
        fullName: 'Phan Văn Tài',
        email: 'tai.pv@gmail.com',
        phone: '0979.888.999',
        role: 'CUSTOMER',
        status: 'BLOCKED',
        avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-01-30',
        ordersCount: 1,
        totalSpent: '8,500,000 ₫',
    },
    {
        id: 'u-15',
        username: 'truong_minh_tam',
        fullName: 'Trương Minh Tâm',
        email: 'tam.tm@pcstore.com',
        phone: '0908.765.432',
        role: 'ADMIN',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-01-10',
        ordersCount: 18,
        totalSpent: '185,000,000 ₫',
    },
    {
        id: 'u-16',
        username: 'duong_quynh_nga',
        fullName: 'Dương Quỳnh Nga',
        email: 'nga.dq@gmail.com',
        phone: '0945.123.456',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-02-14',
        ordersCount: 8,
        totalSpent: '56,700,000 ₫',
    },
    {
        id: 'u-17',
        username: 'luu_quang_khai',
        fullName: 'Lưu Quang Khải',
        email: 'khai.lq@gmail.com',
        phone: '0983.333.444',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-03-08',
        ordersCount: 10,
        totalSpent: '72,100,000 ₫',
    },
    {
        id: 'u-18',
        username: 'ta_thi_ngoc',
        fullName: 'Tạ Thị Ngọc',
        email: 'ngoc.ta@gmail.com',
        phone: '0965.888.777',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-03-25',
        ordersCount: 5,
        totalSpent: '38,900,000 ₫',
    },
    {
        id: 'u-19',
        username: 'ha_trong_nghia',
        fullName: 'Hà Trọng Nghĩa',
        email: 'nghia.ht@pcstore.com',
        phone: '0932.111.222',
        role: 'STAFF',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-02-01',
        ordersCount: 7,
        totalSpent: '49,300,000 ₫',
    },
    {
        id: 'u-20',
        username: 'mai_xuan_truong',
        fullName: 'Mai Xuân Trường',
        email: 'truong.mx@gmail.com',
        phone: '0918.444.555',
        role: 'CUSTOMER',
        status: 'UNVERIFIED',
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-03-28',
        ordersCount: 0,
        totalSpent: '0 ₫',
    },
    {
        id: 'u-21',
        username: 'nguyen_duc_huy',
        fullName: 'Nguyễn Đức Huy',
        email: 'huy.nd@gmail.com',
        phone: '0975.666.777',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-02-22',
        ordersCount: 6,
        totalSpent: '44,200,000 ₫',
    },
    {
        id: 'u-22',
        username: 'vo_thi_kim_anh',
        fullName: 'Võ Thị Kim Anh',
        email: 'anh.vo@gmail.com',
        phone: '0948.777.888',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-03-10',
        ordersCount: 13,
        totalSpent: '98,700,000 ₫',
    },
    {
        id: 'u-23',
        username: 'chu_van_an',
        fullName: 'Chu Văn An',
        email: 'an.cv@gmail.com',
        phone: '0925.888.999',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-02-15',
        ordersCount: 4,
        totalSpent: '29,500,000 ₫',
    },
    {
        id: 'u-24',
        username: 'nguyen_thi_hang',
        fullName: 'Nguyễn Thị Hằng',
        email: 'hang.nt@gmail.com',
        phone: '0987.654.321',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-03-02',
        ordersCount: 9,
        totalSpent: '63,800,000 ₫',
    },
    {
        id: 'u-25',
        username: 'vu_hoang_long',
        fullName: 'Vũ Hoàng Long',
        email: 'long.vh@pcstore.com',
        phone: '0903.222.333',
        role: 'STAFF',
        status: 'ACTIVE',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
        createdAt: '2024-01-18',
        ordersCount: 10,
        totalSpent: '81,400,000 ₫',
    },
];

export const UserList: React.FC = () => {
    const { toast } = useToast();
    const [users, setUsers] = useState<UserItem[]>(INITIAL_USERS);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterValues, setFilterValues] = useState<Record<string, any>>({});
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Modal States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

    const [formData, setFormData] = useState({
        username: '',
        fullName: '',
        email: '',
        phone: '',
        password: '',
        avatar: '',
        role: 'CUSTOMER' as UserItem['role'],
        status: 'ACTIVE' as 'ACTIVE' | 'BLOCKED' | 'UNVERIFIED',
    });

    const [roleFormRole, setRoleFormRole] = useState<UserItem['role']>('CUSTOMER');

    // Detail Modal State
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [detailUser, setDetailUser] = useState<UserItem | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const handleCopyText = (text: string, fieldKey: string, label: string = 'thông tin') => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldKey);
        toast.info(`Đã sao chép ${label}: "${text}" vào bộ nhớ tạm!`, 'Sao chép thành công');
        setTimeout(() => {
            setCopiedField(null);
        }, 2000);
    };

    const handleOpenDetailModal = (user: UserItem) => {
        setDetailUser(user);
        setIsDetailModalOpen(true);
    };

    // Tabs for Detail Modal
    const detailModalTabs: ModalTab[] = [
        {
            id: 'info',
            label: 'Thông tin cơ bản',
            icon: User,
        },
        {
            id: 'contact',
            label: 'Thông tin liên hệ',
            icon: Mail,
        },
        {
            id: 'orders',
            label: 'Đơn hàng & Tiêu dùng',
            icon: Package,
            badge: detailUser?.ordersCount ? detailUser.ordersCount : undefined,
        },
        {
            id: 'security',
            label: 'Bảo mật & Trạng thái',
            icon: Shield,
        },
    ];

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserItem | null>(null);
    const [editFormData, setEditFormData] = useState({
        username: '',
        fullName: '',
        email: '',
        phone: '',
        password: '',
        avatar: '',
        address: 'Tầng 5, Tòa nhà FPT, Phố Duy Tân, Phường Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
        role: 'CUSTOMER' as UserItem['role'],
        status: 'ACTIVE' as UserItem['status'],
    });

    const editAvatarInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingEditAvatar, setIsDraggingEditAvatar] = useState(false);

    const handleOpenEditModal = (user: UserItem) => {
        setEditingUser(user);
        setEditFormData({
            username: user.username,
            fullName: user.fullName,
            email: user.email,
            phone: user.phone === 'Chưa cập nhật' ? '' : user.phone,
            password: '',
            avatar: user.avatar,
            address: 'Tầng 5, Tòa nhà FPT, Phố Duy Tân, Phường Dịch Vọng Hậu, Cầu Giấy, Hà Nội',
            role: user.role,
            status: user.status,
        });
        if (editAvatarInputRef.current) {
            editAvatarInputRef.current.value = '';
        }
        setIsEditModalOpen(true);
    };

    const handleEditAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF)', 'Tệp không hợp lệ');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Kích thước ảnh tối đa là 5MB', 'Ảnh quá lớn');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setEditFormData((prev) => ({ ...prev, avatar: event.target?.result as string }));
                toast.success('Đã tải ảnh đại diện mới thành công!', 'Ảnh hợp lệ');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDropEditAvatar = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingEditAvatar(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Vui lòng kéo thả tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF)', 'Tệp không hợp lệ');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Kích thước ảnh tối đa là 5MB', 'Ảnh quá lớn');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setEditFormData((prev) => ({ ...prev, avatar: event.target?.result as string }));
                toast.success('Đã tải ảnh đại diện mới thành công!', 'Ảnh hợp lệ');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveEditAvatar = () => {
        setEditFormData((prev) => ({ ...prev, avatar: '' }));
        if (editAvatarInputRef.current) {
            editAvatarInputRef.current.value = '';
        }
        toast.info('Đã xóa ảnh đại diện đang chọn.', 'Xóa ảnh');
    };

    const handleUpdateUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        const updatedUser: UserItem = {
            ...editingUser,
            username: editFormData.username,
            fullName: editFormData.fullName,
            email: editFormData.email,
            phone: editFormData.phone || 'Chưa cập nhật',
            avatar: editFormData.avatar || editingUser.avatar,
            role: editFormData.role,
            status: editFormData.status,
        };
        setUsers(
            users.map((u) => (u.id === editingUser.id ? updatedUser : u))
        );
        if (detailUser?.id === editingUser.id) {
            setDetailUser(updatedUser);
        }
        setIsEditModalOpen(false);
        toast.success(`Đã cập nhật thông tin tài khoản "${updatedUser.fullName}" thành công!`, 'Cập nhật thành công');
    };

    // Avatar Upload States & Handlers (Add Modal)
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);

    const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF)', 'Tệp không hợp lệ');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Kích thước ảnh đại diện tối đa là 5MB', 'Ảnh quá lớn');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData((prev) => ({ ...prev, avatar: event.target?.result as string }));
                toast.success('Đã tải ảnh đại diện lên thành công!', 'Ảnh hợp lệ');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDropAvatar = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingAvatar(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Vui lòng kéo thả tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF)', 'Tệp không hợp lệ');
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Kích thước ảnh đại diện tối đa là 5MB', 'Ảnh quá lớn');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setFormData((prev) => ({ ...prev, avatar: event.target?.result as string }));
                toast.success('Đã tải ảnh đại diện lên thành công!', 'Ảnh hợp lệ');
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveAvatar = () => {
        setFormData((prev) => ({ ...prev, avatar: '' }));
        if (avatarInputRef.current) {
            avatarInputRef.current.value = '';
        }
        toast.info('Đã xóa ảnh đại diện.', 'Xóa ảnh');
    };

    // Tabs for Add User Modal
    const addUserModalTabs: ModalTab[] = [
        {
            id: 'basic',
            label: 'Thông tin cơ bản',
            icon: User,
        },
        {
            id: 'contact',
            label: 'Thông tin liên hệ',
            icon: Mail,
        },
        {
            id: 'security',
            label: 'Phân quyền & Trạng thái',
            icon: Shield,
        },
    ];

    // Filter Definition
    const filterFields: FilterField[] = [
        {
            id: 'role',
            label: 'Vai trò',
            placeholder: 'Tất cả vai trò',
            icon: Shield,
            options: [
                { label: 'Quản trị viên (ADMIN)', value: 'ADMIN' },
                { label: 'Nhân viên (STAFF)', value: 'STAFF' },
                { label: 'Khách hàng (CUSTOMER)', value: 'CUSTOMER' },
            ],
        },
        {
            id: 'status',
            label: 'Trạng thái',
            placeholder: 'Tất cả trạng thái',
            icon: Lock,
            options: [
                { label: 'Hoạt động (ACTIVE)', value: 'ACTIVE' },
                { label: 'Tạm khóa (BLOCKED)', value: 'BLOCKED' },
                { label: 'Chưa xác thực (UNVERIFIED)', value: 'UNVERIFIED' },
            ],
        },
        {
            id: 'createdDate',
            label: 'Ngày tạo',
            type: 'date',
            icon: Calendar,
        },
    ];

    const userTableColumns: Column<UserItem>[] = [
        {
            key: 'user',
            header: 'Người dùng',
            render: (user) => (
                <div className="flex items-center gap-3">
                    <img
                        src={user.avatar}
                        alt={user.fullName}
                        className="w-9 h-9 rounded-full object-cover border border-gray-200"
                    />
                    <div>
                        <p className="font-bold text-gray-900">{user.fullName}</p>
                        <p className="text-[11px] text-gray-400 font-medium">@{user.username}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'contact',
            header: 'Liên hệ',
            render: (user) => (
                <div>
                    <p className="text-gray-800 flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400" /> {user.email}
                    </p>
                    <p className="text-gray-500 text-[11px] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400" /> {user.phone}
                    </p>
                </div>
            ),
        },
        {
            key: 'role',
            header: 'Vai trò',
            render: (user) => {
                switch (user.role) {
                    case 'ADMIN':
                        return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <Shield className="w-3.5 h-3.5 text-rose-600" /> ADMIN
                            </span>
                        );
                    case 'MANAGER':
                        return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                <PieChart className="w-3.5 h-3.5 text-purple-600" /> QUẢN LÝ
                            </span>
                        );
                    case 'WAREHOUSE':
                        return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Package className="w-3.5 h-3.5 text-indigo-600" /> THỦ KHO
                            </span>
                        );
                    case 'SALES':
                        return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <UserCheck className="w-3.5 h-3.5 text-amber-600" /> BÁN HÀNG
                            </span>
                        );
                    case 'STAFF':
                        return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" /> NHÂN VIÊN
                            </span>
                        );
                    default:
                        return (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                <User className="w-3.5 h-3.5 text-blue-600" /> KHÁCH HÀNG
                            </span>
                        );
                }
            },
        },
        {
            key: 'orders',
            header: 'Đơn hàng / Chi tiêu',
            render: (user) => (
                <div>
                    <p className="font-bold text-gray-900">{user.ordersCount} đơn mua</p>
                    <p className="text-[11px] font-semibold text-blue-600 mt-0.5">{user.totalSpent}</p>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Trạng thái',
            render: (user) =>
                user.status === 'ACTIVE' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hoạt động
                    </span>
                ) : user.status === 'BLOCKED' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        <XCircle className="w-3 h-3 text-rose-600" /> Đã khóa
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <Clock className="w-3 h-3 text-amber-600" /> Chưa xác thực
                    </span>
                ),
        },
        {
            key: 'createdAt',
            header: 'Ngày tạo',
            accessorKey: 'createdAt',
            className: 'font-medium text-gray-600',
        },
        {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (user) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        type="button"
                        onClick={() => handleOpenDetailModal(user)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                        title="Xem chi tiết tài khoản"
                    >
                        <Eye className="w-3.5 h-3.5" />
                    </button>

                    <button
                        type="button"
                        onClick={() => handleOpenEditModal(user)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors border border-amber-200"
                        title="Chỉnh sửa tài khoản"
                    >
                        <Edit className="w-3.5 h-3.5" />
                    </button>

                    <button
                        type="button"
                        onClick={() => handleOpenRoleModal(user)}
                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-purple-200"
                        title="Phân quyền tài khoản"
                    >
                        <Key className="w-3.5 h-3.5" />
                    </button>

                    <button
                        type="button"
                        onClick={() => handleToggleStatus(user.id)}
                        className={`p-1.5 rounded-lg transition-colors border ${user.status === 'ACTIVE'
                            ? 'text-amber-600 border-amber-200 hover:bg-amber-50'
                            : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                            }`}
                        title={user.status === 'ACTIVE' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                    >
                        {user.status === 'ACTIVE' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>

                    <button
                        type="button"
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-600 transition-colors"
                        title="Xóa tài khoản"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            ),
        },
    ];

    // Filter Logic
    const filteredUsers = users.filter((u) => {
        // Search filter
        const matchesSearch =
            !searchQuery ||
            u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.phone.includes(searchQuery);

        // Role filter
        const matchesRole = !filterValues.role || u.role === filterValues.role;

        // Status filter
        const matchesStatus = !filterValues.status || u.status === filterValues.status;

        // Date filter
        const matchesDate = !filterValues.createdDate || u.createdAt === filterValues.createdDate;

        return matchesSearch && matchesRole && matchesStatus && matchesDate;
    });

    const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    // Handlers
    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        const newUser: UserItem = {
            id: `u-${Date.now()}`,
            username: formData.username,
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone || 'Chưa cập nhật',
            role: formData.role,
            status: formData.status,
            avatar: formData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
            createdAt: new Date().toISOString().split('T')[0],
            ordersCount: 0,
            totalSpent: '0 ₫',
        };
        setUsers([newUser, ...users]);
        setIsAddModalOpen(false);
        toast.success(`Đã thêm mới tài khoản "${newUser.fullName}" thành công!`, 'Tạo tài khoản');
    };

    const handleToggleStatus = (id: string) => {
        const target = users.find((u) => u.id === id);
        const willBeActive = target?.status !== 'ACTIVE';
        setUsers(
            users.map((u) => {
                if (u.id === id) {
                    const updated: UserItem = {
                        ...u,
                        status: willBeActive ? 'ACTIVE' : 'BLOCKED',
                    };
                    if (detailUser?.id === id) {
                        setDetailUser(updated);
                    }
                    return updated;
                }
                return u;
            })
        );
        if (willBeActive) {
            toast.success(`Đã mở khóa tài khoản "${target?.fullName || 'Người dùng'}".`, 'Kích hoạt tài khoản');
        } else {
            toast.warning(`Đã tạm khóa tài khoản "${target?.fullName || 'Người dùng'}".`, 'Khóa tài khoản');
        }
    };

    const handleDeleteUser = (id: string) => {
        const target = users.find((u) => u.id === id);
        if (window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${target?.fullName || ''}"?`)) {
            setUsers(users.filter((u) => u.id !== id));
            if (detailUser?.id === id) {
                setIsDetailModalOpen(false);
                setDetailUser(null);
            }
            toast.error(`Đã xóa tài khoản "${target?.fullName || ''}" khỏi hệ thống!`, 'Xóa tài khoản');
        }
    };

    const handleOpenRoleModal = (user: UserItem) => {
        setSelectedUser(user);
        setRoleFormRole(user.role);
        setIsRoleModalOpen(true);
    };

    const handleSaveRole = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setUsers(
            users.map((u) => {
                if (u.id === selectedUser.id) {
                    const updated: UserItem = { ...u, role: roleFormRole };
                    if (detailUser?.id === selectedUser.id) {
                        setDetailUser(updated);
                    }
                    return updated;
                }
                return u;
            })
        );
        setIsRoleModalOpen(false);
        toast.success(`Đã cập nhật phân quyền "${roleFormRole}" cho tài khoản "${selectedUser.fullName}"!`, 'Phân quyền thành công');
    };


    return (
        <div className="w-full space-y-6 min-w-0 font-sans">
            {/* Header Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
                        <Users className="w-7 h-7 text-blue-600" />
                        <span>Quản lý tài khoản</span>
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Quản lý người dùng, phân quyền truy cập hệ thống và theo dõi trạng thái tài khoản.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => toast.success('Danh sách tài khoản đã được kết xuất ra file Excel thành công!', 'Xuất file thành công')}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl border border-gray-200 shadow-sm transition-colors"
                    >
                        <Download className="w-3.5 h-3.5 text-gray-500" />
                        <span className="hidden sm:inline">Xuất file</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setFormData({
                                username: '',
                                fullName: '',
                                email: '',
                                phone: '',
                                password: '',
                                avatar: '',
                                role: 'CUSTOMER',
                                status: 'ACTIVE',
                            });
                            if (avatarInputRef.current) {
                                avatarInputRef.current.value = '';
                            }
                            setIsAddModalOpen(true);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:opacity-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4 text-white" />
                        <span>Thêm tài khoản</span>
                    </button>
                </div>
            </div>


            {/* Reusable Admin Filter Toolbar */}
            <AdminFilter
                searchQuery={searchQuery}
                onSearchChange={(query) => {
                    setSearchQuery(query);
                    setCurrentPage(1);
                }}
                searchPlaceholder="Tìm kiếm tài khoản"
                fields={filterFields}
                values={filterValues}
                onChange={(vals) => {
                    setFilterValues(vals);
                    setCurrentPage(1);
                }}
            />

            {/* User Data Table */}
            <AdminTable
                columns={userTableColumns}
                data={paginatedUsers}
                rowKey="id"
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredUsers.length}
                pageSize={pageSize}
                pageSizeOptions={[10, 15, 20]}
                onPageChange={(page) => setCurrentPage(page)}
                onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setCurrentPage(1);
                }}
                onRowClick={(user) => handleOpenDetailModal(user)}
                itemUnitName="người dùng"
                emptyText="Không tìm thấy tài khoản người dùng nào thỏa điều kiện."
            />

            {/* MODAL 1: THÊM TÀI KHOẢN (Sử dụng AdminModal dùng chung với Tabs) */}
            <AdminModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Thêm tài khoản mới"
                subtitle="Điền thông tin tài khoản qua các thẻ tab để tránh biểu mẫu quá dài"
                icon={Plus}
                size="lg"
                tabs={addUserModalTabs}
                onSubmit={handleAddUser}
                submitText="Tạo tài khoản"
            >
                {(activeTab) => (
                    <div>
                        {/* Tab 1: Thông tin cơ bản */}
                        {activeTab === 'basic' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Tên đăng nhập (Username) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        placeholder="vd: nguyenvana"
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Họ và tên <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        placeholder="vd: Nguyễn Văn A"
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Mật khẩu khởi tạo
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="Để trống nếu đặt mật khẩu mặc định (123456@)"
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                    <p className="text-[11px] text-gray-400 mt-1">Người dùng có thể đổi lại mật khẩu sau lần đăng nhập đầu tiên</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Ảnh đại diện
                                    </label>
                                    <input
                                        ref={avatarInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleAvatarFileChange}
                                        className="hidden"
                                        id="avatar-file-input"
                                    />
                                    <div
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setIsDraggingAvatar(true);
                                        }}
                                        onDragLeave={() => setIsDraggingAvatar(false)}
                                        onDrop={handleDropAvatar}
                                        className={`flex items-center gap-4 p-3.5 rounded-2xl border border-dashed transition-all ${isDraggingAvatar
                                            ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                                            : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'
                                            }`}
                                    >
                                        {/* Avatar preview */}
                                        <div
                                            onClick={() => avatarInputRef.current?.click()}
                                            className="relative group w-14 h-14 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center cursor-pointer"
                                            title="Bấm để tải ảnh lên"
                                        >
                                            {formData.avatar ? (
                                                <img
                                                    src={formData.avatar}
                                                    alt="Avatar Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <User className="w-7 h-7 text-gray-400" />
                                            )}
                                            <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="w-4 h-4" />
                                            </div>
                                        </div>

                                        {/* Upload button and info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <button
                                                    type="button"
                                                    onClick={() => avatarInputRef.current?.click()}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl border border-gray-200 shadow-sm transition-all"
                                                >
                                                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                                                    <span>Tải ảnh từ máy</span>
                                                </button>

                                                {formData.avatar && (
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveAvatar}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 font-semibold text-xs rounded-xl transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        <span>Xóa ảnh</span>
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-400 mt-1.5">
                                                Kéo thả hoặc bấm để chọn ảnh (JPG, PNG, WEBP, GIF tối đa 5MB)
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 2: Thông tin liên hệ */}
                        {activeTab === 'contact' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Địa chỉ Email <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <input
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="vd: user@pcstore.com"
                                            className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1">Dùng để nhận hóa đơn điện tử và thông báo bảo mật</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Số điện thoại
                                    </label>
                                    <div className="relative">
                                        <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="vd: 0988.123.456"
                                            className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1">Dùng để liên hệ giao hàng và nhận mã xác thực OTP</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Địa chỉ giao hàng mặc định (Tùy chọn)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Tab 3: Phân quyền & Trạng thái */}
                        {activeTab === 'security' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                                        Chọn vai trò hệ thống
                                    </label>
                                    <div className="grid grid-cols-1 grid-cols-5 gap-3">
                                        {[
                                            {
                                                role: 'CUSTOMER',
                                                title: 'Khách hàng',
                                                desc: 'Mua sắm & xem đơn hàng',
                                                icon: User,
                                                color: 'border-blue-200 bg-blue-50/50 text-blue-700',
                                            },
                                            {
                                                role: 'SALES',
                                                title: 'Nhân viên bán hàng',
                                                desc: 'Tư vấn & Bán hàng',
                                                icon: User,
                                                color: 'border-blue-200 bg-blue-50/50 text-blue-700',
                                            },
                                            {
                                                role: 'WAREHOUSE',
                                                title: 'Nhân viên kho',
                                                desc: 'Quản lý & xuất nhập kho',
                                                icon: Package,
                                                color: 'border-purple-200 bg-purple-50/50 text-purple-700',
                                            },
                                            {
                                                role: 'MANAGER',
                                                title: 'Quản lý',
                                                desc: 'Quản lý & báo cáo',
                                                icon: PieChart,
                                                color: 'border-purple-200 bg-purple-50/50 text-purple-700',
                                            },
                                            {
                                                role: 'ADMIN',
                                                title: 'Quản trị viên',
                                                desc: 'Toàn quyền hệ thống',
                                                icon: Shield,
                                                color: 'border-rose-200 bg-rose-50/50 text-rose-700',
                                            },
                                        ].map((r) => {
                                            const isSelected = formData.role === r.role;
                                            const IconComp = r.icon;
                                            return (
                                                <button
                                                    key={r.role}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, role: r.role as any })}
                                                    className={`p-3.5 rounded-xl border text-left transition-all ${isSelected
                                                        ? `${r.color} ring-2 ring-blue-500/20 shadow-sm font-bold`
                                                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <IconComp className="w-4 h-4" />
                                                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                                                    </div>
                                                    <div className="text-xs font-bold">{r.title}</div>
                                                    <div className="text-[10px] text-gray-500 font-normal mt-0.5">{r.desc}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Trạng thái kích hoạt ban đầu
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <label
                                            className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${formData.status === 'ACTIVE'
                                                ? 'border-emerald-300 bg-emerald-50/60 text-emerald-800 ring-2 ring-emerald-500/20 font-semibold'
                                                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="status"
                                                checked={formData.status === 'ACTIVE'}
                                                onChange={() => setFormData({ ...formData, status: 'ACTIVE' })}
                                                className="sr-only"
                                            />
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                            <span className="text-xs">Đang hoạt động (ACTIVE)</span>
                                        </label>

                                        <label
                                            className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${formData.status === 'BLOCKED'
                                                ? 'border-rose-300 bg-rose-50/60 text-rose-800 ring-2 ring-rose-500/20 font-semibold'
                                                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="status"
                                                checked={formData.status === 'BLOCKED'}
                                                onChange={() => setFormData({ ...formData, status: 'BLOCKED' })}
                                                className="sr-only"
                                            />
                                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                            <span className="text-xs">Tạm khóa (BLOCKED)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </AdminModal>

            {/* MODAL 2: XEM CHI TIẾT TÀI KHOẢN (AdminModal với Tabs) */}
            <AdminModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={detailUser ? `Chi tiết tài khoản: ${detailUser.fullName}` : 'Chi tiết tài khoản'}
                subtitle={detailUser ? `@${detailUser.username} • Mã: ${detailUser.id}` : undefined}
                icon={Eye}
                size="lg"
                tabs={detailModalTabs}
                footer={
                    detailUser && (
                        <div className="flex items-center justify-between w-full">
                            <div className="text-xs text-gray-500 hidden sm:block">
                                Ngày tham gia: <span className="font-semibold text-gray-700">{detailUser.createdAt}</span>
                            </div>
                            <div className="flex items-center gap-2 ml-auto">
                                <button
                                    type="button"
                                    onClick={() => setIsDetailModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Đóng
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleOpenEditModal(detailUser);
                                    }}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                                >
                                    <Edit className="w-3.5 h-3.5" />
                                    <span>Chỉnh sửa tài khoản</span>
                                </button>
                            </div>
                        </div>
                    )
                }
            >
                {(activeTab) => {
                    if (!detailUser) return null;

                    return (
                        <div>
                            {/* Tab 1: Thông tin cơ bản */}
                            {activeTab === 'info' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    {/* Profile header card */}
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-purple-50/50 border border-blue-100/80">
                                        <div className="relative group flex-shrink-0">
                                            <img
                                                src={detailUser.avatar}
                                                alt={detailUser.fullName}
                                                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                                            />
                                            <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow">
                                                {detailUser.status === 'ACTIVE' ? (
                                                    <span className="flex h-3 w-3 relative">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                                    </span>
                                                ) : (
                                                    <span className="block h-3 w-3 rounded-full bg-rose-500"></span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1 text-center sm:text-left min-w-0">
                                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                                <h3 className="text-lg font-bold text-gray-900 tracking-tight">
                                                    {detailUser.fullName}
                                                </h3>
                                                {/* Role Badge */}
                                                {detailUser.role === 'ADMIN' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                                        <Shield className="w-3 h-3 text-rose-600" /> ADMIN
                                                    </span>
                                                )}
                                                {detailUser.role === 'MANAGER' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                                        <PieChart className="w-3 h-3 text-purple-600" /> QUẢN LÝ
                                                    </span>
                                                )}
                                                {detailUser.role === 'WAREHOUSE' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                                        <Package className="w-3 h-3 text-indigo-600" /> THỦ KHO
                                                    </span>
                                                )}
                                                {detailUser.role === 'SALES' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                        <UserCheck className="w-3 h-3 text-amber-600" /> BÁN HÀNG
                                                    </span>
                                                )}
                                                {detailUser.role === 'STAFF' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                                        <ShieldCheck className="w-3 h-3 text-amber-600" /> NHÂN VIÊN
                                                    </span>
                                                )}
                                                {detailUser.role === 'CUSTOMER' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 text-blue-700 border border-blue-200">
                                                        <User className="w-3 h-3 text-blue-600" /> KHÁCH HÀNG
                                                    </span>
                                                )}

                                                {/* Status Badge */}
                                                {detailUser.status === 'ACTIVE' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đang hoạt động
                                                    </span>
                                                ) : detailUser.status === 'BLOCKED' ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-700">
                                                        <XCircle className="w-3 h-3 text-rose-600" /> Đã khóa
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700">
                                                        <Clock className="w-3 h-3 text-amber-600" /> Chưa xác thực
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-xs text-gray-500 mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                                                <span>@{detailUser.username}</span>
                                                <span>•</span>
                                                <span>Mã ID: {detailUser.id}</span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Info grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1">
                                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                                                Tên đăng nhập
                                            </span>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-900 font-mono">
                                                    @{detailUser.username}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyText(detailUser.username, 'username', 'Tên đăng nhập')}
                                                    className="p-1 text-gray-400 hover:text-blue-600 rounded-md transition-colors"
                                                    title="Sao chép tên đăng nhập"
                                                >
                                                    {copiedField === 'username' ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1">
                                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                                                Mã tài khoản (User ID)
                                            </span>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-900 font-mono">
                                                    {detailUser.id}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyText(detailUser.id, 'id', 'Mã tài khoản')}
                                                    className="p-1 text-gray-400 hover:text-blue-600 rounded-md transition-colors"
                                                    title="Sao chép mã tài khoản"
                                                >
                                                    {copiedField === 'id' ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1">
                                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                                                Ngày tham gia
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                                <span className="text-xs font-bold text-gray-900">
                                                    {detailUser.createdAt}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-1">
                                            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                                                Phân loại người dùng
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <BadgeCheck className="w-3.5 h-3.5 text-blue-600" />
                                                <span className="text-xs font-bold text-gray-900">
                                                    {detailUser.role === 'ADMIN'
                                                        ? 'Quản trị viên cấp cao'
                                                        : detailUser.role === 'STAFF' || detailUser.role === 'SALES' || detailUser.role === 'WAREHOUSE' || detailUser.role === 'MANAGER'
                                                            ? 'Nhân sự nội bộ'
                                                            : 'Khách hàng thành viên'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 2: Thông tin liên hệ */}
                            {activeTab === 'contact' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                                                    <Mail className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-semibold text-gray-400">Địa chỉ Email</p>
                                                    <p className="text-xs font-bold text-gray-900">{detailUser.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyText(detailUser.email, 'email', 'Địa chỉ Email')}
                                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg border border-gray-200 transition-colors"
                                                >
                                                    {copiedField === 'email' ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                    <span>{copiedField === 'email' ? 'Đã chép' : 'Chép'}</span>
                                                </button>
                                                <a
                                                    href={`mailto:${detailUser.email}`}
                                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors"
                                                >
                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                    <span>Gửi mail</span>
                                                </a>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-2xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                                    <Phone className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-semibold text-gray-400">Số điện thoại</p>
                                                    <p className="text-xs font-bold text-gray-900">{detailUser.phone}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyText(detailUser.phone, 'phone', 'Số điện thoại')}
                                                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:text-blue-600 hover:bg-white rounded-lg border border-gray-200 transition-colors"
                                                >
                                                    {copiedField === 'phone' ? (
                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                    ) : (
                                                        <Copy className="w-3.5 h-3.5" />
                                                    )}
                                                    <span>{copiedField === 'phone' ? 'Đã chép' : 'Chép'}</span>
                                                </button>
                                                {detailUser.phone !== 'Chưa cập nhật' && (
                                                    <a
                                                        href={`tel:${detailUser.phone}`}
                                                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors"
                                                    >
                                                        <Phone className="w-3.5 h-3.5" />
                                                        <span>Gọi ngay</span>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-2xl space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                                            <MapPin className="w-4 h-4 text-rose-500" />
                                            <span>Địa chỉ giao hàng mặc định</span>
                                        </div>
                                        <p className="text-xs text-gray-600 pl-6">
                                            Tầng 5, Tòa nhà FPT, Phố Duy Tân, Phường Dịch Vọng Hậu, Quận Cầu Giấy, TP. Hà Nội
                                        </p>
                                        <div className="pl-6 pt-1 flex items-center gap-2">
                                            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                Địa chỉ nhà riêng
                                            </span>
                                            <span className="text-[11px] text-gray-400">Giao vào giờ hành chính</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 3: Đơn hàng & Tiêu dùng */}
                            {activeTab === 'orders' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    {/* Metrics Cards */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50">
                                            <div className="flex items-center justify-between text-blue-600 mb-1">
                                                <span className="text-[11px] font-semibold">Tổng đơn hàng</span>
                                                <Package className="w-4 h-4" />
                                            </div>
                                            <p className="text-lg font-bold text-gray-900">{detailUser.ordersCount} đơn</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">Tỉ lệ hoàn thành: 98%</p>
                                        </div>

                                        <div className="p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/50">
                                            <div className="flex items-center justify-between text-emerald-600 mb-1">
                                                <span className="text-[11px] font-semibold">Tổng chi tiêu</span>
                                                <CreditCard className="w-4 h-4" />
                                            </div>
                                            <p className="text-lg font-bold text-emerald-700">{detailUser.totalSpent}</p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">Giá trị trung bình cao</p>
                                        </div>

                                        <div className="p-3.5 rounded-xl border border-amber-100 bg-amber-50/50">
                                            <div className="flex items-center justify-between text-amber-600 mb-1">
                                                <span className="text-[11px] font-semibold">Hạng thành viên</span>
                                                <Award className="w-4 h-4" />
                                            </div>
                                            <p className="text-lg font-bold text-amber-700">
                                                {detailUser.ordersCount >= 10 ? 'VIP Kim Cương' : detailUser.ordersCount >= 5 ? 'VIP Vàng' : 'Thành viên Bạc'}
                                            </p>
                                            <p className="text-[10px] text-gray-500 mt-0.5">Tích điểm: {(detailUser.ordersCount * 120).toLocaleString()} pts</p>
                                        </div>
                                    </div>

                                    {/* Recent Orders List */}
                                    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
                                        <div className="px-4 py-2.5 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-700">Lịch sử đơn hàng gần nhất</span>
                                            <span className="text-[11px] text-gray-400">Hiển thị 3 đơn mua mới nhất</span>
                                        </div>
                                        <div className="divide-y divide-gray-100">
                                            {[
                                                {
                                                    id: '#PC-89211',
                                                    date: '2024-03-12',
                                                    amount: '32,500,000 ₫',
                                                    items: 'PC Gaming RTX 4070 Ti, Màn hình 27" 2K',
                                                    status: 'COMPLETED',
                                                },
                                                {
                                                    id: '#PC-86540',
                                                    date: '2024-02-18',
                                                    amount: '8,900,000 ₫',
                                                    items: 'RAM 32GB DDR5, Bàn phím cơ Custom',
                                                    status: 'COMPLETED',
                                                },
                                                {
                                                    id: '#PC-79102',
                                                    date: '2024-01-05',
                                                    amount: '1,850,000 ₫',
                                                    items: 'Chuột không dây Gaming, Lót chuột RGB',
                                                    status: 'COMPLETED',
                                                },
                                            ].map((ord) => (
                                                <div key={ord.id} className="p-3.5 hover:bg-gray-50/50 transition-colors flex items-center justify-between gap-3">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-xs font-bold text-blue-600">{ord.id}</span>
                                                            <span className="text-[11px] text-gray-400">• {ord.date}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-600 mt-0.5 font-medium">{ord.items}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs font-bold text-gray-900">{ord.amount}</p>
                                                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 mt-0.5">
                                                            <CheckCircle2 className="w-3 h-3" /> Hoàn thành
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Tab 4: Bảo mật & Trạng thái */}
                            {activeTab === 'security' && (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="p-4 rounded-2xl border border-gray-100 bg-gray-50/70 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-900">Trạng thái kích hoạt</h4>
                                                <p className="text-[11px] text-gray-500 mt-0.5">
                                                    Khóa tài khoản sẽ ngăn người dùng đăng nhập vào hệ thống
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleToggleStatus(detailUser.id)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                                                    detailUser.status === 'ACTIVE'
                                                        ? 'border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100'
                                                        : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                                }`}
                                            >
                                                {detailUser.status === 'ACTIVE' ? (
                                                    <>
                                                        <Lock className="w-3.5 h-3.5" />
                                                        <span>Khóa tài khoản</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Unlock className="w-3.5 h-3.5" />
                                                        <span>Mở khóa tài khoản</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                                    <span>Xác thực 2 bước (2FA)</span>
                                                </span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                                    ĐÃ BẬT
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-500">
                                                Bảo vệ tài khoản qua ứng dụng Google Authenticator và SMS OTP.
                                            </p>
                                        </div>

                                        <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                                    <Key className="w-4 h-4 text-purple-600" />
                                                    <span>Mật khẩu</span>
                                                </span>
                                                <span className="text-[10px] text-gray-400">Đổi 35 ngày trước</span>
                                            </div>
                                            <p className="text-[11px] text-gray-500">
                                                Mật khẩu được mã hóa an toàn chuẩn Argon2id.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50/70 border border-gray-100 rounded-2xl space-y-2.5">
                                        <span className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                            <Activity className="w-4 h-4 text-blue-600" />
                                            <span>Nhật ký truy cập gần nhất</span>
                                        </span>
                                        <div className="text-xs text-gray-600 space-y-1.5 pl-5 border-l-2 border-blue-200">
                                            <p className="font-semibold text-gray-800">
                                                Đăng nhập thành công từ Chrome trên Windows 11
                                            </p>
                                            <p className="text-[11px] text-gray-400">
                                                Địa chỉ IP: <span className="font-mono text-gray-700">113.190.234.12</span> • Hôm nay lúc 14:32:10
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                }}
            </AdminModal>

            {/* MODAL 3: CHỈNH SỬA TÀI KHOẢN (AdminModal với Tabs) */}
            <AdminModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title={editingUser ? `Chỉnh sửa: ${editingUser.fullName}` : 'Chỉnh sửa tài khoản'}
                subtitle="Cập nhật thông tin tài khoản, phân quyền và trạng thái hoạt động"
                icon={Edit}
                size="lg"
                tabs={addUserModalTabs}
                onSubmit={handleUpdateUser}
                submitText="Lưu thay đổi"
            >
                {(activeTab) => (
                    <div>
                        {/* Tab 1: Thông tin cơ bản */}
                        {activeTab === 'basic' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Tên đăng nhập (Username) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editFormData.username}
                                        onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                                        placeholder="vd: nguyenvana"
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Họ và tên <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={editFormData.fullName}
                                        onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                                        placeholder="vd: Nguyễn Văn A"
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Mật khẩu mới
                                    </label>
                                    <input
                                        type="password"
                                        value={editFormData.password}
                                        onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                                        placeholder="Để trống nếu không muốn đổi mật khẩu"
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                    <p className="text-[11px] text-gray-400 mt-1">Chỉ điền vào ô này nếu người dùng yêu cầu đặt lại mật khẩu mới</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Ảnh đại diện
                                    </label>
                                    <input
                                        ref={editAvatarInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleEditAvatarFileChange}
                                        className="hidden"
                                        id="edit-avatar-file-input"
                                    />
                                    <div
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            setIsDraggingEditAvatar(true);
                                        }}
                                        onDragLeave={() => setIsDraggingEditAvatar(false)}
                                        onDrop={handleDropEditAvatar}
                                        className={`flex items-center gap-4 p-3.5 rounded-2xl border border-dashed transition-all ${isDraggingEditAvatar
                                            ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                                            : 'border-gray-200 bg-gray-50/50 hover:bg-gray-50'
                                            }`}
                                    >
                                        {/* Avatar preview */}
                                        <div
                                            onClick={() => editAvatarInputRef.current?.click()}
                                            className="relative group w-14 h-14 rounded-full border-2 border-white shadow-sm overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center cursor-pointer"
                                            title="Bấm để đổi ảnh"
                                        >
                                            {editFormData.avatar ? (
                                                <img
                                                    src={editFormData.avatar}
                                                    alt="Avatar Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <User className="w-7 h-7 text-gray-400" />
                                            )}
                                            <div className="absolute inset-0 bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Camera className="w-4 h-4" />
                                            </div>
                                        </div>

                                        {/* Upload button and info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <button
                                                    type="button"
                                                    onClick={() => editAvatarInputRef.current?.click()}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl border border-gray-200 shadow-sm transition-all"
                                                >
                                                    <Upload className="w-3.5 h-3.5 text-blue-600" />
                                                    <span>Tải ảnh mới</span>
                                                </button>

                                                {editFormData.avatar && (
                                                    <button
                                                        type="button"
                                                        onClick={handleRemoveEditAvatar}
                                                        className="flex items-center gap-1 px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 font-semibold text-xs rounded-xl transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        <span>Xóa ảnh</span>
                                                    </button>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-gray-400 mt-1.5">
                                                Kéo thả hoặc bấm để chọn ảnh (JPG, PNG, WEBP, GIF tối đa 5MB)
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab 2: Thông tin liên hệ */}
                        {activeTab === 'contact' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Địa chỉ Email <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <input
                                            type="email"
                                            required
                                            value={editFormData.email}
                                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                                            placeholder="vd: user@pcstore.com"
                                            className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Số điện thoại
                                    </label>
                                    <div className="relative">
                                        <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                        <input
                                            type="tel"
                                            value={editFormData.phone}
                                            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                            placeholder="vd: 0988.123.456"
                                            className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Địa chỉ nhận hàng mặc định
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Số nhà, tên đường, phường/xã, quận/huyện..."
                                        value={editFormData.address}
                                        onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                                        className="w-full text-xs px-3.5 py-2.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Tab 3: Phân quyền & Trạng thái */}
                        {activeTab === 'security' && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-2">
                                        Chọn vai trò hệ thống
                                    </label>
                                    <div className="grid grid-cols-1 grid-cols-5 gap-3">
                                        {[
                                            {
                                                role: 'CUSTOMER',
                                                title: 'Khách hàng',
                                                desc: 'Mua sắm & xem đơn hàng',
                                                icon: User,
                                                color: 'border-blue-200 bg-blue-50/50 text-blue-700',
                                            },
                                            {
                                                role: 'SALES',
                                                title: 'Nhân viên bán hàng',
                                                desc: 'Tư vấn & Bán hàng',
                                                icon: UserCheck,
                                                color: 'border-blue-200 bg-blue-50/50 text-blue-700',
                                            },
                                            {
                                                role: 'WAREHOUSE',
                                                title: 'Nhân viên kho',
                                                desc: 'Quản lý & xuất nhập kho',
                                                icon: Package,
                                                color: 'border-purple-200 bg-purple-50/50 text-purple-700',
                                            },
                                            {
                                                role: 'MANAGER',
                                                title: 'Quản lý',
                                                desc: 'Quản lý & báo cáo',
                                                icon: PieChart,
                                                color: 'border-purple-200 bg-purple-50/50 text-purple-700',
                                            },
                                            {
                                                role: 'ADMIN',
                                                title: 'Quản trị viên',
                                                desc: 'Toàn quyền hệ thống',
                                                icon: Shield,
                                                color: 'border-rose-200 bg-rose-50/50 text-rose-700',
                                            },
                                        ].map((r) => {
                                            const isSelected = editFormData.role === r.role;
                                            const IconComp = r.icon;
                                            return (
                                                <button
                                                    key={r.role}
                                                    type="button"
                                                    onClick={() => setEditFormData({ ...editFormData, role: r.role as UserItem['role'] })}
                                                    className={`p-3.5 rounded-xl border text-left transition-all ${isSelected
                                                        ? `${r.color} ring-2 ring-blue-500/20 shadow-sm font-bold`
                                                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <IconComp className="w-4 h-4" />
                                                        {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                                                    </div>
                                                    <div className="text-xs font-bold">{r.title}</div>
                                                    <div className="text-[10px] text-gray-500 font-normal mt-0.5">{r.desc}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Trạng thái tài khoản
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <label
                                            className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${editFormData.status === 'ACTIVE'
                                                ? 'border-emerald-300 bg-emerald-50/60 text-emerald-800 ring-2 ring-emerald-500/20 font-semibold'
                                                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="edit-status"
                                                checked={editFormData.status === 'ACTIVE'}
                                                onChange={() => setEditFormData({ ...editFormData, status: 'ACTIVE' })}
                                                className="sr-only"
                                            />
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                            <span className="text-xs">Đang hoạt động (ACTIVE)</span>
                                        </label>

                                        <label
                                            className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${editFormData.status === 'BLOCKED'
                                                ? 'border-rose-300 bg-rose-50/60 text-rose-800 ring-2 ring-rose-500/20 font-semibold'
                                                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="edit-status"
                                                checked={editFormData.status === 'BLOCKED'}
                                                onChange={() => setEditFormData({ ...editFormData, status: 'BLOCKED' })}
                                                className="sr-only"
                                            />
                                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                                            <span className="text-xs">Tạm khóa (BLOCKED)</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </AdminModal>

            {/* MODAL 4: PHÂN QUYỀN HẠN */}
            {isRoleModalOpen && selectedUser && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                                <Key className="w-5 h-5 text-purple-600" /> Thiết Lập Phân Quyền
                            </h2>
                            <button type="button" onClick={() => setIsRoleModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveRole} className="space-y-4">
                            <div className="flex items-center gap-3 p-3 bg-purple-50/60 border border-purple-100 rounded-xl">
                                <img
                                    src={selectedUser.avatar}
                                    alt={selectedUser.fullName}
                                    className="w-10 h-10 rounded-full object-cover border border-purple-200"
                                />
                                <div>
                                    <h3 className="font-bold text-xs text-gray-900">{selectedUser.fullName}</h3>
                                    <p className="text-[11px] text-gray-500">{selectedUser.email}</p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-800">Chọn vai trò mới:</label>
                                {(['CUSTOMER', 'STAFF', 'ADMIN'] as const).map((r) => (
                                    <button
                                        key={r}
                                        type="button"
                                        onClick={() => setRoleFormRole(r)}
                                        className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${roleFormRole === r
                                            ? 'border-purple-500 bg-purple-50 text-purple-900 font-bold'
                                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span>
                                            {r === 'ADMIN' && '🛡️ Quản trị viên (ADMIN)'}
                                            {r === 'STAFF' && '👷 Nhân viên hệ thống (STAFF)'}
                                            {r === 'CUSTOMER' && '👤 Khách hàng thông thường'}
                                        </span>
                                        {roleFormRole === r && <Check className="w-4 h-4 text-purple-600" />}
                                    </button>
                                ))}
                            </div>

                            <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsRoleModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow flex items-center gap-1.5"
                                >
                                    <Save className="w-4 h-4" />
                                    <span>Lưu Phân Quyền</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserList;