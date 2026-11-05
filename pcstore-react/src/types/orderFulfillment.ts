import type { OrderStatus, OrderType, OrderResponse } from './adminOrder';

/**
 * 4 Giai đoạn trong Quy trình Bán hàng theo mô tả nghiệp vụ:
 * Giai đoạn 1: Đặt hàng và khởi tạo đơn hàng (Khách hàng)
 * Giai đoạn 2: Tiếp nhận và thẩm định đơn hàng (Nhân viên bán hàng)
 * Giai đoạn 3: Soạn hàng, đóng gói và gán mã định danh (Nhân viên kho)
 * Giai đoạn 4: Vận chuyển và hoàn tất giao nhận (ĐVVC ngoài hệ thống & Khách hàng)
 */
export type SalesWorkflowStageNumber = 1 | 2 | 3 | 4;

/**
 * Trạng thái xử lý hoàn tất đơn hàng (Fulfillment Status)
 */
export type OrderFulfillmentStatus =
  | 'PENDING_REVIEW'           // GĐ 1->2: Đơn mới, chờ bán hàng tiếp nhận & thẩm định tồn kho
  | 'OUT_OF_STOCK_CANCELLED'   // GĐ 2 (Nhánh Hết hàng): Bán hàng báo hết tồn kho, khách đồng ý hủy đơn
  | 'READY_TO_PACK'           // GĐ 2->3 (Nhánh Còn hàng): Bán hàng xác nhận, chuyển yêu cầu đóng gói xuống kho
  | 'PACKING_IN_PROGRESS'      // GĐ 3: Kho đang soạn hàng FIFO & quét mã serial gán vào đơn
  | 'PACKED_WAITING_HANDOVER'  // GĐ 3: Kho đóng gói xong, niêm phong, chờ bàn giao ĐVVC
  | 'HANDED_OVER_TO_CARRIER'   // GĐ 3->4: Đã bàn giao kiện hàng cho ĐVVC ngoài hệ thống
  | 'SHIPPING_IN_TRANSIT'      // GĐ 4: ĐVVC ngoài đang vận chuyển (trung chuyển bưu cục)
  | 'OUT_FOR_DELIVERY'         // GĐ 4: ĐVVC ngoài đang phát hàng tới địa chỉ khách hàng
  | 'DELIVERED_SUCCESS'        // GĐ 4: Khách hàng nhận hàng, kiểm tra ngoại quan & xác nhận thành công
  | 'COMPLETED';               // GĐ 4: Hoàn tất toàn bộ quy trình bán hàng

/**
 * Thông tin chi tiết một cá thể serial được gán vào đơn hàng theo nguyên tắc FIFO
 */
export interface AssignedOrderSerialItem {
  id: string;
  orderId: number;
  orderCode: string;
  orderItemId: number;
  productId: number;
  productName: string;
  productCode: string;
  productPrice: number;
  serialId?: number;
  serialNumber: string;
  goodsReceiptCode?: string;   // Mã phiếu nhập nguồn chứng minh FIFO
  receiptDate?: string;        // Ngày nhập kho (dùng để sắp xếp FIFO)
  warehouseLocation?: string;  // Vị trí lưu kho (kệ/ô hàng)
  assignedAt: string;          // Thời điểm quét gán mã serial
  assignedBy: string;          // Nhân viên kho thực hiện quét
  status: 'ASSIGNED' | 'PACKED' | 'HANDED_OVER' | 'SOLD';
}

/**
 * Lộ trình / Sự kiện vận chuyển từ ĐVVC ngoài hệ thống (Tracking Timeline)
 */
export interface CarrierTrackingEvent {
  id: string;
  timestamp: string;
  statusTitle: string;
  description: string;
  location?: string;
  actorRole: 'NHÂN VIÊN KHO' | 'ĐƠN VỊ VẬN CHUYỂN' | 'KHÁCH HÀNG';
  actorName?: string;
}

/**
 * Thông tin bàn giao đơn hàng cho Đơn vị vận chuyển (dịch vụ ngoài hệ thống)
 */
export interface CarrierHandoverInfo {
  carrierName: string;         // Tên ĐVVC ngoài (Viettel Post, GHTK, GHN, J&T, Đội xe PCStore...)
  carrierCode?: string;        // VTP, GHTK, GHN, JT...
  trackingNumber: string;      // Mã vận đơn do ĐVVC ngoài cấp
  carrierHotline?: string;
  driverName?: string;         // Họ tên tài xế / Shipper tiếp nhận
  driverPhone?: string;        // SĐT tài xế
  licensePlate?: string;       // Biển số xe giao nhận
  handoverStaffName: string;   // Nhân viên kho bàn giao
  handoverAt: string;          // Thời gian bàn giao
  handoverNotes?: string;      // Ghi chú bàn giao
  shippingFee?: number;        // Cước vận chuyển
  estimatedDeliveryDate?: string; // Thời gian dự kiến giao tới khách
}

/**
 * Hồ sơ theo dõi tiến trình thực hiện đơn hàng (Order Fulfillment Record)
 */
export interface OrderFulfillmentRecord {
  orderId: number;
  orderCode: string;
  orderType: OrderType;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  note?: string;
  totalAmount: number;
  finalAmount: number;
  createdAt: string;

  // Tiến trình quy trình bán hàng
  stage: SalesWorkflowStageNumber;
  stageName: string;
  fulfillmentStatus: OrderFulfillmentStatus;
  backendStatus: OrderStatus;

  // Giai đoạn 2: Bán hàng thẩm định tồn kho & Phân nhánh
  appraisalStaffName?: string;
  appraisalAt?: string;
  appraisalNotes?: string;
  stockCheckResult?: {
    isAvailable: boolean;
    itemsCheck: {
      productId: number;
      productName: string;
      productCode: string;
      requestedQty: number;
      inStockQty: number;
      isSufficient: boolean;
    }[];
  };
  cancellationReason?: string;
  customerCancellationAgreed?: boolean;

  // Giai đoạn 3: Kho soạn hàng FIFO & Đóng gói
  assignedSerials: AssignedOrderSerialItem[];
  warehouseStaffName?: string;
  packedAt?: string;
  packingNotes?: string;
  boxWeightKg?: number;
  boxDimensionsCm?: string;
  packingChecklistCompleted?: boolean;

  // Giai đoạn 3 bước 5 & Giai đoạn 4: ĐVVC ngoài hệ thống
  carrierInfo?: CarrierHandoverInfo;
  carrierTimeline: CarrierTrackingEvent[];

  // Giai đoạn 4 bước 3: Khách hàng tiếp nhận & Xác nhận hoàn tất
  customerReceivedAt?: string;
  customerInspectionPassed?: boolean;
  customerNotes?: string;
  completedAt?: string;
  completedStaffName?: string;
}

/**
 * Cấu hình hiển thị theo từng trạng thái tiến trình bán hàng
 */
export interface FulfillmentStatusConfig {
  stage: SalesWorkflowStageNumber;
  stageName: string;
  label: string;
  badgeClass: string;
  textColor: string;
  description: string;
  responsibleRole: string;
}

export const FULFILLMENT_STATUS_MAP: Record<OrderFulfillmentStatus, FulfillmentStatusConfig> = {
  PENDING_REVIEW: {
    stage: 2,
    stageName: 'Kiểm tra đơn hàng',
    label: 'Chờ kiểm tra tồn kho',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10',
    textColor: 'text-amber-700',
    description: 'Đơn mới khởi tạo từ khách hàng, nhân viên bán hàng cần kiểm tra tồn kho khả dụng để quyết định xử lý.',
    responsibleRole: 'Nhân viên bán hàng',
  },
  OUT_OF_STOCK_CANCELLED: {
    stage: 2,
    stageName: 'Hết hàng - Hủy đơn',
    label: 'Hết hàng - Đã hủy đơn',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10',
    textColor: 'text-rose-700',
    description: 'Kho không đủ hàng đáp ứng, nhân viên bán hàng đã thông báo và khách hàng đồng ý hủy đơn đặt hàng.',
    responsibleRole: 'Nhân viên bán hàng & Khách hàng',
  },
  READY_TO_PACK: {
    stage: 2,
    stageName: 'Đã xác nhận',
    label: 'Chờ kho đóng gói',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/10',
    textColor: 'text-blue-700',
    description: 'Tồn kho khả dụng đầy đủ, nhân viên bán hàng đã xác nhận và chuyển yêu cầu đóng gói xuống bộ phận kho.',
    responsibleRole: 'Nhân viên kho',
  },
  PACKING_IN_PROGRESS: {
    stage: 3,
    stageName: 'Chuẩn bị hàng',
    label: 'Đang chuẩn bị hàng',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-500/10',
    textColor: 'text-indigo-700',
    description: 'Nhân viên kho đang lấy hàng và quét mã Serial định danh.',
    responsibleRole: 'Nhân viên kho',
  },
  PACKED_WAITING_HANDOVER: {
    stage: 3,
    stageName: 'Đóng gói hoàn tất',
    label: 'Chờ bàn giao ĐVVC',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-500/10',
    textColor: 'text-purple-700',
    description: 'Kiện hàng đã đóng gói đúng quy chuẩn, dán tem niêm phong, sẵn sàng bàn giao cho ĐVVC ngoài hệ thống.',
    responsibleRole: 'Nhân viên kho & ĐVVC',
  },
  HANDED_OVER_TO_CARRIER: {
    stage: 3,
    stageName: 'Bàn giao ĐVVC',
    label: 'Đã bàn giao cho ĐVVC',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200 ring-cyan-500/10',
    textColor: 'text-cyan-700',
    description: 'ĐVVC ngoài hệ thống đã tiếp nhận kiện hàng và chứng từ giao hàng từ kho, bắt đầu vận chuyển.',
    responsibleRole: 'Đơn vị vận chuyển (Ngoài)',
  },
  SHIPPING_IN_TRANSIT: {
    stage: 4,
    stageName: 'Đang Vận chuyển',
    label: 'Đang trung chuyển bưu cục',
    badgeClass: 'bg-sky-50 text-sky-700 border-sky-200 ring-sky-500/10',
    textColor: 'text-sky-700',
    description: 'Kiện hàng đang được luân chuyển qua các bưu cục trung chuyển của đối tác vận chuyển bên ngoài.',
    responsibleRole: 'Đơn vị vận chuyển (Ngoài)',
  },
  OUT_FOR_DELIVERY: {
    stage: 4,
    stageName: 'Đang phát hàng',
    label: 'Shipper đang giao tới khách',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/10',
    textColor: 'text-amber-700',
    description: 'Tài xế của ĐVVC đang trên đường giao kiện hàng tới địa chỉ đăng ký của khách hàng.',
    responsibleRole: 'Đơn vị vận chuyển (Ngoài)',
  },
  DELIVERED_SUCCESS: {
    stage: 4,
    stageName: 'Khách nhận hàng',
    label: 'Khách hàng đã nhận hàng',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10',
    textColor: 'text-emerald-700',
    description: 'Khách hàng đã tiếp nhận kiện hàng, kiểm tra ngoại quan nguyên vẹn và xác nhận nhận hàng thành công.',
    responsibleRole: 'Khách hàng',
  },
  COMPLETED: {
    stage: 4,
    stageName: 'Hoàn tất quy trình',
    label: 'Hoàn tất quy trình bán hàng',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-emerald-600/20',
    textColor: 'text-emerald-800',
    description: 'Giao dịch thành công, các mã serial chính thức chuyển trạng thái ĐÃ BÁN (SOLD), đóng quy trình bán hàng.',
    responsibleRole: 'Quy trình hoàn tất',
  },
};

/**
 * Danh sách đối tác ĐVVC ngoài hệ thống phổ biến
 */
export const POPULAR_LOGISTICS_CARRIERS = [
  {
    name: 'Giao Hàng Tiết Kiệm (GHTK)',
    code: 'GHTK',
    hotline: '1900 6092',
    trackingPrefix: 'GHTK-',
    estimatedHours: '24-36h',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    logoText: 'GHTK',
  },
  {
    name: 'Viettel Post (VTP)',
    code: 'VTP',
    hotline: '1900 8095',
    trackingPrefix: 'VTP-',
    estimatedHours: '24-48h',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    logoText: 'Viettel Post',
  },
  {
    name: 'Giao Hàng Nhanh (GHN)',
    code: 'GHN',
    hotline: '1900 636677',
    trackingPrefix: 'GHN-',
    estimatedHours: '24-36h',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
    logoText: 'GHN Express',
  },
  {
    name: 'J&T Express Việt Nam',
    code: 'JT',
    hotline: '1900 1088',
    trackingPrefix: 'JT-',
    estimatedHours: '24-48h',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    logoText: 'J&T Express',
  },
  {
    name: 'Đội xe giao hàng nội bộ PCStore (Hỏa tốc)',
    code: 'PCSTORE_FLEET',
    hotline: '1900 8888',
    trackingPrefix: 'PC-EXPRESS-',
    estimatedHours: 'Trong 2-4h',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    logoText: 'PCStore Fleet',
  },
];

