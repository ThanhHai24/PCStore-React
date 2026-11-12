import type {
    SystemLogItem,
    SystemLogFilterParams,
    SystemLogStats,
} from '../types/systemLog';

const STORAGE_KEY = 'pcstore_system_logs_v1';

// Seed initial realistic mock logs
const INITIAL_LOGS: SystemLogItem[] = [
    {
        id: 'LOG-2026-1048',
        timestamp: '2026-11-12T13:58:24',
        actor: {
            id: '1',
            username: 'admin',
            fullName: 'Nguyễn Thành An',
            role: 'ADMIN',
            email: 'admin@pcstore.vn',
            avatar: 'https://ui-avatars.com/api/?name=Nguyễn+Thành+An&background=2563eb&color=fff&bold=true',
        },
        action: 'UPDATE',
        actionTitle: 'Cập nhật giá và tồn kho sản phẩm',
        module: 'PRODUCT',
        level: 'SUCCESS',
        description: 'Đã cập nhật giá bán niêm yết và số lượng tồn kho của VGA ASUS ROG Strix GeForce RTX 4080 Super 16GB.',
        targetEntity: 'Sản phẩm',
        targetId: 'PRD-RTX4080S-01',
        ipAddress: '113.161.42.18',
        userAgent: 'Chrome 131.0 / Windows 11',
        endpoint: '/api/admin/products/PRD-RTX4080S-01',
        httpMethod: 'PUT',
        statusCode: 200,
        executionTimeMs: 84,
        changes: [
            {
                field: 'price',
                fieldName: 'Giá bán niêm yết',
                oldValue: '32.990.000 ₫',
                newValue: '30.490.000 ₫',
            },
            {
                field: 'stockQuantity',
                fieldName: 'Số lượng tồn kho',
                oldValue: 12,
                newValue: 25,
            },
        ],
        requestPayload: {
            productId: 'PRD-RTX4080S-01',
            price: 30490000,
            stockQuantity: 25,
            updatedBy: 'admin',
        },
        responsePayload: {
            success: true,
            message: 'Cập nhật sản phẩm thành công',
            timestamp: '2026-11-12T13:58:24.120Z',
        },
    },
    {
        id: 'LOG-2026-1047',
        timestamp: '2026-11-12T13:42:10',
        actor: {
            id: '12',
            username: 'sales_dung',
            fullName: 'Trần Tiến Dũng',
            role: 'STAFF_SALES',
            email: 'dung.tt@pcstore.vn',
            avatar: 'https://ui-avatars.com/api/?name=Trần+Tiến+Dũng&background=f59e0b&color=fff&bold=true',
        },
        action: 'STATUS_CHANGE',
        actionTitle: 'Chuyển trạng thái đơn hàng',
        module: 'ORDER',
        level: 'SUCCESS',
        description: 'Xác nhận thanh toán và chuyển đơn hàng sang trạng thái "ĐANG ĐÓNG GÓI".',
        targetEntity: 'Đơn hàng',
        targetId: 'ORD-2026-89412',
        ipAddress: '192.168.1.108',
        userAgent: 'Firefox 132.0 / Windows 10',
        endpoint: '/api/orders/ORD-2026-89412/status',
        httpMethod: 'PATCH',
        statusCode: 200,
        executionTimeMs: 65,
        changes: [
            {
                field: 'status',
                fieldName: 'Trạng thái đơn hàng',
                oldValue: 'PENDING_PAYMENT (Chờ thanh toán)',
                newValue: 'PROCESSING (Đang đóng gói xuất kho)',
            },
        ],
        requestPayload: {
            orderCode: 'ORD-2026-89412',
            newStatus: 'PROCESSING',
            note: 'Khách hàng đã chuyển khoản đủ 42.500.000 ₫ qua VNPAY',
        },
        responsePayload: {
            success: true,
            orderId: 'ORD-2026-89412',
            status: 'PROCESSING',
        },
    },
    {
        id: 'LOG-2026-1046',
        timestamp: '2026-11-12T13:30:15',
        actor: {
            id: '99',
            username: 'unknown',
            fullName: 'Không xác định',
            role: 'GUEST',
            email: 'attacker@unknown.net',
            avatar: 'https://ui-avatars.com/api/?name=Anonym&background=ef4444&color=fff&bold=true',
        },
        action: 'LOGIN',
        actionTitle: 'Cảnh báo đăng nhập thất bại liên tiếp',
        module: 'AUTH',
        level: 'WARNING',
        description: 'Phát hiện 5 lần nhập sai mật khẩu liên tiếp vào tài khoản "manager_kho" từ cùng một IP.',
        targetEntity: 'Tài khoản',
        targetId: 'manager_kho',
        ipAddress: '118.69.182.44',
        userAgent: 'Python-requests/2.31.0',
        endpoint: '/api/auth/login',
        httpMethod: 'POST',
        statusCode: 401,
        executionTimeMs: 142,
        errorMessage: 'BadCredentialsException: Tên đăng nhập hoặc mật khẩu không chính xác. IP đã bị đưa vào danh sách theo dõi chống Brute-Force (30 phút).',
        requestPayload: {
            username: 'manager_kho',
            attemptCount: 5,
            clientIp: '118.69.182.44',
        },
    },
    {
        id: 'LOG-2026-1045',
        timestamp: '2026-11-12T13:15:02',
        actor: {
            id: '5',
            username: 'tech_nam',
            fullName: 'Lê Hoàng Nam',
            role: 'STAFF_TECH',
            email: 'nam.lh@pcstore.vn',
            avatar: 'https://ui-avatars.com/api/?name=Lê+Hoàng+Nam&background=06b6d4&color=fff&bold=true',
        },
        action: 'UPDATE',
        actionTitle: 'Tiếp nhận xử lý kỹ thuật và thay thế linh kiện',
        module: 'WARRANTY',
        level: 'SUCCESS',
        description: 'Hoàn tất kiểm tra lỗi VGA quạt không quay, thay thế cụm quạt tản nhiệt Cooler Master cho khách hàng.',
        targetEntity: 'Phiếu bảo hành',
        targetId: 'WR-2026-0042',
        ipAddress: '192.168.1.115',
        userAgent: 'Chrome 131.0 / Windows 11',
        endpoint: '/api/admin/warranty-requests/WR-2026-0042/technical',
        httpMethod: 'PUT',
        statusCode: 200,
        executionTimeMs: 92,
        changes: [
            {
                field: 'handlingStatus',
                fieldName: 'Trạng thái sửa chữa',
                oldValue: 'IN_DIAGNOSIS (Đang chẩn đoán)',
                newValue: 'REPAIRED (Đã sửa chữa xong)',
            },
            {
                field: 'replacedPart',
                fieldName: 'Linh kiện thay thế',
                oldValue: 'Chưa có',
                newValue: 'PART-FAN-RTX40-02 (Cụm fan tản nhiệt)',
            },
        ],
    },
    {
        id: 'LOG-2026-1044',
        timestamp: '2026-11-12T12:45:50',
        actor: {
            id: 'system',
            username: 'system_daemon',
            fullName: 'Dịch vụ Hệ Thống (Cron Job)',
            role: 'SYSTEM',
            avatar: 'https://ui-avatars.com/api/?name=System+Daemon&background=64748b&color=fff&bold=true',
        },
        action: 'PAYMENT_PROCESS',
        actionTitle: 'Lỗi cổng thanh toán VNPAY Webhook Timeout',
        module: 'PAYMENT',
        level: 'ERROR',
        description: 'Gọi Webhook đối soát giao dịch thanh toán VNPAY thất bại do Gateway Timeout (504). Đang kích hoạt cơ chế Retry lần 1.',
        targetEntity: 'Giao dịch VNPAY',
        targetId: 'TXN-VNPAY-994821',
        ipAddress: '10.0.0.4',
        userAgent: 'Internal-Job-Worker/2.4',
        endpoint: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
        httpMethod: 'POST',
        statusCode: 504,
        executionTimeMs: 15420,
        errorMessage: 'SocketTimeoutException: Connect to sandbox.vnpayment.vn:443 timed out after 15000ms.',
        stackTrace: `java.net.SocketTimeoutException: Connect to sandbox.vnpayment.vn:443 timed out
    at java.base/sun.nio.ch.NioSocketImpl.connect(NioSocketImpl.java:571)
    at java.base/java.net.Socket.connect(Socket.java:666)
    at org.apache.http.conn.ssl.SSLSocketFactory.connectSocket(SSLSocketFactory.java:543)
    at com.pcstore.service.payment.VNPayGatewayClient.verifyTransaction(VNPayGatewayClient.java:188)
    at com.pcstore.task.PaymentReconciliationTask.execute(PaymentReconciliationTask.java:76)`,
    },
    {
        id: 'LOG-2026-1043',
        timestamp: '2026-11-12T12:10:00',
        actor: {
            id: '8',
            username: 'warehouse_hai',
            fullName: 'Vũ Thanh Hải',
            role: 'STAFF_WAREHOUSE',
            email: 'hai.vt@pcstore.vn',
            avatar: 'https://ui-avatars.com/api/?name=Vũ+Thanh+Hải&background=6366f1&color=fff&bold=true',
        },
        action: 'CREATE',
        actionTitle: 'Nhập kho lô hàng từ Nhà Cung Cấp ASUS VN',
        module: 'WAREHOUSE',
        level: 'SUCCESS',
        description: 'Tạo phiếu nhập kho NK-2026-0158 bao gồm 50 chiếc Bo mạch chủ ROG Maximus Z790 và 30 VGA RTX 4070 Ti.',
        targetEntity: 'Phiếu nhập kho',
        targetId: 'NK-2026-0158',
        ipAddress: '192.168.1.104',
        userAgent: 'Chrome 131.0 / Windows 10',
        endpoint: '/api/goods-receipts',
        httpMethod: 'POST',
        statusCode: 201,
        executionTimeMs: 135,
        changes: [
            {
                field: 'totalItems',
                fieldName: 'Tổng số sản phẩm nhập',
                oldValue: 0,
                newValue: 80,
            },
            {
                field: 'totalValue',
                fieldName: 'Tổng giá trị nhập',
                oldValue: '0 ₫',
                newValue: '1.240.000.000 ₫',
            },
        ],
    },
    {
        id: 'LOG-2026-1042',
        timestamp: '2026-11-12T11:30:45',
        actor: {
            id: '1',
            username: 'admin',
            fullName: 'Nguyễn Thành An',
            role: 'ADMIN',
            email: 'admin@pcstore.vn',
            avatar: 'https://ui-avatars.com/api/?name=Nguyễn+Thành+An&background=2563eb&color=fff&bold=true',
        },
        action: 'PERMISSION_CHANGE',
        actionTitle: 'Thay đổi quyền hạn tài khoản',
        module: 'USER',
        level: 'SUCCESS',
        description: 'Thăng cấp tài khoản nhân viên "Lê Hoàng Nam" từ KỸ THUẬT VIÊN lên QUẢN LÝ KỸ THUẬT (MANAGER).',
        targetEntity: 'Tài khoản',
        targetId: 'USR-005',
        ipAddress: '113.161.42.18',
        userAgent: 'Chrome 131.0 / Windows 11',
        endpoint: '/api/admin/users/5/role',
        httpMethod: 'PATCH',
        statusCode: 200,
        executionTimeMs: 48,
        changes: [
            {
                field: 'role',
                fieldName: 'Vai trò phân quyền',
                oldValue: 'STAFF_TECH',
                newValue: 'MANAGER',
            },
        ],
    },
    {
        id: 'LOG-2026-1041',
        timestamp: '2026-11-12T11:05:12',
        actor: {
            id: '2',
            username: 'manager_huyen',
            fullName: 'Đỗ Thu Huyền',
            role: 'MANAGER',
            email: 'huyen.dt@pcstore.vn',
            avatar: 'https://ui-avatars.com/api/?name=Đỗ+Thu+Huyền&background=9333ea&color=fff&bold=true',
        },
        action: 'DELETE',
        actionTitle: 'Xóa bình luận có nội dung vi phạm tiêu chuẩn',
        module: 'REVIEW',
        level: 'INFO',
        description: 'Đã xóa 01 bình luận spam quảng cáo và chèn liên kết ngoài trên sản phẩm CPU Intel Core i9-14900K.',
        targetEntity: 'Bình luận',
        targetId: 'CMT-8921',
        ipAddress: '14.162.13.91',
        userAgent: 'Safari 18.1 / macOS Sonoma',
        endpoint: '/api/products/104/comments/8921',
        httpMethod: 'DELETE',
        statusCode: 200,
        executionTimeMs: 52,
    },
    {
        id: 'LOG-2026-1040',
        timestamp: '2026-11-12T10:15:30',
        actor: {
            id: 'system',
            username: 'backup_service',
            fullName: 'Dịch vụ Sao lưu (Database Backup)',
            role: 'SYSTEM',
            avatar: 'https://ui-avatars.com/api/?name=Backup+Service&background=10b981&color=fff&bold=true',
        },
        action: 'BACKUP',
        actionTitle: 'Tự động sao lưu cơ sở dữ liệu định kỳ',
        module: 'SYSTEM',
        level: 'SUCCESS',
        description: 'Sao lưu thành công toàn bộ cơ sở dữ liệu PCStore_Production (dung lượng nén 1.42 GB, lưu trữ an toàn trên Cloud Storage S3).',
        targetEntity: 'Bản sao lưu CSDL',
        targetId: 'BACKUP-20261112-1000',
        ipAddress: '10.0.0.2',
        userAgent: 'pg_dump/16.1',
        endpoint: '/internal/tasks/database-backup',
        httpMethod: 'POST',
        statusCode: 200,
        executionTimeMs: 42350,
    },
    {
        id: 'LOG-2026-1039',
        timestamp: '2026-11-12T09:40:18',
        actor: {
            id: '1',
            username: 'admin',
            fullName: 'Nguyễn Thành An',
            role: 'ADMIN',
            email: 'admin@pcstore.vn',
            avatar: 'https://ui-avatars.com/api/?name=Nguyễn+Thành+An&background=2563eb&color=fff&bold=true',
        },
        action: 'LOGIN',
        actionTitle: 'Đăng nhập trang quản trị thành công',
        module: 'AUTH',
        level: 'INFO',
        description: 'Đăng nhập thành công với vai trò Administrator qua xác thực JWT Bearer Token.',
        targetEntity: 'Phiên làm việc',
        targetId: 'SESSION-AD-991',
        ipAddress: '113.161.42.18',
        userAgent: 'Chrome 131.0 / Windows 11',
        endpoint: '/api/auth/login',
        httpMethod: 'POST',
        statusCode: 200,
        executionTimeMs: 78,
    },
    {
        id: 'LOG-2026-1038',
        timestamp: '2026-11-12T09:12:05',
        actor: {
            id: '3',
            username: 'staff_kho2',
            fullName: 'Phạm Minh Quân',
            role: 'STAFF_WAREHOUSE',
            email: 'quan.pm@pcstore.vn',
            avatar: 'https://ui-avatars.com/api/?name=Phạm+Minh+Quân&background=6366f1&color=fff&bold=true',
        },
        action: 'UPDATE',
        actionTitle: 'Cập nhật mã Serial linh kiện tồn kho',
        module: 'WAREHOUSE',
        level: 'SUCCESS',
        description: 'Đã kích hoạt và gán dải mã Serial cho 20 thanh RAM G.Skill Trident Z5 RGB 32GB.',
        targetEntity: 'Serial linh kiện',
        targetId: 'SN-RAM-GSK-0881...0900',
        ipAddress: '192.168.1.109',
        userAgent: 'Chrome 131.0 / Windows 10',
        endpoint: '/api/product-serials/batch-assign',
        httpMethod: 'POST',
        statusCode: 200,
        executionTimeMs: 110,
    },
    {
        id: 'LOG-2026-1037',
        timestamp: '2026-11-12T08:35:19',
        actor: {
            id: '2',
            username: 'manager_huyen',
            fullName: 'Đỗ Thu Huyền',
            role: 'MANAGER',
            email: 'huyen.dt@pcstore.vn',
            avatar: 'https://ui-avatars.com/api/?name=Đỗ+Thu+Huyền&background=9333ea&color=fff&bold=true',
        },
        action: 'EXPORT',
        actionTitle: 'Xuất báo cáo doanh thu bán hàng tháng 10/2026',
        module: 'SYSTEM',
        level: 'INFO',
        description: 'Đã kết xuất báo cáo thống kê doanh thu và đơn hàng ra định dạng bảng tính Excel (XLSX).',
        targetEntity: 'Báo cáo',
        targetId: 'REPORT-SALES-202610',
        ipAddress: '14.162.13.91',
        userAgent: 'Safari 18.1 / macOS Sonoma',
        endpoint: '/api/admin/reports/sales/export',
        httpMethod: 'GET',
        statusCode: 200,
        executionTimeMs: 820,
    },
    {
        id: 'LOG-2026-1036',
        timestamp: '2026-11-11T22:15:00',
        actor: {
            id: 'system',
            username: 'security_monitor',
            fullName: 'Bộ lọc Bảo mật Hệ thống',
            role: 'SYSTEM',
            avatar: 'https://ui-avatars.com/api/?name=Security+Monitor&background=e11d48&color=fff&bold=true',
        },
        action: 'STATUS_CHANGE',
        actionTitle: 'Chặn IP có hành vi quét cổng (Port Scanning / SQL Injection probe)',
        module: 'SYSTEM',
        level: 'CRITICAL',
        description: 'Tự động kích hoạt quy tắc tường lửa Firewall chặn tạm thời IP 45.154.255.82 do gửi liên tục 120 request có chứa cú pháp SQL Injection.',
        targetEntity: 'Firewall IP Blacklist',
        targetId: 'IP-45.154.255.82',
        ipAddress: '45.154.255.82',
        userAgent: 'sqlmap/1.7.2#stable',
        endpoint: '/api/products?id=1%20UNION%20SELECT%20NULL,username,password%20FROM%20users',
        httpMethod: 'GET',
        statusCode: 403,
        executionTimeMs: 12,
        errorMessage: 'SecurityViolationException: WAF detected SQL Injection pattern in query parameter `id`. IP blocked automatically for 24 hours.',
    },
    {
        id: 'LOG-2026-1035',
        timestamp: '2026-11-11T19:50:41',
        actor: {
            id: '1',
            username: 'admin',
            fullName: 'Nguyễn Thành An',
            role: 'ADMIN',
            email: 'admin@pcstore.vn',
            avatar: 'https://ui-avatars.com/api/?name=Nguyễn+Thành+An&background=2563eb&color=fff&bold=true',
        },
        action: 'CREATE',
        actionTitle: 'Tạo mới danh mục sản phẩm',
        module: 'CATEGORY',
        level: 'SUCCESS',
        description: 'Tạo mới danh mục "Ghế Công Thái Học & Bàn Gaming" thuộc cây danh mục Phụ Kiện PC.',
        targetEntity: 'Danh mục',
        targetId: 'CAT-ERGONOMICS',
        ipAddress: '113.161.42.18',
        userAgent: 'Chrome 131.0 / Windows 11',
        endpoint: '/api/admin/categories',
        httpMethod: 'POST',
        statusCode: 201,
        executionTimeMs: 64,
        changes: [
            {
                field: 'categoryName',
                fieldName: 'Tên danh mục',
                oldValue: 'Chưa có',
                newValue: 'Ghế Công Thái Học & Bàn Gaming',
            },
            {
                field: 'slug',
                fieldName: 'Đường dẫn Slug',
                oldValue: 'Chưa có',
                newValue: 'ghe-cong-thai-hoc-ban-gaming',
            },
        ],
    },
    {
        id: 'LOG-2026-1034',
        timestamp: '2026-11-11T17:22:10',
        actor: {
            id: '12',
            username: 'sales_dung',
            fullName: 'Trần Tiến Dũng',
            role: 'STAFF_SALES',
            email: 'dung.tt@pcstore.vn',
            avatar: 'https://ui-avatars.com/api/?name=Trần+Tiến+Dũng&background=f59e0b&color=fff&bold=true',
        },
        action: 'UPDATE',
        actionTitle: 'Cập nhật địa chỉ nhận hàng của khách hàng',
        module: 'ORDER',
        level: 'SUCCESS',
        description: 'Thay đổi địa chỉ giao hàng theo yêu cầu gọi điện thoại của khách hàng cho đơn hàng ORD-2026-89388.',
        targetEntity: 'Đơn hàng',
        targetId: 'ORD-2026-89388',
        ipAddress: '192.168.1.108',
        userAgent: 'Firefox 132.0 / Windows 10',
        endpoint: '/api/orders/ORD-2026-89388/shipping-address',
        httpMethod: 'PATCH',
        statusCode: 200,
        executionTimeMs: 58,
        changes: [
            {
                field: 'shippingAddress',
                fieldName: 'Địa chỉ giao hàng',
                oldValue: '123 Cầu Giấy, Hà Nội',
                newValue: 'Số 45 Ngõ 165 Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội',
            },
        ],
    },
    {
        id: 'LOG-2026-1033',
        timestamp: '2026-11-11T16:04:30',
        actor: {
            id: 'system',
            username: 'sync_daemon',
            fullName: 'Dịch vụ Đồng bộ Tồn Kho',
            role: 'SYSTEM',
            avatar: 'https://ui-avatars.com/api/?name=Sync+Daemon&background=64748b&color=fff&bold=true',
        },
        action: 'SYNC',
        actionTitle: 'Đồng bộ hóa tồn kho với chi nhánh Showroom 2',
        module: 'WAREHOUSE',
        level: 'SUCCESS',
        description: 'Đã hoàn tất đồng bộ 1.250 mã sản phẩm giữa kho tổng và chi nhánh Showroom Hà Đông.',
        targetEntity: 'Kho chi nhánh',
        targetId: 'BRANCH-HADONG',
        ipAddress: '10.0.0.3',
        userAgent: 'Internal-Sync-Client/1.1',
        endpoint: '/api/warehouse/sync/branch-2',
        httpMethod: 'POST',
        statusCode: 200,
        executionTimeMs: 1420,
    },
    {
        id: 'LOG-2026-1032',
        timestamp: '2026-11-11T14:40:15',
        actor: {
            id: '5',
            username: 'tech_nam',
            fullName: 'Lê Hoàng Nam',
            role: 'STAFF_TECH',
            email: 'nam.lh@pcstore.vn',
            avatar: 'https://ui-avatars.com/api/?name=Lê+Hoàng+Nam&background=06b6d4&color=fff&bold=true',
        },
        action: 'CREATE',
        actionTitle: 'Tạo phiếu tiếp nhận bảo hành tại quầy',
        module: 'WARRANTY',
        level: 'INFO',
        description: 'Tiếp nhận Màn hình Gaming ASUS ROG Swift 360Hz của khách hàng Hoàng Việt Khoa do sọc chỉ ngang.',
        targetEntity: 'Phiếu yêu cầu bảo hành',
        targetId: 'WR-2026-0039',
        ipAddress: '192.168.1.115',
        userAgent: 'Chrome 131.0 / Windows 11',
        endpoint: '/api/admin/warranty-requests',
        httpMethod: 'POST',
        statusCode: 201,
        executionTimeMs: 88,
    },
    {
        id: 'LOG-2026-1031',
        timestamp: '2026-11-11T11:20:00',
        actor: {
            id: '1',
            username: 'admin',
            fullName: 'Nguyễn Thành An',
            role: 'ADMIN',
            email: 'admin@pcstore.vn',
            avatar: 'https://ui-avatars.com/api/?name=Nguyễn+Thành+An&background=2563eb&color=fff&bold=true',
        },
        action: 'UPDATE',
        actionTitle: 'Cập nhật cấu hình hệ thống (Mail SMTP Server)',
        module: 'SYSTEM',
        level: 'SUCCESS',
        description: 'Thay đổi thông số SMTP Gateway máy chủ gửi Email thông báo đơn hàng sang SendGrid Enterprise.',
        targetEntity: 'Cấu hình SMTP',
        targetId: 'CFG-SMTP-01',
        ipAddress: '113.161.42.18',
        userAgent: 'Chrome 131.0 / Windows 11',
        endpoint: '/api/admin/system/config/mail',
        httpMethod: 'PUT',
        statusCode: 200,
        executionTimeMs: 310,
        changes: [
            {
                field: 'smtpHost',
                fieldName: 'Máy chủ SMTP',
                oldValue: 'smtp.gmail.com',
                newValue: 'smtp.sendgrid.net',
            },
            {
                field: 'smtpPort',
                fieldName: 'Cổng kết nối Port',
                oldValue: 587,
                newValue: 465,
            },
        ],
    },
    {
        id: 'LOG-2026-1030',
        timestamp: '2026-11-11T09:15:44',
        actor: {
            id: '12',
            username: 'sales_dung',
            fullName: 'Trần Tiến Dũng',
            role: 'STAFF_SALES',
            email: 'dung.tt@pcstore.vn',
            avatar: 'https://ui-avatars.com/api/?name=Trần+Tiến+Dũng&background=f59e0b&color=fff&bold=true',
        },
        action: 'LOGIN',
        actionTitle: 'Nhân viên bán hàng đăng nhập ca sáng',
        module: 'AUTH',
        level: 'INFO',
        description: 'Đăng nhập thành công vào trang quản lý đơn hàng bán lẻ.',
        targetEntity: 'Phiên làm việc',
        targetId: 'SESSION-SALES-102',
        ipAddress: '192.168.1.108',
        userAgent: 'Firefox 132.0 / Windows 10',
        endpoint: '/api/auth/login',
        httpMethod: 'POST',
        statusCode: 200,
        executionTimeMs: 62,
    },
    {
        id: 'LOG-2026-1029',
        timestamp: '2026-11-10T16:55:10',
        actor: {
            id: '8',
            username: 'warehouse_hai',
            fullName: 'Vũ Thanh Hải',
            role: 'STAFF_WAREHOUSE',
            email: 'hai.vt@pcstore.vn',
            avatar: 'https://ui-avatars.com/api/?name=Vũ+Thanh+Hải&background=6366f1&color=fff&bold=true',
        },
        action: 'UPDATE',
        actionTitle: 'Tạo phiếu hoàn trả linh kiện lỗi cho Nhà Phân Phối',
        module: 'WAREHOUSE',
        level: 'WARNING',
        description: 'Xuất trả 02 Mainboard MSI Z790 phát hiện lỗi chân socket cong ngay khi khui kiện về nhà phân phối Mai Hoàng.',
        targetEntity: 'Phiếu hoàn trả NCC',
        targetId: 'SR-2026-0014',
        ipAddress: '192.168.1.104',
        userAgent: 'Chrome 131.0 / Windows 10',
        endpoint: '/api/warehouse/supplier-returns',
        httpMethod: 'POST',
        statusCode: 201,
        executionTimeMs: 95,
    },
];

class SystemLogService {
    private logs: SystemLogItem[] = [];

    constructor() {
        this.init();
    }

    private init() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    this.logs = parsed;
                    return;
                }
            }
        } catch {
            // ignore
        }
        this.logs = [...INITIAL_LOGS];
        this.save();
    }

    private save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.logs));
        } catch {
            // ignore
        }
    }

    public async getLogs(params: SystemLogFilterParams = {}): Promise<SystemLogItem[]> {
        // Simulate async delay for smooth realistic UI
        await new Promise((resolve) => setTimeout(resolve, 80));

        let result = [...this.logs];

        // 1. Keyword search (ID, Actor, Module, Action, Description, Target, IP, Endpoint)
        if (params.keyword && params.keyword.trim()) {
            const q = params.keyword.trim().toLowerCase();
            result = result.filter((item) => {
                return (
                    item.id.toLowerCase().includes(q) ||
                    item.actionTitle.toLowerCase().includes(q) ||
                    item.description.toLowerCase().includes(q) ||
                    item.actor.fullName.toLowerCase().includes(q) ||
                    item.actor.username.toLowerCase().includes(q) ||
                    item.ipAddress.toLowerCase().includes(q) ||
                    (item.targetId && item.targetId.toLowerCase().includes(q)) ||
                    (item.targetEntity && item.targetEntity.toLowerCase().includes(q)) ||
                    (item.endpoint && item.endpoint.toLowerCase().includes(q))
                );
            });
        }

        // 2. Filter by Level
        if (params.level && params.level !== 'ALL') {
            result = result.filter((item) => item.level === params.level);
        }

        // 3. Filter by Module
        if (params.module && params.module !== 'ALL') {
            result = result.filter((item) => item.module === params.module);
        }

        // 4. Filter by Action
        if (params.action && params.action !== 'ALL') {
            result = result.filter((item) => item.action === params.action);
        }

        // 5. Filter by Date range
        if (params.dateRange && params.dateRange !== 'ALL') {
            const now = new Date();
            let threshold = new Date(0);

            if (params.dateRange === 'today') {
                threshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            } else if (params.dateRange === '3days') {
                threshold = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
            } else if (params.dateRange === '7days') {
                threshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            } else if (params.dateRange === '30days') {
                threshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            }

            result = result.filter((item) => new Date(item.timestamp) >= threshold);
        }

        // 6. Custom start / end date
        if (params.startDate) {
            const start = new Date(params.startDate);
            result = result.filter((item) => new Date(item.timestamp) >= start);
        }
        if (params.endDate) {
            const end = new Date(params.endDate);
            end.setHours(23, 59, 59, 999);
            result = result.filter((item) => new Date(item.timestamp) <= end);
        }

        // Always sort newest first
        result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return result;
    }

    public async getLogById(id: string): Promise<SystemLogItem | null> {
        return this.logs.find((item) => item.id === id) || null;
    }

    public getStats(): SystemLogStats {
        const todayStr = new Date().toISOString().split('T')[0];
        const uniqueActors = new Set<string>();

        let todayCount = 0;
        let successCount = 0;
        let warningCount = 0;
        let errorCount = 0;
        let criticalCount = 0;

        for (const item of this.logs) {
            uniqueActors.add(item.actor.username);
            if (item.timestamp.startsWith(todayStr)) {
                todayCount++;
            }
            if (item.level === 'SUCCESS') successCount++;
            else if (item.level === 'WARNING') warningCount++;
            else if (item.level === 'ERROR') errorCount++;
            else if (item.level === 'CRITICAL') criticalCount++;
        }

        return {
            total: this.logs.length,
            todayCount,
            successCount,
            warningCount,
            errorCount,
            criticalCount,
            uniqueUsersCount: uniqueActors.size,
        };
    }

    public purgeLogs(options: { olderThanDays?: number; level?: string } = {}): number {
        const initialCount = this.logs.length;
        const now = new Date();

        this.logs = this.logs.filter((item) => {
            if (options.level && options.level !== 'ALL' && item.level === options.level) {
                return false;
            }
            if (options.olderThanDays && options.olderThanDays > 0) {
                const itemDate = new Date(item.timestamp);
                const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
                if (diffDays >= options.olderThanDays) {
                    return false;
                }
            }
            return true;
        });

        this.save();
        return initialCount - this.logs.length;
    }

    public resetToDefaults(): void {
        this.logs = [...INITIAL_LOGS];
        this.save();
    }

    public addLog(log: Omit<SystemLogItem, 'id' | 'timestamp'> & { id?: string; timestamp?: string }): SystemLogItem {
        const newLog: SystemLogItem = {
            id: log.id || `LOG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            timestamp: log.timestamp || new Date().toISOString().replace(/\.\d{3}Z$/, ''),
            ...log,
        };

        this.logs.unshift(newLog);
        this.save();
        return newLog;
    }

    public exportToCsv(logsToExport: SystemLogItem[]): void {
        const headers = [
            'Mã Log',
            'Thời Gian',
            'Người Thực Hiện',
            'Tài Khoản',
            'Vai Trò',
            'Phân Hệ',
            'Hành Động',
            'Mô Tả Hoạt Động',
            'Đối Tượng',
            'Mã Đối Tượng',
            'IP',
            'Trình Duyệt',
            'Mức Độ',
            'Mã HTTP',
        ];

        const rows = logsToExport.map((log) => [
            log.id,
            log.timestamp,
            `"${(log.actor.fullName || '').replace(/"/g, '""')}"`,
            log.actor.username,
            log.actor.role,
            log.module,
            log.action,
            `"${(log.description || '').replace(/"/g, '""')}"`,
            log.targetEntity || '',
            log.targetId || '',
            log.ipAddress,
            `"${(log.userAgent || '').replace(/"/g, '""')}"`,
            log.level,
            log.statusCode || '',
        ]);

        const csvContent =
            '\uFEFF' +
            [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nhat_ky_he_thong_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    public exportToJson(logsToExport: SystemLogItem[]): void {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(logsToExport, null, 2)
        )}`;
        const link = document.createElement('a');
        link.href = jsonString;
        link.download = `nhat_ky_he_thong_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

export const systemLogService = new SystemLogService();

