import type { ProductSerialStatus } from './adminGoodsReceipt';

/**
 * Trạng thái của Phiếu hoàn trả hàng tới Nhà Cung Cấp
 */
export type SupplierReturnStatus =
  | 'WAITING_PACK'       // Giai đoạn 1: Chờ đóng gói hoàn hàng
  | 'WAITING_HANDOVER'   // Giai đoạn 2: Chờ bàn giao ĐVVC (kho đã đóng gói xong)
  | 'HANDED_OVER'       // Giai đoạn 2->3: Đã bàn giao tới ĐVVC / Đang vận chuyển
  | 'DELIVERED_SUPPLIER'// Giai đoạn 3->4: Đã giao tới Nhà cung cấp (Chờ đối soát)
  | 'COMPLETED'         // Giai đoạn 4: Đã trả về NCC thành công (Hoàn tất quy trình)
  | 'CANCELLED';        // Hủy đơn hoàn hàng

/**
 * Hình thức xử lý hoàn hàng / bồi hoàn mong muốn
 */
export type ReturnResolutionType = 'REPLACE' | 'REFUND' | 'REPAIR';

/**
 * Từng cá thể sản phẩm (Serial) nằm trong đơn hoàn trả
 */
export interface SupplierReturnItem {
  id: string;                 // unique id trong đơn
  serialId?: number;          // ID trong DB nếu có
  serialNumber: string;       // Mã Serial duy nhất
  productId: number;
  productName: string;
  productCode: string;
  productPrice: number;
  defectReason: string;       // Lý do lỗi (phần cứng, ngoại quan trầy xước, không lên nguồn...)
  goodsReceiptCode?: string;  // Phiếu nhập nguồn nếu có
  isPacked?: boolean;         // Đánh dấu nhân viên kho đã nhặt & đóng gói
  packedAt?: string;
  notes?: string;
}

/**
 * Nhật ký tiến trình của phiếu hoàn hàng
 */
export interface SupplierReturnHistoryLog {
  id: string;
  stageNumber: 1 | 2 | 3 | 4;
  stageName: string;
  title: string;
  actorName: string;
  actorRole: 'QUẢN LÝ CỬA HÀNG' | 'NHÂN VIÊN KHO' | 'ĐƠN VỊ VẬN CHUYỂN' | 'NHÀ CUNG CẤP';
  timestamp: string;
  note?: string;
  meta?: Record<string, any>;
}

/**
 * Phiếu hoàn hàng tới Nhà Cung Cấp (Supplier Return Order)
 */
export interface SupplierReturnOrder {
  id: string;
  code: string;               // Mã đơn: VD PR-2026-001 / SR-20260301
  supplierId: number;
  supplierName: string;
  supplierCode: string;
  supplierPhone: string;
  supplierEmail: string;
  supplierAddress?: string;
  supplierContactPerson?: string;

  status: SupplierReturnStatus;
  resolution: ReturnResolutionType;
  returnReasonGeneral: string; // Lý do xuất hoàn trả
  managerNotes?: string;       // Yêu cầu, dặn dò từ Quản lý gửi bộ phận Kho
  warehouseNotes?: string;     // Ghi chú của nhân viên kho khi đóng gói
  supplierFeedback?: string;   // Phản hồi đối soát của NCC

  // Thông tin ĐVVC (Shipping Partner)
  carrierName?: string;        // Tên ĐVVC (GHTK, Viettel Post, GHN, Đội xe PCStore...)
  trackingNumber?: string;     // Mã vận đơn
  carrierPhone?: string;       // SĐT tài xế / tổng đài ĐVVC
  carrierNotes?: string;

  // Danh sách sản phẩm & serial chỉ định
  items: SupplierReturnItem[];
  totalQuantity: number;
  totalEstimatedValue: number;

  // Vai trò phụ trách & mốc thời gian
  createdByName: string;       // Quản lý cửa hàng tạo phiếu
  createdAt: string;
  warehouseStaff?: string;     // Tên nhân viên kho
  packedByName?: string;       // Nhân viên kho thực hiện đóng gói
  packedAt?: string;
  handedOverByName?: string;   // Nhân viên kho bàn giao ĐVVC
  handedOverAt?: string;
  deliveredAt?: string;        // Thời điểm ĐVVC giao tới kho NCC
  completedByName?: string;    // Quản lý xác nhận hoàn tất
  completedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;

  // Lịch sử tiến trình
  history: SupplierReturnHistoryLog[];
}

/**
 * Item serial lỗi đang chờ được chọn để lập đơn hoàn hàng
 */
export interface DefectiveSerialCandidate {
  serialId: number;
  serialNumber: string;
  productId: number;
  productName: string;
  productCode: string;
  productPrice: number;
  supplierId: number;
  supplierName: string;
  supplierCode: string;
  goodsReceiptId?: number;
  goodsReceiptCode?: string;
  receiptDate?: string;
  defectReason: string;
  status: ProductSerialStatus;
  isInActiveReturnOrder?: boolean;
  activeReturnOrderCode?: string;
}
