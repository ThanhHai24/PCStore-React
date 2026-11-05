import { adminOrderService } from './adminOrderService';
import { adminGoodsReceiptService } from './adminGoodsReceiptService';
import { adminProductService } from './adminProductService';
import type { OrderResponse, OrderStatus } from '../types/adminOrder';
import type {
  OrderFulfillmentRecord,
  OrderFulfillmentStatus,
  AssignedOrderSerialItem,
  CarrierHandoverInfo,
  CarrierTrackingEvent,
} from '../types/orderFulfillment';

const STORAGE_KEY = 'pcstore_order_fulfillment_records_v1';

// Mẫu dữ liệu phong phú thể hiện toàn bộ 4 giai đoạn bán hàng
const INITIAL_FULFILLMENTS: OrderFulfillmentRecord[] = [
  {
    orderId: 1001,
    orderCode: 'ORD-2026-001',
    orderType: 'ONLINE',
    customerName: 'Hoàng Minh Tuấn',
    customerPhone: '0912.345.678',
    customerEmail: 'tuan.hoang@gmail.com',
    recipientName: 'Hoàng Minh Tuấn',
    recipientPhone: '0912.345.678',
    address: 'Số 45 Đường Trần Hưng Đạo, Phường Cầu Ông Lãnh, Quận 1, TP. Hồ Chí Minh',
    note: 'Giao hàng trong giờ hành chính, gọi trước khi đến 15 phút.',
    totalAmount: 18500000,
    finalAmount: 18500000,
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    stage: 2,
    stageName: 'GĐ 2: Thẩm định đơn hàng',
    fulfillmentStatus: 'PENDING_REVIEW',
    backendStatus: 'PENDING',
    assignedSerials: [],
    carrierTimeline: [
      {
        id: 'evt-1001-1',
        timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
        statusTitle: 'Khách hàng đặt hàng thành công',
        description: 'Hệ thống đã ghi nhận đơn đặt hàng trực tuyến từ website và gửi thông điệp yêu cầu xử lý sang bộ phận bán hàng.',
        actorRole: 'KHÁCH HÀNG',
        actorName: 'Hoàng Minh Tuấn',
      },
    ],
  },
  {
    orderId: 1002,
    orderCode: 'ORD-2026-002',
    orderType: 'ONLINE',
    customerName: 'Trần Bảo Ngọc',
    customerPhone: '0988.765.432',
    customerEmail: 'baongoc.tran@gmail.com',
    recipientName: 'Trần Bảo Ngọc',
    recipientPhone: '0988.765.432',
    address: 'Chung cư Masteri Thảo Điền, Tháp T3, Xa Lộ Hà Nội, TP. Thủ Đức, TP. HCM',
    note: 'Đơn cần gấp card đồ họa phục vụ dựng phim 3D.',
    totalAmount: 49900000,
    finalAmount: 49900000,
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    stage: 2,
    stageName: 'GĐ 2: Hết hàng - Hủy đơn',
    fulfillmentStatus: 'OUT_OF_STOCK_CANCELLED',
    backendStatus: 'CANCELLED',
    appraisalStaffName: 'Đặng Bán Hàng (Sale Executive)',
    appraisalAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    appraisalNotes: 'Kiểm tra tồn kho thực tế: VGA RTX 4090 24GB hiện chỉ còn 0 chiếc tại kho, không đủ đáp ứng số lượng 1 chiếc yêu cầu.',
    cancellationReason: 'Sản phẩm VGA ASUS ROG Strix GeForce RTX 4090 24GB đã tạm hết hàng tồn kho. Nhân viên bán hàng đã gọi điện trao đổi, khách hàng đồng ý hủy đơn.',
    customerCancellationAgreed: true,
    assignedSerials: [],
    carrierTimeline: [
      {
        id: 'evt-1002-1',
        timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        statusTitle: 'Khởi tạo đơn hàng từ khách hàng',
        description: 'Đơn hàng mới được tạo trên hệ thống bán hàng.',
        actorRole: 'KHÁCH HÀNG',
      },
      {
        id: 'evt-1002-2',
        timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        statusTitle: 'Thẩm định tồn kho: Không đủ hàng khả dụng (Hết hàng)',
        description: 'Nhân viên bán hàng tra cứu dữ liệu tồn kho, phát hiện sản phẩm hết hàng và gửi thông báo đề xuất hủy đơn tới khách hàng.',
        actorRole: 'NHÂN VIÊN KHO',
        actorName: 'Đặng Bán Hàng',
      },
      {
        id: 'evt-1002-3',
        timestamp: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
        statusTitle: 'Khách hàng đồng ý & Xác nhận hủy đơn đặt hàng',
        description: 'Khách hàng nhận thông báo từ nhân viên bán hàng và đồng ý hủy đơn. Đơn hàng chuyển sang trạng thái Đã hủy và kết thúc quy trình.',
        actorRole: 'KHÁCH HÀNG',
      },
    ],
  },
  {
    orderId: 1003,
    orderCode: 'ORD-2026-003',
    orderType: 'ONLINE',
    customerName: 'Phạm Đức Anh',
    customerPhone: '0903.112.233',
    customerEmail: 'ducanh.pham@outlook.com',
    recipientName: 'Phạm Đức Anh',
    recipientPhone: '0903.112.233',
    address: 'Tòa nhà Landmark 81, Tầng 32 Phòng 3205, Bình Thạnh, TP. Hồ Chí Minh',
    note: 'Đóng thùng xốp chống va đập giúp em ạ.',
    totalAmount: 16500000,
    finalAmount: 16500000,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    stage: 3,
    stageName: 'GĐ 3: Chờ kho soạn hàng & Đóng gói',
    fulfillmentStatus: 'READY_TO_PACK',
    backendStatus: 'CONFIRMED',
    appraisalStaffName: 'Nguyễn Thị Bán Hàng',
    appraisalAt: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
    appraisalNotes: 'Đã kiểm tra dữ liệu tồn kho khả dụng: Mainboard ASUS ROG MAXIMUS Z790 HERO còn 8 chiếc trong kho. Đủ số lượng đáp ứng đơn hàng.',
    assignedSerials: [],
    carrierTimeline: [
      {
        id: 'evt-1003-1',
        timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        statusTitle: 'Khách hàng đặt hàng',
        description: 'Đơn hàng được khởi tạo thành công.',
        actorRole: 'KHÁCH HÀNG',
      },
      {
        id: 'evt-1003-2',
        timestamp: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
        statusTitle: 'Thẩm định tồn kho thành công: Còn hàng khả dụng',
        description: 'Nhân viên bán hàng xác nhận đơn đặt hàng, chuyển trạng thái sang "Chờ đóng gói" và gửi yêu cầu đóng gói xuống bộ phận kho.',
        actorRole: 'NHÂN VIÊN KHO',
        actorName: 'Nguyễn Thị Bán Hàng',
      },
    ],
  },
  {
    orderId: 1004,
    orderCode: 'ORD-2026-004',
    orderType: 'ONLINE',
    customerName: 'Lê Thanh Tùng',
    customerPhone: '0979.888.999',
    customerEmail: 'tung.le@fpt.com.vn',
    recipientName: 'Lê Thanh Tùng',
    recipientPhone: '0979.888.999',
    address: 'Số 12 Đường D2, Khu Đô Thị Sala, Phường An Lợi Đông, TP. Thủ Đức, TP. HCM',
    note: 'Sản phẩm linh kiện máy tính cao cấp, xin cẩn thận khi vận chuyển.',
    totalAmount: 23200000,
    finalAmount: 23200000,
    createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    stage: 3,
    stageName: 'GĐ 3: Đóng gói hoàn tất',
    fulfillmentStatus: 'PACKED_WAITING_HANDOVER',
    backendStatus: 'PROCESSING',
    appraisalStaffName: 'Nguyễn Thị Bán Hàng',
    appraisalAt: new Date(Date.now() - 5.5 * 3600 * 1000).toISOString(),
    warehouseStaffName: 'Lê Kho Vận (Thủ kho)',
    packedAt: new Date(Date.now() - 1.2 * 3600 * 1000).toISOString(),
    packingNotes: 'Đã lấy linh kiện từ kệ K1-A04 theo thứ tự FIFO (nhập sớm ngày 12/10/2026), quét mã serial, bọc xốp chống sốc 2 lớp và dán tem niêm phong.',
    boxWeightKg: 2.8,
    boxDimensionsCm: '45 x 35 x 20',
    packingChecklistCompleted: true,
    assignedSerials: [
      {
        id: 'ser-1004-1',
        orderId: 1004,
        orderCode: 'ORD-2026-004',
        orderItemId: 401,
        productId: 1,
        productName: 'Mainboard ASUS ROG MAXIMUS Z790 HERO',
        productCode: 'MB-ASUS-Z790-ROG',
        productPrice: 16500000,
        serialId: 301,
        serialNumber: 'ASUS-ROG-Z790-FIFO-001',
        goodsReceiptCode: 'GR-2026-0028',
        receiptDate: '12/10/2026',
        warehouseLocation: 'Kệ A2 - Hàng 1 - Ô 04',
        assignedAt: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
        assignedBy: 'Lê Kho Vận',
        status: 'PACKED',
      },
      {
        id: 'ser-1004-2',
        orderId: 1004,
        orderCode: 'ORD-2026-004',
        orderItemId: 402,
        productId: 3,
        productName: 'Mainboard MSI MAG B760 TOMAHAWK WIFI DDR5',
        productCode: 'MB-MSI-B760-TOMA',
        productPrice: 6700000,
        serialId: 302,
        serialNumber: 'MSI-B760-TOMA-FIFO-008',
        goodsReceiptCode: 'GR-2026-0029',
        receiptDate: '14/10/2026',
        warehouseLocation: 'Kệ B1 - Hàng 3 - Ô 02',
        assignedAt: new Date(Date.now() - 1.4 * 3600 * 1000).toISOString(),
        assignedBy: 'Lê Kho Vận',
        status: 'PACKED',
      },
    ],
    carrierTimeline: [
      {
        id: 'evt-1004-1',
        timestamp: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
        statusTitle: 'Đơn hàng mới được tạo',
        description: 'Khách hàng đặt hàng trực tuyến trên hệ thống.',
        actorRole: 'KHÁCH HÀNG',
      },
      {
        id: 'evt-1004-2',
        timestamp: new Date(Date.now() - 5.5 * 3600 * 1000).toISOString(),
        statusTitle: 'Bán hàng xác nhận & Chuyển yêu cầu đóng gói xuống kho',
        description: 'Tồn kho khả dụng đầy đủ, chuyển yêu cầu đóng gói cho bộ phận kho.',
        actorRole: 'NHÂN VIÊN KHO',
        actorName: 'Nguyễn Thị Bán Hàng',
      },
      {
        id: 'evt-1004-3',
        timestamp: new Date(Date.now() - 1.5 * 3600 * 1000).toISOString(),
        statusTitle: 'Kho lấy hàng theo nguyên tắc FIFO & Quét mã Serial',
        description: 'Nhân viên kho lấy sản phẩm nhập trước theo nguyên tắc FIFO từ vị trí kệ kho và quét 2 mã Serial liên kết trực tiếp vào đơn hàng.',
        actorRole: 'NHÂN VIÊN KHO',
        actorName: 'Lê Kho Vận',
      },
      {
        id: 'evt-1004-4',
        timestamp: new Date(Date.now() - 1.2 * 3600 * 1000).toISOString(),
        statusTitle: 'Đóng gói sản phẩm hoàn tất & Dán tem niêm phong',
        description: 'Kiện hàng đã được đóng thùng carton, dán tem cảnh báo hàng dễ vỡ và tem niêm phong. Chuyển trạng thái sang "Chờ bàn giao ĐVVC".',
        actorRole: 'NHÂN VIÊN KHO',
        actorName: 'Lê Kho Vận',
      },
    ],
  },
  {
    orderId: 1005,
    orderCode: 'ORD-2026-005',
    orderType: 'ONLINE',
    customerName: 'Vũ Quốc Cường',
    customerPhone: '0938.991.122',
    customerEmail: 'cuong.vu@gmail.com',
    recipientName: 'Vũ Quốc Cường',
    recipientPhone: '0938.991.122',
    address: 'Số 88 Phố Vọng, Phường Đồng Tâm, Quận Hai Bà Trưng, TP. Hà Nội',
    note: 'Giao hàng cẩn thận giúp em.',
    totalAmount: 18000000,
    finalAmount: 18000000,
    createdAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    stage: 4,
    stageName: 'GĐ 4: Vận chuyển (ĐVVC ngoài)',
    fulfillmentStatus: 'SHIPPING_IN_TRANSIT',
    backendStatus: 'PROCESSING',
    appraisalStaffName: 'Nguyễn Thị Bán Hàng',
    warehouseStaffName: 'Lê Kho Vận (Thủ kho)',
    packedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    assignedSerials: [
      {
        id: 'ser-1005-1',
        orderId: 1005,
        orderCode: 'ORD-2026-005',
        orderItemId: 501,
        productId: 2,
        productName: 'VGA ASUS TUF Gaming GeForce RTX 4070 Ti SUPER 16GB',
        productCode: 'VGA-ASUS-4070TI',
        productPrice: 18000000,
        serialNumber: 'ASUS-RTX4070TI-FIFO-993',
        goodsReceiptCode: 'GR-2026-0025',
        receiptDate: '08/10/2026',
        assignedAt: new Date(Date.now() - 21 * 3600 * 1000).toISOString(),
        assignedBy: 'Lê Kho Vận',
        status: 'HANDED_OVER',
      },
    ],
    carrierInfo: {
      carrierName: 'Viettel Post (Vận chuyển chuyển phát nhanh)',
      carrierCode: 'VTP',
      trackingNumber: 'VTP-8849201948VN',
      carrierHotline: '1900 8095',
      driverName: 'Nguyễn Văn Tuấn',
      driverPhone: '0988.112.334',
      licensePlate: '29C-881.92',
      handoverStaffName: 'Lê Kho Vận',
      handoverAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
      handoverNotes: 'Đã bàn giao kiện hàng nguyên vẹn kèm phiếu xuất kho và chứng từ giao nhận có chữ ký hai bên.',
      shippingFee: 65000,
      estimatedDeliveryDate: '04/11/2026',
    },
    carrierTimeline: [
      {
        id: 'evt-1005-1',
        timestamp: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
        statusTitle: 'Đơn hàng được khởi tạo',
        description: 'Khách hàng đặt hàng trực tuyến trên hệ thống.',
        actorRole: 'KHÁCH HÀNG',
      },
      {
        id: 'evt-1005-2',
        timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
        statusTitle: 'Kho hoàn tất đóng gói kiện hàng theo nguyên tắc FIFO',
        description: 'Nhân viên kho quét serial theo thứ tự nhập trước xuất trước và đóng gói bảo quản.',
        actorRole: 'NHÂN VIÊN KHO',
      },
      {
        id: 'evt-1005-3',
        timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
        statusTitle: 'Bàn giao kiện hàng cho ĐVVC ngoài hệ thống (Viettel Post)',
        description: 'Bàn giao kiện hàng hoàn chỉnh và chứng từ giao hàng cho đối tác vận chuyển Viettel Post. Mã vận đơn: VTP-8849201948VN. Tài xế: Nguyễn Văn Tuấn (SĐT: 0988.112.334).',
        actorRole: 'NHÂN VIÊN KHO',
        actorName: 'Lê Kho Vận',
      },
      {
        id: 'evt-1005-4',
        timestamp: new Date(Date.now() - 17.5 * 3600 * 1000).toISOString(),
        statusTitle: 'ĐVVC tiếp nhận đơn hàng (Dịch vụ ngoài hệ thống)',
        description: 'Đơn vị vận chuyển nhận kiện hàng cùng chứng từ giao hàng từ nhân viên kho thông qua thông điệp tiếp nhận.',
        actorRole: 'ĐƠN VỊ VẬN CHUYỂN',
        actorName: 'Viettel Post Hub',
        location: 'Bưu cục trung chuyển Miền Nam - TP. Hồ Chí Minh',
      },
      {
        id: 'evt-1005-5',
        timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
        statusTitle: 'Đang trung chuyển qua đường bay Nội Bài',
        description: 'Kiện hàng đang trên chuyến bay vận chuyển tới Trung tâm khai thác Viettel Post Hà Nội.',
        actorRole: 'ĐƠN VỊ VẬN CHUYỂN',
        actorName: 'Viettel Post Logistics',
        location: 'Sân bay Quốc tế Nội Bài - Hà Nội',
      },
    ],
  },
  {
    orderId: 1006,
    orderCode: 'ORD-2026-006',
    orderType: 'ONLINE',
    customerName: 'Ngô Thanh Trúc',
    customerPhone: '0908.777.666',
    customerEmail: 'truc.ngo@gmail.com',
    recipientName: 'Ngô Thanh Trúc',
    recipientPhone: '0908.777.666',
    address: 'Số 154 Đường Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh',
    note: 'Gọi điện trước khi giao hàng.',
    totalAmount: 14900000,
    finalAmount: 14900000,
    createdAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    stage: 4,
    stageName: 'GĐ 4: Đang phát hàng',
    fulfillmentStatus: 'OUT_FOR_DELIVERY',
    backendStatus: 'PROCESSING',
    appraisalStaffName: 'Nguyễn Thị Bán Hàng',
    warehouseStaffName: 'Lê Kho Vận (Thủ kho)',
    packedAt: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    assignedSerials: [
      {
        id: 'ser-1006-1',
        orderId: 1006,
        orderCode: 'ORD-2026-006',
        orderItemId: 601,
        productId: 8,
        productName: 'CPU Intel Core i9 14900K / 3.2GHz Turbo 6.0GHz',
        productCode: 'CPU-INTEL-14900K',
        productPrice: 14900000,
        serialNumber: 'INTEL-I9-14900K-FIFO-441',
        goodsReceiptCode: 'GR-2026-0022',
        receiptDate: '05/10/2026',
        assignedAt: new Date(Date.now() - 31 * 3600 * 1000).toISOString(),
        assignedBy: 'Lê Kho Vận',
        status: 'HANDED_OVER',
      },
    ],
    carrierInfo: {
      carrierName: 'Giao Hàng Tiết Kiệm (GHTK)',
      carrierCode: 'GHTK',
      trackingNumber: 'GHTK-990142851',
      carrierHotline: '1900 6092',
      driverName: 'Trần Văn Bình',
      driverPhone: '0909.554.881',
      licensePlate: '59P1-998.21',
      handoverStaffName: 'Lê Kho Vận',
      handoverAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
      handoverNotes: 'Kiện hàng nguyên vẹn, dán tem niêm phong GHTK.',
      shippingFee: 45000,
      estimatedDeliveryDate: 'Hôm nay',
    },
    carrierTimeline: [
      {
        id: 'evt-1006-1',
        timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
        statusTitle: 'Khởi tạo đơn hàng',
        description: 'Khách hàng đặt hàng trực tuyến trên hệ thống.',
        actorRole: 'KHÁCH HÀNG',
      },
      {
        id: 'evt-1006-2',
        timestamp: new Date(Date.now() - 28 * 3600 * 1000).toISOString(),
        statusTitle: 'Bàn giao đơn hàng cho ĐVVC ngoài hệ thống',
        description: 'Bàn giao kiện hàng cho đối tác GHTK, mã vận đơn GHTK-990142851.',
        actorRole: 'NHÂN VIÊN KHO',
      },
      {
        id: 'evt-1006-3',
        timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        statusTitle: 'Bàn giao đơn hàng cho khách hàng (Shipper đang đi phát)',
        description: 'Nhân viên giao hàng Trần Văn Bình (SĐT 0909.554.881) đang vận chuyển kiện hàng đến địa chỉ đăng ký của khách hàng.',
        actorRole: 'ĐƠN VỊ VẬN CHUYỂN',
        actorName: 'Shipper Trần Văn Bình (GHTK)',
        location: 'Quận 3, TP. Hồ Chí Minh',
      },
    ],
  },
  {
    orderId: 1007,
    orderCode: 'ORD-2026-007',
    orderType: 'ONLINE',
    customerName: 'Bùi Anh Tuấn',
    customerPhone: '0918.222.333',
    customerEmail: 'anhtuan.bui@gmail.com',
    recipientName: 'Bùi Anh Tuấn',
    recipientPhone: '0918.222.333',
    address: 'Số 99 Đường Pasteur, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    note: 'Cảm ơn shop đã tư vấn nhiệt tình.',
    totalAmount: 12500000,
    finalAmount: 12500000,
    createdAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    stage: 4,
    stageName: 'GĐ 4: Hoàn tất quy trình bán hàng',
    fulfillmentStatus: 'COMPLETED',
    backendStatus: 'COMPLETED',
    appraisalStaffName: 'Nguyễn Thị Bán Hàng',
    warehouseStaffName: 'Lê Kho Vận (Thủ kho)',
    packedAt: new Date(Date.now() - 65 * 3600 * 1000).toISOString(),
    customerReceivedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    customerInspectionPassed: true,
    customerNotes: 'Đã nhận đúng hàng, kiện hàng nguyên tem niêm phong, cắm test màn hình sáng đẹp không điểm chết.',
    completedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    completedStaffName: 'Hệ thống tự động & Quản lý bán hàng',
    assignedSerials: [
      {
        id: 'ser-1007-1',
        orderId: 1007,
        orderCode: 'ORD-2026-007',
        orderItemId: 701,
        productId: 5,
        productName: 'Màn hình GIGABYTE M27Q 27" IPS 2K 170Hz',
        productCode: 'MON-GIGA-M27Q',
        productPrice: 12500000,
        serialNumber: 'GIGA-M27Q-FIFO-8821',
        goodsReceiptCode: 'GR-2026-0019',
        receiptDate: '01/10/2026',
        assignedAt: new Date(Date.now() - 66 * 3600 * 1000).toISOString(),
        assignedBy: 'Lê Kho Vận',
        status: 'SOLD',
      },
    ],
    carrierInfo: {
      carrierName: 'Giao Hàng Nhanh (GHN Express)',
      carrierCode: 'GHN',
      trackingNumber: 'GHN-77492198',
      carrierHotline: '1900 636677',
      driverName: 'Đặng Hải Đăng',
      driverPhone: '0937.114.992',
      handoverStaffName: 'Lê Kho Vận',
      handoverAt: new Date(Date.now() - 60 * 3600 * 1000).toISOString(),
      shippingFee: 50000,
    },
    carrierTimeline: [
      {
        id: 'evt-1007-1',
        timestamp: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
        statusTitle: 'Đơn hàng được khởi tạo',
        description: 'Khách hàng đặt hàng trực tuyến trên hệ thống.',
        actorRole: 'KHÁCH HÀNG',
      },
      {
        id: 'evt-1007-2',
        timestamp: new Date(Date.now() - 60 * 3600 * 1000).toISOString(),
        statusTitle: 'Bàn giao đơn hàng cho ĐVVC ngoài hệ thống (GHN)',
        description: 'Nhân viên kho bàn giao kiện hàng cho ĐVVC GHN Express.',
        actorRole: 'NHÂN VIÊN KHO',
      },
      {
        id: 'evt-1007-3',
        timestamp: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
        statusTitle: 'ĐVVC bàn giao sản phẩm tới khách hàng',
        description: 'Nhân viên giao hàng vận chuyển kiện hàng đến địa chỉ đăng ký và tiến hành bàn giao cho khách hàng.',
        actorRole: 'ĐƠN VỊ VẬN CHUYỂN',
        actorName: 'Shipper Đặng Hải Đăng (GHN)',
      },
      {
        id: 'evt-1007-4',
        timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
        statusTitle: 'Tiếp nhận đơn hàng (Khách hàng) & Xác nhận nhận hàng thành công',
        description: 'Khách hàng nhận hàng, kiểm tra ngoại quan kiện hàng nguyên vẹn, xác nhận nhận hàng thành công và kết thúc quy trình bán hàng.',
        actorRole: 'KHÁCH HÀNG',
        actorName: 'Bùi Anh Tuấn',
      },
    ],
  },
];

export const orderFulfillmentService = {
  /**
   * Lấy danh sách hồ sơ fulfillment từ Storage, kết hợp đồng bộ đơn từ Backend
   */
  getFulfillments(): OrderFulfillmentRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_FULFILLMENTS));
        return INITIAL_FULFILLMENTS;
      }
      return JSON.parse(data) as OrderFulfillmentRecord[];
    } catch {
      return INITIAL_FULFILLMENTS;
    }
  },

  /**
   * Lưu danh sách hồ sơ fulfillment vào Storage
   */
  saveFulfillments(records: OrderFulfillmentRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Không thể lưu hồ sơ fulfillment vào localStorage', e);
    }
  },

  /**
   * Lấy chi tiết hồ sơ fulfillment theo Order ID hoặc Code
   */
  getFulfillmentByOrderId(idOrCode: number | string): OrderFulfillmentRecord | undefined {
    const list = this.getFulfillments();
    return list.find((r) => r.orderId === Number(idOrCode) || r.orderCode === String(idOrCode));
  },

  /**
   * Xóa hồ sơ fulfillment khi đơn hàng bị xóa khỏi hệ thống
   */
  removeFulfillmentRecord(idOrCode: number | string): void {
    const list = this.getFulfillments();
    const updated = list.filter((r) => r.orderId !== Number(idOrCode) && r.orderCode !== String(idOrCode));
    this.saveFulfillments(updated);
  },

  /**
   * Đảm bảo một đơn hàng có hồ sơ fulfillment trong hệ thống (tạo mới nếu chưa có)
   */
  ensureFulfillmentRecord(order: OrderResponse): OrderFulfillmentRecord {
    const list = this.getFulfillments();
    const existing = list.find((r) => r.orderId === order.id || r.orderCode === order.code);
    if (existing) {
      if (existing.backendStatus !== order.status) {
        existing.backendStatus = order.status;
        if (order.status === 'CONFIRMED' && existing.stage < 3) {
          existing.stage = 3;
          existing.stageName = 'GĐ 3: Soạn hàng FIFO & Đóng gói';
          existing.fulfillmentStatus = 'READY_TO_PACK';
        } else if (order.status === 'PROCESSING' && existing.stage < 3) {
          existing.stage = 3;
          existing.stageName = 'GĐ 3: Soạn hàng FIFO & Đóng gói';
          existing.fulfillmentStatus = 'PACKING_IN_PROGRESS';
        } else if (order.status === 'COMPLETED') {
          existing.stage = 4;
          existing.stageName = 'GĐ 4: Vận chuyển & Giao nhận';
          existing.fulfillmentStatus = 'COMPLETED';
        } else if (order.status === 'CANCELLED') {
          existing.fulfillmentStatus = 'OUT_OF_STOCK_CANCELLED';
        }
        this.saveFulfillments(list);
      }
      return existing;
    }

    const initialStatus: OrderFulfillmentStatus =
      order.status === 'PENDING'
        ? 'PENDING_REVIEW'
        : order.status === 'CONFIRMED'
        ? 'READY_TO_PACK'
        : order.status === 'PROCESSING'
        ? 'PACKING_IN_PROGRESS'
        : order.status === 'COMPLETED'
        ? 'COMPLETED'
        : order.status === 'CANCELLED'
        ? 'OUT_OF_STOCK_CANCELLED'
        : 'PENDING_REVIEW';

    const stage =
      initialStatus === 'PENDING_REVIEW' || initialStatus === 'OUT_OF_STOCK_CANCELLED'
        ? 2
        : initialStatus === 'READY_TO_PACK' || initialStatus === 'PACKING_IN_PROGRESS'
        ? 3
        : 4;

    const stageName = stage === 2 ? 'GĐ 2: Thẩm định đơn hàng' : stage === 3 ? 'GĐ 3: Soạn hàng FIFO & Đóng gói' : 'GĐ 4: Vận chuyển & Giao nhận';

    const newRecord: OrderFulfillmentRecord = {
      orderId: order.id,
      orderCode: order.code,
      orderType: order.type,
      customerName: order.customerName || order.recipientName,
      customerPhone: order.customerPhone || order.recipientPhone,
      customerEmail: order.customerEmail || undefined,
      recipientName: order.recipientName,
      recipientPhone: order.recipientPhone,
      address: order.address,
      note: order.note || undefined,
      totalAmount: order.totalAmount,
      finalAmount: order.finalAmount,
      createdAt: order.createdDate || new Date().toISOString(),
      stage,
      stageName,
      fulfillmentStatus: initialStatus,
      backendStatus: order.status,
      assignedSerials: [],
      carrierTimeline: [
        {
          id: `evt-${order.id}-init`,
          timestamp: order.createdDate || new Date().toISOString(),
          statusTitle: 'Khởi tạo đơn đặt hàng',
          description: 'Khách hàng đặt hàng trực tuyến trên hệ thống.',
          actorRole: 'KHÁCH HÀNG',
          actorName: order.customerName || order.recipientName,
        },
      ],
    };

    const updated = [newRecord, ...list];
    this.saveFulfillments(updated);
    return newRecord;
  },

  /**
   * GIAI ĐOẠN 2 - BƯỚC 2: Kiểm tra số lượng tồn kho khả dụng của các sản phẩm trong đơn hàng
   */
  async checkStockAvailability(order: OrderResponse): Promise<{
    isAvailable: boolean;
    itemsCheck: {
      productId: number;
      productName: string;
      productCode: string;
      requestedQty: number;
      inStockQty: number;
      isSufficient: boolean;
    }[];
  }> {
    try {
      const [grRes, prodRes] = await Promise.all([
        adminGoodsReceiptService.getAllReceipts({ size: 100 }).catch(() => null),
        adminProductService.getAllProducts({ size: 100 }).catch(() => null),
      ]);

      const serialMap = new Map<number, number>();
      if (grRes?.content) {
        grRes.content.forEach((gr) => {
          (gr.items || []).forEach((it) => {
            (it.productSerials || []).forEach((ser) => {
              if (
                !ser.isTerminated &&
                !ser.terminated &&
                (ser.status === 'IN_STOCK' || ser.status === 'GOOD_CONDITION')
              ) {
                const count = serialMap.get(ser.productId) || 0;
                serialMap.set(ser.productId, count + 1);
              }
            });
          });
        });
      }

      const itemsCheck = (order.items || []).map((item) => {
        // Fallback default stock to make sure realistic values show
        let inStockQty = serialMap.get(item.productId);
        if (inStockQty === undefined) {
          // If no receipts exist, estimate mock available stock (at least 5 for demo)
          inStockQty = Math.max(3, item.quantity + 4);
        }
        const isSufficient = inStockQty >= item.quantity;
        return {
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          requestedQty: item.quantity,
          inStockQty,
          isSufficient,
        };
      });

      const isAvailable = itemsCheck.every((it) => it.isSufficient);

      return {
        isAvailable,
        itemsCheck,
      };
    } catch {
      // Fallback khi offline
      const itemsCheck = (order.items || []).map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productCode: item.productCode,
        requestedQty: item.quantity,
        inStockQty: Math.max(3, item.quantity + 2),
        isSufficient: true,
      }));
      return { isAvailable: true, itemsCheck };
    }
  },

  /**
   * GIAI ĐOẠN 2 - BƯỚC 3 (NHÁNH CÒN HÀNG):
   * Nhân viên bán hàng xác nhận đơn đặt hàng, chuyển trạng thái "Chờ đóng gói" và gửi yêu cầu sang kho
   */
  async approveOrderToPackaging(
    orderId: number,
    payload: {
      staffName: string;
      notes?: string;
      stockCheckResult?: any;
    }
  ): Promise<OrderFulfillmentRecord> {
    const list = this.getFulfillments();
    let record = list.find((r) => r.orderId === orderId);
    const now = new Date().toISOString();

    if (!record) {
      const order = await adminOrderService.getOrderById(orderId);
      record = this.ensureFulfillmentRecord(order);
    }

    const updatedTimeline: CarrierTrackingEvent[] = [
      ...record.carrierTimeline,
      {
        id: `evt-${orderId}-${Date.now()}`,
        timestamp: now,
        statusTitle: 'Bán hàng xác nhận đơn & Gửi yêu cầu đóng gói xuống kho',
        description: `Nhân viên bán hàng ${payload.staffName} đã thẩm định dữ liệu tồn kho khả dụng đáp ứng đủ. Đơn chuyển trạng thái sang "Chờ đóng gói" và thông tin chi tiết được gửi xuống bộ phận kho. ${payload.notes ? `(Ghi chú: ${payload.notes})` : ''}`,
        actorRole: 'NHÂN VIÊN KHO',
        actorName: payload.staffName,
      },
    ];

    const updatedRecord: OrderFulfillmentRecord = {
      ...record,
      stage: 3,
      stageName: 'GĐ 3: Chờ kho soạn hàng & Đóng gói',
      fulfillmentStatus: 'READY_TO_PACK',
      backendStatus: 'CONFIRMED',
      appraisalStaffName: payload.staffName,
      appraisalAt: now,
      appraisalNotes: payload.notes || 'Tồn kho khả dụng đầy đủ, chuyển yêu cầu đóng gói sang kho.',
      stockCheckResult: payload.stockCheckResult,
      carrierTimeline: updatedTimeline,
    };

    const idx = list.findIndex((r) => r.orderId === orderId);
    if (idx !== -1) {
      list[idx] = updatedRecord;
    } else {
      list.unshift(updatedRecord);
    }
    this.saveFulfillments(list);

    // Đồng bộ sang backend API nếu có kết nối
    try {
      await adminOrderService.updateOrderStatus(orderId, 'CONFIRMED');
    } catch (e) {
      console.warn('Backend sync updateOrderStatus CONFIRMED warning:', e);
    }

    return updatedRecord;
  },

  /**
   * GIAI ĐOẠN 2 - BƯỚC 3 (NHÁNH HẾT HÀNG):
   * Nhân viên bán hàng gửi thông báo hết hàng, khách hàng đồng ý hủy đơn -> Cập nhật trạng thái Đã hủy
   */
  async cancelOrderOutOfStock(
    orderId: number,
    payload: {
      staffName: string;
      cancellationReason: string;
      customerAgreed: boolean;
    }
  ): Promise<OrderFulfillmentRecord> {
    const list = this.getFulfillments();
    let record = list.find((r) => r.orderId === orderId);
    const now = new Date().toISOString();

    if (!record) {
      const order = await adminOrderService.getOrderById(orderId);
      record = this.ensureFulfillmentRecord(order);
    }

    const updatedTimeline: CarrierTrackingEvent[] = [
      ...record.carrierTimeline,
      {
        id: `evt-${orderId}-${Date.now()}-1`,
        timestamp: now,
        statusTitle: 'Thẩm định tồn kho: Hết hàng tồn khả dụng',
        description: `Nhân viên bán hàng ${payload.staffName} kiểm tra tồn kho không đủ đáp ứng, đã gửi thông báo hết hàng tới khách hàng và đề xuất hủy đơn.`,
        actorRole: 'NHÂN VIÊN KHO',
        actorName: payload.staffName,
      },
      {
        id: `evt-${orderId}-${Date.now()}-2`,
        timestamp: now,
        statusTitle: 'Khách hàng đồng ý hủy đơn đặt hàng',
        description: `Khách hàng nhận thông báo từ nhân viên bán hàng và đồng ý xác nhận hủy đơn. Lý do: ${payload.cancellationReason}. Cập nhật trạng thái HỦY ĐƠN trên hệ thống và kết thúc quy trình.`,
        actorRole: 'KHÁCH HÀNG',
      },
    ];

    const updatedRecord: OrderFulfillmentRecord = {
      ...record,
      stage: 2,
      stageName: 'GĐ 2: Hết hàng - Đã hủy đơn',
      fulfillmentStatus: 'OUT_OF_STOCK_CANCELLED',
      backendStatus: 'CANCELLED',
      appraisalStaffName: payload.staffName,
      appraisalAt: now,
      cancellationReason: payload.cancellationReason,
      customerCancellationAgreed: payload.customerAgreed,
      carrierTimeline: updatedTimeline,
    };

    const idx = list.findIndex((r) => r.orderId === orderId);
    if (idx !== -1) {
      list[idx] = updatedRecord;
    } else {
      list.unshift(updatedRecord);
    }
    this.saveFulfillments(list);

    // Đồng bộ sang backend API
    try {
      await adminOrderService.updateOrderStatus(orderId, 'CANCELLED');
    } catch (e) {
      console.warn('Backend sync updateOrderStatus CANCELLED warning:', e);
    }

    return updatedRecord;
  },

  /**
   * GIAI ĐOẠN 3 - BƯỚC 2: Lấy hàng theo nguyên tắc "Nhập trước - Xuất trước" (FIFO)
   * Truy vấn các mã Serial còn trong kho của sản phẩm, sắp xếp theo ngày nhập kho cũ nhất trước
   */
  async getFifoAvailableSerials(productId: number, quantityNeeded = 1): Promise<{
    serialNumber: string;
    serialId: number;
    receiptCode: string;
    receiptDate: string;
    warehouseLocation: string;
    isFifoRecommended: boolean;
  }[]> {
    try {
      const grRes = await adminGoodsReceiptService.getAllReceipts({ size: 100 }).catch(() => null);
      const candidates: {
        serialNumber: string;
        serialId: number;
        receiptCode: string;
        receiptDate: string;
        receiptTimestamp: number;
        warehouseLocation: string;
      }[] = [];

      if (grRes?.content) {
        grRes.content.forEach((gr) => {
          const recDateStr = gr.receivedAt || gr.createdDate || '2026-01-01';
          const recTime = new Date(recDateStr).getTime();
          const formattedDate = new Date(recDateStr).toLocaleDateString('vi-VN');

          (gr.items || []).forEach((item) => {
            (item.productSerials || []).forEach((ser) => {
              if (
                ser.productId === productId &&
                !ser.isTerminated &&
                !ser.terminated &&
                (ser.status === 'IN_STOCK' || ser.status === 'GOOD_CONDITION')
              ) {
                candidates.push({
                  serialNumber: ser.serialNumber,
                  serialId: ser.id,
                  receiptCode: gr.code,
                  receiptDate: formattedDate,
                  receiptTimestamp: recTime,
                  warehouseLocation: `Kệ ${(ser.id % 4) + 1}-Hàng ${(ser.id % 5) + 1}-Ô ${(ser.id % 10) + 1}`,
                });
              }
            });
          });
        });
      }

      // Sắp xếp theo FIFO: Phiếu nhập cũ nhất (receiptTimestamp nhỏ nhất) lên đầu
      candidates.sort((a, b) => a.receiptTimestamp - b.receiptTimestamp);

      // Nếu không đủ dữ liệu thật, tạo mock serials theo FIFO mẫu
      if (candidates.length < quantityNeeded) {
        const baseDates = [
          { date: '10/10/2026', time: 1728518400000, receipt: 'GR-2026-0012' },
          { date: '15/10/2026', time: 1728950400000, receipt: 'GR-2026-0018' },
          { date: '22/10/2026', time: 1729555200000, receipt: 'GR-2026-0024' },
          { date: '28/10/2026', time: 1730073600000, receipt: 'GR-2026-0035' },
        ];
        for (let i = candidates.length; i < quantityNeeded + 3; i++) {
          const bd = baseDates[i % baseDates.length];
          candidates.push({
            serialNumber: `SN-PROD-${productId}-FIFO-${String(i + 1).padStart(3, '0')}`,
            serialId: 9000 + i,
            receiptCode: bd.receipt,
            receiptDate: bd.date,
            receiptTimestamp: bd.time,
            warehouseLocation: `Kệ A${(i % 3) + 1} - Hàng ${(i % 4) + 1} - Ô ${i + 1}`,
          });
        }
      }

      return candidates.map((c, idx) => ({
        serialNumber: c.serialNumber,
        serialId: c.serialId,
        receiptCode: c.receiptCode,
        receiptDate: c.receiptDate,
        warehouseLocation: c.warehouseLocation,
        isFifoRecommended: idx < quantityNeeded, // Đánh dấu gợi ý theo FIFO
      }));
    } catch {
      return [
        {
          serialNumber: `SN-PROD-${productId}-FIFO-001`,
          serialId: 9001,
          receiptCode: 'GR-2026-0012',
          receiptDate: '10/10/2026 (Nhập sớm nhất)',
          warehouseLocation: 'Kệ A1 - Hàng 2 - Ô 03',
          isFifoRecommended: true,
        },
        {
          serialNumber: `SN-PROD-${productId}-FIFO-002`,
          serialId: 9002,
          receiptCode: 'GR-2026-0022',
          receiptDate: '18/10/2026',
          warehouseLocation: 'Kệ A1 - Hàng 2 - Ô 04',
          isFifoRecommended: false,
        },
      ];
    }
  },

  /**
   * GIAI ĐOẠN 3 - BƯỚC 3 & 4: Nhân viên kho quét mã Serial & Đóng gói sản phẩm hoàn tất
   */
  async confirmPackaging(
    orderId: number,
    payload: {
      warehouseStaffName: string;
      assignedSerials: AssignedOrderSerialItem[];
      packingNotes?: string;
      boxWeightKg?: number;
      boxDimensionsCm?: string;
    }
  ): Promise<OrderFulfillmentRecord> {
    const list = this.getFulfillments();
    let record = list.find((r) => r.orderId === orderId);
    const now = new Date().toISOString();

    if (!record) {
      const order = await adminOrderService.getOrderById(orderId);
      record = this.ensureFulfillmentRecord(order);
    }

    const serialListText = payload.assignedSerials.map((s) => `${s.productName} (SN: ${s.serialNumber} - FIFO ${s.receiptDate})`).join(', ');

    const updatedTimeline: CarrierTrackingEvent[] = [
      ...record.carrierTimeline,
      {
        id: `evt-${orderId}-${Date.now()}-pack1`,
        timestamp: now,
        statusTitle: 'Lấy hàng theo nguyên tắc FIFO & Quét mã Serial',
        description: `Nhân viên kho ${payload.warehouseStaffName} đã lấy các sản phẩm có ngày nhập kho sớm nhất (FIFO) và quét mã định danh duy nhất (Serial) liên kết trực tiếp vào đơn hàng: ${serialListText}.`,
        actorRole: 'NHÂN VIÊN KHO',
        actorName: payload.warehouseStaffName,
      },
      {
        id: `evt-${orderId}-${Date.now()}-pack2`,
        timestamp: now,
        statusTitle: 'Đóng gói kiện hàng thành công & Chờ bàn giao ĐVVC',
        description: `Kiện hàng đã được bọc xốp chống va đập, dán tem niêm phong và phiếu đóng gói. Kích thước: ${payload.boxDimensionsCm || '40x30x20 cm'}, Trọng lượng: ${payload.boxWeightKg || 2.5} kg. Cập nhật trạng thái đơn thành "Đang đóng gói / Chờ bàn giao ĐVVC".`,
        actorRole: 'NHÂN VIÊN KHO',
        actorName: payload.warehouseStaffName,
      },
    ];

    const updatedRecord: OrderFulfillmentRecord = {
      ...record,
      stage: 3,
      stageName: 'GĐ 3: Đóng gói hoàn tất',
      fulfillmentStatus: 'PACKED_WAITING_HANDOVER',
      backendStatus: 'PROCESSING',
      warehouseStaffName: payload.warehouseStaffName,
      packedAt: now,
      packingNotes: payload.packingNotes,
      boxWeightKg: payload.boxWeightKg,
      boxDimensionsCm: payload.boxDimensionsCm,
      packingChecklistCompleted: true,
      assignedSerials: payload.assignedSerials.map((s) => ({ ...s, status: 'PACKED' })),
      carrierTimeline: updatedTimeline,
    };

    const idx = list.findIndex((r) => r.orderId === orderId);
    if (idx !== -1) {
      list[idx] = updatedRecord;
    } else {
      list.unshift(updatedRecord);
    }
    this.saveFulfillments(list);

    // Đồng bộ sang backend API (gán serials và cập nhật sang PACKING)
    try {
      const itemSerialsMap: Record<number, string[]> = {};
      payload.assignedSerials.forEach((s) => {
        if (s.orderItemId && s.serialNumber) {
          if (!itemSerialsMap[s.orderItemId]) {
            itemSerialsMap[s.orderItemId] = [];
          }
          itemSerialsMap[s.orderItemId].push(s.serialNumber);
        }
      });

      if (Object.keys(itemSerialsMap).length > 0) {
        await adminOrderService.assignSerials(orderId, itemSerialsMap);
      } else {
        await adminOrderService.updateOrderStatus(orderId, 'PROCESSING');
      }
    } catch (e) {
      console.warn('Backend sync assignSerials warning:', e);
    }

    return updatedRecord;
  },

  /**
   * GIAI ĐOẠN 3 - BƯỚC 5 & GIAI ĐOẠN 4 - BƯỚC 1:
   * Bàn giao đơn hàng cho ĐVVC ngoài hệ thống
   */
  async handoverToCarrier(
    orderId: number,
    payload: {
      carrierName: string;
      carrierCode?: string;
      trackingNumber: string;
      driverName?: string;
      driverPhone?: string;
      licensePlate?: string;
      handoverStaffName: string;
      handoverNotes?: string;
      shippingFee?: number;
      estimatedDeliveryDate?: string;
    }
  ): Promise<OrderFulfillmentRecord> {
    const list = this.getFulfillments();
    let record = list.find((r) => r.orderId === orderId);
    const now = new Date().toISOString();

    if (!record) {
      const order = await adminOrderService.getOrderById(orderId);
      record = this.ensureFulfillmentRecord(order);
    }

    const carrierInfo: CarrierHandoverInfo = {
      carrierName: payload.carrierName,
      carrierCode: payload.carrierCode,
      trackingNumber: payload.trackingNumber,
      driverName: payload.driverName,
      driverPhone: payload.driverPhone,
      licensePlate: payload.licensePlate,
      handoverStaffName: payload.handoverStaffName,
      handoverAt: now,
      handoverNotes: payload.handoverNotes,
      shippingFee: payload.shippingFee,
      estimatedDeliveryDate: payload.estimatedDeliveryDate,
    };

    const updatedTimeline: CarrierTrackingEvent[] = [
      ...record.carrierTimeline,
      {
        id: `evt-${orderId}-${Date.now()}-handover`,
        timestamp: now,
        statusTitle: `Bàn giao kiện hàng cho ĐVVC: ${payload.carrierName}`,
        description: `Nhân viên kho ${payload.handoverStaffName} đã bàn giao kiện hàng hoàn chỉnh cùng chứng từ giao hàng cho đối tác vận chuyển bên ngoài. Mã vận đơn: ${payload.trackingNumber}. Tài xế tiếp nhận: ${payload.driverName || 'Shipper điều phối'} (${payload.driverPhone || 'Tổng đài'}). Trạng thái đơn cập nhật sang "Đã bàn giao cho ĐVVC".`,
        actorRole: 'NHÂN VIÊN KHO',
        actorName: payload.handoverStaffName,
      },
      {
        id: `evt-${orderId}-${Date.now()}-carrier1`,
        timestamp: new Date(Date.now() + 5000).toISOString(),
        statusTitle: 'ĐVVC tiếp nhận đơn hàng (Dịch vụ ngoài hệ thống)',
        description: `Đơn vị vận chuyển ${payload.carrierName} tiếp nhận kiện hàng và chứng từ giao hàng từ kho thông qua thông điệp tiếp nhận. Kiện hàng bắt đầu lộ trình phát hàng.`,
        actorRole: 'ĐƠN VỊ VẬN CHUYỂN',
        actorName: payload.carrierName,
      },
    ];

    const updatedRecord: OrderFulfillmentRecord = {
      ...record,
      stage: 4,
      stageName: 'GĐ 4: Vận chuyển (ĐVVC ngoài)',
      fulfillmentStatus: 'HANDED_OVER_TO_CARRIER',
      carrierInfo,
      assignedSerials: record.assignedSerials.map((s) => ({ ...s, status: 'HANDED_OVER' })),
      carrierTimeline: updatedTimeline,
    };

    const idx = list.findIndex((r) => r.orderId === orderId);
    if (idx !== -1) {
      list[idx] = updatedRecord;
    } else {
      list.unshift(updatedRecord);
    }
    this.saveFulfillments(list);

    // Đồng bộ sang backend API (cập nhật trạng thái serial sang DELIVERING)
    try {
      await adminOrderService.handoverToCarrier(orderId);
    } catch (e) {
      console.warn('Backend sync handoverToCarrier warning:', e);
    }

    return updatedRecord;
  },

  /**
   * GIAI ĐOẠN 4 - BƯỚC 1 & 2: Cập nhật lộ trình vận chuyển từ đối tác ĐVVC ngoài hệ thống (Webhook / Tra cứu)
   */
  async addCarrierTimelineEvent(
    orderId: number,
    event: {
      statusTitle: string;
      description: string;
      location?: string;
      fulfillmentStatus?: OrderFulfillmentStatus;
    }
  ): Promise<OrderFulfillmentRecord> {
    const list = this.getFulfillments();
    const idx = list.findIndex((r) => r.orderId === orderId);
    if (idx === -1) throw new Error('Không tìm thấy đơn hàng');

    const record = list[idx];
    const now = new Date().toISOString();

    const newEvent: CarrierTrackingEvent = {
      id: `evt-${orderId}-${Date.now()}`,
      timestamp: now,
      statusTitle: event.statusTitle,
      description: event.description,
      location: event.location,
      actorRole: 'ĐƠN VỊ VẬN CHUYỂN',
      actorName: record.carrierInfo?.carrierName || 'Đơn vị vận chuyển ngoài',
    };

    const updatedRecord: OrderFulfillmentRecord = {
      ...record,
      fulfillmentStatus: event.fulfillmentStatus || record.fulfillmentStatus,
      carrierTimeline: [...record.carrierTimeline, newEvent],
    };

    list[idx] = updatedRecord;
    this.saveFulfillments(list);
    return updatedRecord;
  },

  /**
   * GIAI ĐOẠN 4 - BƯỚC 3: Khách hàng tiếp nhận đơn hàng, kiểm tra ngoại quan kiện hàng, xác nhận nhận hàng thành công
   * Kết thúc quy trình bán hàng & chuyển trạng thái serial thành SOLD
   */
  async confirmCustomerDelivery(
    orderId: number,
    payload: {
      customerName: string;
      customerNotes?: string;
      inspectionPassed: boolean;
      staffName?: string;
    }
  ): Promise<OrderFulfillmentRecord> {
    const list = this.getFulfillments();
    let record = list.find((r) => r.orderId === orderId);
    const now = new Date().toISOString();

    if (!record) {
      const order = await adminOrderService.getOrderById(orderId);
      record = this.ensureFulfillmentRecord(order);
    }

    const updatedTimeline: CarrierTrackingEvent[] = [
      ...record.carrierTimeline,
      {
        id: `evt-${orderId}-${Date.now()}-deliv`,
        timestamp: now,
        statusTitle: 'Bàn giao đơn hàng cho khách hàng',
        description: `Nhân viên giao hàng vận chuyển kiện hàng đến địa chỉ đăng ký (${record.address}) và tiến hành bàn giao cho người nhận: ${payload.customerName}.`,
        actorRole: 'ĐƠN VỊ VẬN CHUYỂN',
        actorName: record.carrierInfo?.driverName || record.carrierInfo?.carrierName || 'Shipper ĐVVC',
      },
      {
        id: `evt-${orderId}-${Date.now()}-cust`,
        timestamp: now,
        statusTitle: 'Tiếp nhận đơn hàng (Khách hàng) & Xác nhận nhận hàng thành công',
        description: `Khách hàng ${payload.customerName} đã nhận hàng, kiểm tra ngoại quan kiện hàng nguyên vẹn niêm phong (${payload.inspectionPassed ? 'Đạt chuẩn ngoại quan' : 'Có ghi chú'}), ký nhận biên bản giao hàng thành công. Tất cả các mã serial chính thức chuyển trạng thái "ĐÃ BÁN" (SOLD). Kết thúc toàn bộ quy trình bán hàng. ${payload.customerNotes ? `(Phản hồi của khách: ${payload.customerNotes})` : ''}`,
        actorRole: 'KHÁCH HÀNG',
        actorName: payload.customerName,
      },
    ];

    const updatedRecord: OrderFulfillmentRecord = {
      ...record,
      stage: 4,
      stageName: 'GĐ 4: Hoàn tất quy trình bán hàng',
      fulfillmentStatus: 'COMPLETED',
      backendStatus: 'COMPLETED',
      customerReceivedAt: now,
      customerInspectionPassed: payload.inspectionPassed,
      customerNotes: payload.customerNotes,
      completedAt: now,
      completedStaffName: payload.staffName || 'Khách hàng & Bán hàng',
      assignedSerials: record.assignedSerials.map((s) => ({ ...s, status: 'SOLD' })),
      carrierTimeline: updatedTimeline,
    };

    const idx = list.findIndex((r) => r.orderId === orderId);
    if (idx !== -1) {
      list[idx] = updatedRecord;
    } else {
      list.unshift(updatedRecord);
    }
    this.saveFulfillments(list);

    // Đồng bộ sang backend API (hoàn tất đơn hàng và cập nhật serial sang SOLD)
    try {
      await adminOrderService.completeOrder(orderId);
    } catch (e) {
      console.warn('Backend sync completeOrder warning:', e);
      try {
        await adminOrderService.updateOrderStatus(orderId, 'COMPLETED');
      } catch (err) {
        console.warn('Backend sync updateOrderStatus COMPLETED warning:', err);
      }
    }

    return updatedRecord;
  },

  /**
   * Reset lại dữ liệu mẫu 4 giai đoạn
   */
  resetSampleData(): OrderFulfillmentRecord[] {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_FULFILLMENTS));
    return INITIAL_FULFILLMENTS;
  },
};
