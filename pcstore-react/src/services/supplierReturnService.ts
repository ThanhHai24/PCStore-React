import type {
  SupplierReturnOrder,
  SupplierReturnItem,
  SupplierReturnStatus,
  ReturnResolutionType,
  DefectiveSerialCandidate,
} from '../types/supplierReturn';
import { adminSupplierService } from './adminSupplierService';
import { adminProductService } from './adminProductService';
import { adminGoodsReceiptService } from './adminGoodsReceiptService';
import { adminPurchaseOrderService } from './adminPurchaseOrderService';

const STORAGE_KEY = 'pcstore_supplier_return_orders_v2';

// Dữ liệu mẫu ban đầu mô tả đầy đủ 4 giai đoạn thực tế
const INITIAL_RETURN_ORDERS: SupplierReturnOrder[] = [
  {
    id: 'ret-001',
    code: 'PR-2026-001',
    supplierId: 1,
    supplierName: 'Công ty Cổ phần Công nghệ ASUS Việt Nam',
    supplierCode: 'ASUS-VN',
    supplierPhone: '028 3811 8888',
    supplierEmail: 'rma-service@asus.com.vn',
    supplierAddress: 'Lầu 8, Tòa nhà Viettel Complex, 285 CMT8, Q.10, TP.HCM',
    supplierContactPerson: 'Anh Trần Hữu Phước (Bộ phận Bảo hành - RMA)',
    status: 'WAITING_PACK',
    resolution: 'REPLACE',
    returnReasonGeneral: 'Lỗi phần cứng xuất xưởng: Mainboard chập nguồn, card VGA không nhận cổng DP',
    managerNotes: 'Quản lý yêu cầu đóng gói cẩn thận 2 lớp mút chống sốc xốp bong bóng, dán tem niêm phong màu đỏ ở hai mép hộp.',
    totalQuantity: 2,
    totalEstimatedValue: 34500000,
    createdByName: 'Nguyễn Văn Quản Lý',
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    items: [
      {
        id: 'item-001-1',
        serialId: 101,
        serialNumber: 'ASUS-ROG-Z790-9921',
        productId: 1,
        productName: 'Mainboard ASUS ROG MAXIMUS Z790 HERO',
        productCode: 'MB-ASUS-Z790-ROG',
        productPrice: 16500000,
        defectReason: 'Không kích được nguồn, chập phase VRM khi test tại khâu kiểm hàng',
        goodsReceiptCode: 'GR-2026-0042',
        isPacked: false,
      },
      {
        id: 'item-001-2',
        serialId: 102,
        serialNumber: 'ASUS-RTX4070TI-8832',
        productId: 2,
        productName: 'VGA ASUS TUF Gaming GeForce RTX 4070 Ti SUPER 16GB',
        productCode: 'VGA-ASUS-4070TI',
        productPrice: 18000000,
        defectReason: 'Cổng DisplayPort 1 & 2 bị sọc màn hình, quạt số 2 phát tiếng kêu to',
        goodsReceiptCode: 'GR-2026-0042',
        isPacked: false,
      },
    ],
    history: [
      {
        id: 'log-001-1',
        stageNumber: 1,
        stageName: 'GĐ 1: Lập đơn & Chỉ định sản phẩm',
        title: 'Khởi tạo đơn hoàn hàng và gửi yêu cầu đóng gói xuống kho',
        actorName: 'Nguyễn Văn Quản Lý',
        actorRole: 'QUẢN LÝ CỬA HÀNG',
        timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        note: 'Đã rà soát danh sách serial lỗi từ phiếu nhập GR-2026-0042. Chỉ định 2 serial lỗi và gửi yêu cầu đóng gói xuống kho.',
      },
    ],
  },
  {
    id: 'ret-002',
    code: 'PR-2026-002',
    supplierId: 2,
    supplierName: 'Công ty TNHH MSI Computer Việt Nam',
    supplierCode: 'MSI-VN',
    supplierPhone: '028 7300 8899',
    supplierEmail: 'support-rma@msi.vn',
    supplierAddress: 'Khu Công Nghệ Cao, P. Tăng Nhơn Phú B, TP. Thủ Đức, TP.HCM',
    supplierContactPerson: 'Chị Lê Thị Mai (Điều phối Kho trả hàng)',
    status: 'WAITING_HANDOVER',
    resolution: 'REFUND',
    returnReasonGeneral: 'Ngoại quan thùng bị cấn móp trong quá trình vận chuyển ban đầu, cổng kết nối cong vênh',
    managerNotes: 'Nhà cung cấp đã đồng ý hoàn tiền/trừ công nợ ngay khi nhận lại sản phẩm theo hợp đồng quý.',
    warehouseStaff: 'Lê Kho Vận (Thủ kho)',
    warehouseNotes: 'Đã kiểm tra đúng 2 serial, bọc xốp bóng khí 3 lớp, đóng thùng carton niêm phong mã PR-2026-002.',
    packedByName: 'Lê Kho Vận',
    packedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    totalQuantity: 2,
    totalEstimatedValue: 14200000,
    createdByName: 'Nguyễn Văn Quản Lý',
    createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    items: [
      {
        id: 'item-002-1',
        serialId: 103,
        serialNumber: 'MSI-MAG-B760-4412',
        productId: 3,
        productName: 'Mainboard MSI MAG B760 TOMAHAWK WIFI DDR5',
        productCode: 'MB-MSI-B760-TOMA',
        productPrice: 5200000,
        defectReason: 'Chân socket CPU bị cong 2 pin, tụ điện gần khe PCIe có vết trầy xước',
        goodsReceiptCode: 'GR-2026-0039',
        isPacked: true,
        packedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      },
      {
        id: 'item-002-2',
        serialId: 104,
        serialNumber: 'MSI-MAG-A850GL-7721',
        productId: 4,
        productName: 'Nguồn máy tính MSI MAG A850GL PCIE5 850W Gold',
        productCode: 'PSU-MSI-850GL',
        productPrice: 9000000,
        defectReason: 'Cáp nguồn PCIe 16-pin 12VHPWR bị đứt ngầm jack cắm',
        goodsReceiptCode: 'GR-2026-0039',
        isPacked: true,
        packedAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      },
    ],
    history: [
      {
        id: 'log-002-1',
        stageNumber: 1,
        stageName: 'GĐ 1: Lập đơn & Chỉ định sản phẩm',
        title: 'Khởi tạo đơn hoàn hàng và gửi yêu cầu đóng gói xuống kho',
        actorName: 'Nguyễn Văn Quản Lý',
        actorRole: 'QUẢN LÝ CỬA HÀNG',
        timestamp: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
        note: 'Tạo đơn hoàn 2 sản phẩm MSI bị cấn móp, yêu cầu bồi hoàn công nợ.',
      },
      {
        id: 'log-002-2',
        stageNumber: 2,
        stageName: 'GĐ 2: Đóng gói & Bàn giao hàng hoàn',
        title: 'Nhân viên kho hoàn tất đóng gói kiện hàng theo quy chuẩn',
        actorName: 'Lê Kho Vận',
        actorRole: 'NHÂN VIÊN KHO',
        timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
        note: 'Đã lấy 2 serial từ khu hàng lỗi, đóng gói thùng xốp, dán tem niêm phong. Kiện hàng sẵn sàng chờ ĐVVC tới nhận.',
      },
    ],
  },
  {
    id: 'ret-003',
    code: 'PR-2026-003',
    supplierId: 3,
    supplierName: 'Công ty Cổ phần Gigabyte Technology Việt Nam',
    supplierCode: 'GIGABYTE-VN',
    supplierPhone: '028 3930 9999',
    supplierEmail: 'rma@gigabyte.vn',
    supplierAddress: 'Số 19 Đường 24, KDC Him Lam, Xã Bình Hưng, Bình Chánh, TP.HCM',
    supplierContactPerson: 'Anh Hoàng Nam (Điều phối viên Giga Service)',
    status: 'HANDED_OVER',
    resolution: 'REPLACE',
    returnReasonGeneral: 'Linh kiện màn hình bị điểm chết > 5 điểm, panel hở sáng nặng',
    managerNotes: 'Yêu cầu đổi sản phẩm mới 1:1 lô sản xuất mới nhất.',
    warehouseStaff: 'Lê Kho Vận (Thủ kho)',
    warehouseNotes: 'Đóng thùng carton nguyên seal của hãng, dán biển hàng dễ vỡ.',
    carrierName: 'Viettel Post (Vận chuyển chuyển phát nhanh)',
    trackingNumber: 'VTP-8849201948VN',
    carrierPhone: '0988.112.334 (Tài xế Nguyễn Văn Tuấn)',
    carrierNotes: 'Nhận kiện lúc 09:30, cam kết giao tới kho Gigabyte trong 24h.',
    totalQuantity: 1,
    totalEstimatedValue: 12500000,
    createdByName: 'Nguyễn Văn Quản Lý',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    packedByName: 'Lê Kho Vận',
    packedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    handedOverByName: 'Lê Kho Vận',
    handedOverAt: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    items: [
      {
        id: 'item-003-1',
        serialId: 105,
        serialNumber: 'GIGA-M27Q-EK-3312',
        productId: 5,
        productName: 'Màn hình GIGABYTE M27Q 27" IPS 2K 170Hz',
        productCode: 'MON-GIGA-M27Q',
        productPrice: 12500000,
        defectReason: 'Xuất hiện 6 điểm chết (dead pixel) chính giữa màn hình, viền dưới hở sáng',
        goodsReceiptCode: 'GR-2026-0035',
        isPacked: true,
        packedAt: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
      },
    ],
    history: [
      {
        id: 'log-003-1',
        stageNumber: 1,
        stageName: 'GĐ 1: Lập đơn & Chỉ định sản phẩm',
        title: 'Khởi tạo đơn hoàn hàng và gửi yêu cầu đóng gói xuống kho',
        actorName: 'Nguyễn Văn Quản Lý',
        actorRole: 'QUẢN LÝ CỬA HÀNG',
        timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        note: 'Tạo đơn hoàn 1 màn hình Gigabyte bị điểm chết.',
      },
      {
        id: 'log-003-2',
        stageNumber: 2,
        stageName: 'GĐ 2: Đóng gói & Bàn giao hàng hoàn',
        title: 'Nhân viên kho hoàn tất đóng gói kiện hàng',
        actorName: 'Lê Kho Vận',
        actorRole: 'NHÂN VIÊN KHO',
        timestamp: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
        note: 'Đóng gói xong, dán tem nhãn cảnh báo hàng dễ vỡ.',
      },
      {
        id: 'log-003-3',
        stageNumber: 2,
        stageName: 'GĐ 2: Đóng gói & Bàn giao hàng hoàn',
        title: 'Bàn giao kiện hàng hoàn tới Đơn vị vận chuyển (Viettel Post)',
        actorName: 'Lê Kho Vận',
        actorRole: 'NHÂN VIÊN KHO',
        timestamp: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
        note: 'Đã ký biên bản giao nhận với tài xế Viettel Post (Mã vận đơn VTP-8849201948VN).',
      },
      {
        id: 'log-003-4',
        stageNumber: 3,
        stageName: 'GĐ 3: Vận chuyển kiện hàng hoàn',
        title: 'Đơn vị vận chuyển tiếp nhận và đang trên đường giao tới NCC',
        actorName: 'Viettel Post Dispatcher',
        actorRole: 'ĐƠN VỊ VẬN CHUYỂN',
        timestamp: new Date(Date.now() - 16 * 3600 * 1000).toISOString(),
        note: 'Kiện hàng đã xuất bưu cục trung chuyển, dự kiến giao vào buổi chiều.',
      },
    ],
  },
  {
    id: 'ret-004',
    code: 'PR-2026-004',
    supplierId: 4,
    supplierName: 'Công ty Cổ phần Công nghệ Corsair Việt Nam',
    supplierCode: 'CORSAIR-VN',
    supplierPhone: '028 3514 6666',
    supplierEmail: 'returns@corsair.com.vn',
    supplierAddress: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, Bình Thạnh, TP.HCM',
    supplierContactPerson: 'Chị Đặng Thúy Hà (Trung tâm dịch vụ bảo hành)',
    status: 'DELIVERED_SUPPLIER',
    resolution: 'REPLACE',
    returnReasonGeneral: 'Nguồn Corsair RM850x bị sụt áp đường 12V, tản nhiệt nước AIO rò rỉ dung dịch làm mát',
    managerNotes: 'Ưu tiên đối soát đổi mới khẩn cấp để giao cho khách dựng máy PC Gaming.',
    warehouseStaff: 'Lê Kho Vận (Thủ kho)',
    warehouseNotes: 'Đóng gói trong thùng xốp cách ẩm chuyên dụng của Corsair.',
    carrierName: 'Giao Hàng Tiết Kiệm (GHTK)',
    trackingNumber: 'GHTK-990142851',
    carrierPhone: '0909.554.881 (Shipper Trần Văn Bình)',
    totalQuantity: 2,
    totalEstimatedValue: 8900000,
    createdByName: 'Nguyễn Văn Quản Lý',
    createdAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    packedByName: 'Lê Kho Vận',
    packedAt: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
    handedOverByName: 'Lê Kho Vận',
    handedOverAt: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    deliveredAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    supplierFeedback: 'NCC Corsair đã tiếp nhận kiện hàng lúc 10h15 sáng nay. Hiện kỹ thuật viên đang tiến hành cắm test đối soát 2 mã serial.',
    items: [
      {
        id: 'item-004-1',
        serialId: 106,
        serialNumber: 'CORSAIR-AIO-H150I-0912',
        productId: 6,
        productName: 'Tản nhiệt nước Corsair iCUE H150i ELITE LCD XT',
        productCode: 'CLR-CORSAIR-H150I',
        productPrice: 5400000,
        defectReason: 'Rỉ một giọt chất lỏng ở khớp nối radiator khi mở hộp kiểm đếm',
        goodsReceiptCode: 'GR-2026-0030',
        isPacked: true,
      },
      {
        id: 'item-004-2',
        serialId: 107,
        serialNumber: 'CORSAIR-RM850X-2210',
        productId: 7,
        productName: 'Nguồn Corsair RM850x 850W 80 Plus Gold',
        productCode: 'PSU-CORSAIR-850X',
        productPrice: 3500000,
        defectReason: 'Điện áp đường 12V tụt xuống 11.2V khi gắn tải test ban đầu',
        goodsReceiptCode: 'GR-2026-0030',
        isPacked: true,
      },
    ],
    history: [
      {
        id: 'log-004-1',
        stageNumber: 1,
        stageName: 'GĐ 1: Lập đơn & Chỉ định sản phẩm',
        title: 'Khởi tạo đơn hoàn hàng',
        actorName: 'Nguyễn Văn Quản Lý',
        actorRole: 'QUẢN LÝ CỬA HÀNG',
        timestamp: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
      },
      {
        id: 'log-004-2',
        stageNumber: 2,
        stageName: 'GĐ 2: Đóng gói & Bàn giao hàng hoàn',
        title: 'Nhân viên kho đóng gói hoàn tất',
        actorName: 'Lê Kho Vận',
        actorRole: 'NHÂN VIÊN KHO',
        timestamp: new Date(Date.now() - 40 * 3600 * 1000).toISOString(),
      },
      {
        id: 'log-004-3',
        stageNumber: 2,
        stageName: 'GĐ 2: Đóng gói & Bàn giao hàng hoàn',
        title: 'Bàn giao cho đơn vị GHTK',
        actorName: 'Lê Kho Vận',
        actorRole: 'NHÂN VIÊN KHO',
        timestamp: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      },
      {
        id: 'log-004-4',
        stageNumber: 3,
        stageName: 'GĐ 3: Vận chuyển kiện hàng hoàn',
        title: 'ĐVVC bàn giao thực tế tại kho Nhà cung cấp',
        actorName: 'GHTK Shipper Trần Văn Bình',
        actorRole: 'ĐƠN VỊ VẬN CHUYỂN',
        timestamp: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
        note: 'Đã giao tới lễ tân RMA Corsair, chị Đặng Thúy Hà đã ký nhận kiện hàng còn nguyên niêm phong.',
      },
      {
        id: 'log-004-5',
        stageNumber: 4,
        stageName: 'GĐ 4: Tiếp nhận và xác nhận hoàn tất',
        title: 'Nhà cung cấp Corsair xác nhận tiếp nhận kiện hàng và đang đối soát',
        actorName: 'Chị Đặng Thúy Hà (Corsair)',
        actorRole: 'NHÀ CUNG CẤP',
        timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
        note: 'Đã nhận đủ 2 serial. Kỹ thuật đang kiểm tra đối chiếu mã SN trên thân máy với biên bản.',
      },
    ],
  },
  {
    id: 'ret-005',
    code: 'PR-2026-005',
    supplierId: 1,
    supplierName: 'Công ty Cổ phần Công nghệ ASUS Việt Nam',
    supplierCode: 'ASUS-VN',
    supplierPhone: '028 3811 8888',
    supplierEmail: 'rma-service@asus.com.vn',
    status: 'COMPLETED',
    resolution: 'REPLACE',
    returnReasonGeneral: 'Lỗi phát hiện tại kho: CPU Intel Core i9 14900K gắn mainboard ASUS bị dump xanh màn hình liên tục',
    totalQuantity: 1,
    totalEstimatedValue: 14900000,
    createdByName: 'Nguyễn Văn Quản Lý',
    createdAt: new Date(Date.now() - 7 * 86400 * 1000).toISOString(),
    packedByName: 'Lê Kho Vận',
    packedAt: new Date(Date.now() - 6 * 86400 * 1000).toISOString(),
    handedOverByName: 'Lê Kho Vận',
    handedOverAt: new Date(Date.now() - 6 * 86400 * 1000).toISOString(),
    deliveredAt: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
    completedByName: 'Nguyễn Văn Quản Lý',
    completedAt: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
    carrierName: 'Đội xe giao hàng nội bộ PCStore',
    trackingNumber: 'INTERNAL-TRUCK-01',
    carrierPhone: '0912.333.444 (Tài xế nội bộ Tuấn)',
    supplierFeedback: 'Biên bản đối soát số ASUS-RMA-8812: Đã thu hồi serial lỗi, xuất đổi trả sang 01 sản phẩm mới nguyên hộp (Mã serial mới: INTEL-I9-14900K-NEW-2026).',
    items: [
      {
        id: 'item-005-1',
        serialId: 108,
        serialNumber: 'INTEL-I9-14900K-ERR-001',
        productId: 8,
        productName: 'CPU Intel Core i9 14900K / 3.2GHz Turbo 6.0GHz / 24 Nhân 32 Luồng',
        productCode: 'CPU-INTEL-14900K',
        productPrice: 14900000,
        defectReason: 'Treo máy BSOD màn hình xanh (CLOCK_WATCHDOG_TIMEOUT) khi chạy tải render Cinebench',
        goodsReceiptCode: 'GR-2026-0021',
        isPacked: true,
      },
    ],
    history: [
      {
        id: 'log-005-1',
        stageNumber: 1,
        stageName: 'GĐ 1: Lập đơn & Chỉ định sản phẩm',
        title: 'Khởi tạo đơn hoàn trả',
        actorName: 'Nguyễn Văn Quản Lý',
        actorRole: 'QUẢN LÝ CỬA HÀNG',
        timestamp: new Date(Date.now() - 7 * 86400 * 1000).toISOString(),
      },
      {
        id: 'log-005-2',
        stageNumber: 2,
        stageName: 'GĐ 2: Đóng gói & Bàn giao hàng hoàn',
        title: 'Kho đóng gói hoàn tất',
        actorName: 'Lê Kho Vận',
        actorRole: 'NHÂN VIÊN KHO',
        timestamp: new Date(Date.now() - 6 * 86400 * 1000).toISOString(),
      },
      {
        id: 'log-005-3',
        stageNumber: 2,
        stageName: 'GĐ 2: Đóng gói & Bàn giao hàng hoàn',
        title: 'Bàn giao ĐVVC nội bộ',
        actorName: 'Lê Kho Vận',
        actorRole: 'NHÂN VIÊN KHO',
        timestamp: new Date(Date.now() - 6 * 86400 * 1000).toISOString(),
      },
      {
        id: 'log-005-4',
        stageNumber: 3,
        stageName: 'GĐ 3: Vận chuyển kiện hàng hoàn',
        title: 'Giao hàng thành công tới kho đối tác ASUS',
        actorName: 'Đội xe giao hàng nội bộ PCStore',
        actorRole: 'ĐƠN VỊ VẬN CHUYỂN',
        timestamp: new Date(Date.now() - 5 * 86400 * 1000).toISOString(),
      },
      {
        id: 'log-005-5',
        stageNumber: 4,
        stageName: 'GĐ 4: Tiếp nhận và xác nhận hoàn tất',
        title: 'NCC ASUS đối soát thành công và cấp mã đổi mới 1:1',
        actorName: 'Đại diện ASUS RMA',
        actorRole: 'NHÀ CUNG CẤP',
        timestamp: new Date(Date.now() - 3 * 86400 * 1000).toISOString(),
      },
      {
        id: 'log-005-6',
        stageNumber: 4,
        stageName: 'GĐ 4: Tiếp nhận và xác nhận hoàn tất',
        title: 'Quản lý cửa hàng xác nhận hoàn tất quy trình hoàn hàng',
        actorName: 'Nguyễn Văn Quản Lý',
        actorRole: 'QUẢN LÝ CỬA HÀNG',
        timestamp: new Date(Date.now() - 2 * 86400 * 1000).toISOString(),
        note: 'Đã nhận hàng đổi mới vào kho dự trữ bảo hành. Serial lỗi chính thức chuyển trạng thái ĐÃ HOÀN HÀNG THÀNH CÔNG và đóng quy trình.',
      },
    ],
  },
];

// Danh sách serial lỗi dự phòng khi chưa có từ backend
const MOCK_DEFECTIVE_CANDIDATES: DefectiveSerialCandidate[] = [
  {
    serialId: 201,
    serialNumber: 'ASUS-TUF-RTX4060TI-01',
    productId: 9,
    productName: 'VGA ASUS TUF Gaming GeForce RTX 4060 Ti 8GB OC',
    productCode: 'VGA-ASUS-4060TI',
    productPrice: 11200000,
    supplierId: 1,
    supplierName: 'Công ty Cổ phần Công nghệ ASUS Việt Nam',
    supplierCode: 'ASUS-VN',
    goodsReceiptId: 44,
    goodsReceiptCode: 'GR-2026-0044',
    receiptDate: '28/10/2026',
    defectReason: 'Quạt số 1 không quay, nhiệt độ tăng vọt >95 độ C khi stress test',
    status: 'DEFECTIVE',
  },
  {
    serialId: 202,
    serialNumber: 'ASUS-Z790-PRIME-092',
    productId: 10,
    productName: 'Mainboard ASUS PRIME Z790-P WIFI D4',
    productCode: 'MB-ASUS-Z790P',
    productPrice: 5800000,
    supplierId: 1,
    supplierName: 'Công ty Cổ phần Công nghệ ASUS Việt Nam',
    supplierCode: 'ASUS-VN',
    goodsReceiptId: 44,
    goodsReceiptCode: 'GR-2026-0044',
    receiptDate: '28/10/2026',
    defectReason: 'Khe RAM B1 và B2 không nhận, đèn LED DRAM nhấp nháy đỏ',
    status: 'DEFECTIVE',
  },
  {
    serialId: 203,
    serialNumber: 'MSI-RTX4080-VENTUS-55',
    productId: 11,
    productName: 'VGA MSI GeForce RTX 4080 SUPER 16G VENTUS 3X OC',
    productCode: 'VGA-MSI-4080S',
    productPrice: 28500000,
    supplierId: 2,
    supplierName: 'Công ty TNHH MSI Computer Việt Nam',
    supplierCode: 'MSI-VN',
    goodsReceiptId: 43,
    goodsReceiptCode: 'GR-2026-0043',
    receiptDate: '25/10/2026',
    defectReason: 'Rỉ dầu nhiệt (thermal pad leakage), ngoại quan nắp che trầy xước sâu',
    status: 'DEFECTIVE',
  },
  {
    serialId: 204,
    serialNumber: 'GIGA-B650-AORUS-881',
    productId: 12,
    productName: 'Mainboard GIGABYTE B650 AORUS ELITE AX',
    productCode: 'MB-GIGA-B650',
    productPrice: 5900000,
    supplierId: 3,
    supplierName: 'Công ty Cổ phần Gigabyte Technology Việt Nam',
    supplierCode: 'GIGABYTE-VN',
    goodsReceiptId: 42,
    goodsReceiptCode: 'GR-2026-0042',
    receiptDate: '22/10/2026',
    defectReason: 'Cổng LAN 2.5GbE chập chờn mất kết nối mạng liên tục',
    status: 'DEFECTIVE',
  },
  {
    serialId: 205,
    serialNumber: 'CORSAIR-DOMINATOR-DDR5-32G',
    productId: 13,
    productName: 'RAM Corsair Dominator Titanium 32GB (2x16GB) DDR5 6000MHz',
    productCode: 'RAM-CORSAIR-DOM32',
    productPrice: 4200000,
    supplierId: 4,
    supplierName: 'Công ty Cổ phần Công nghệ Corsair Việt Nam',
    supplierCode: 'CORSAIR-VN',
    goodsReceiptId: 41,
    goodsReceiptCode: 'GR-2026-0041',
    receiptDate: '19/10/2026',
    defectReason: '1 thanh RAM bị lỗi ô nhớ (MemTest86 báo > 100 errors)',
    status: 'DEFECTIVE',
  },
];

export const supplierReturnService = {
  /**
   * Lấy danh sách phiếu hoàn hàng từ storage
   */
  getOrders(): SupplierReturnOrder[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_RETURN_ORDERS));
        return INITIAL_RETURN_ORDERS;
      }
      return JSON.parse(data) as SupplierReturnOrder[];
    } catch {
      return INITIAL_RETURN_ORDERS;
    }
  },

  /**
   * Lưu danh sách phiếu hoàn hàng vào storage
   */
  saveOrders(orders: SupplierReturnOrder[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
    } catch (e) {
      console.error('Không thể lưu phiếu hoàn hàng vào localStorage', e);
    }
  },

  /**
   * Lấy chi tiết một phiếu hoàn hàng theo ID hoặc Code
   */
  getOrderById(idOrCode: string): SupplierReturnOrder | undefined {
    const orders = this.getOrders();
    return orders.find((o) => o.id === idOrCode || o.code === idOrCode);
  },

  /**
   * GIAI ĐOẠN 1: Quản lý cửa hàng khởi tạo đơn hoàn hàng và gửi yêu cầu đóng gói xuống kho
   */
  createOrder(payload: {
    supplierId: number;
    supplierName: string;
    supplierCode: string;
    supplierPhone: string;
    supplierEmail: string;
    supplierAddress?: string;
    supplierContactPerson?: string;
    resolution: ReturnResolutionType;
    returnReasonGeneral: string;
    managerNotes?: string;
    createdByName?: string;
    selectedSerials: DefectiveSerialCandidate[];
  }): SupplierReturnOrder {
    const orders = this.getOrders();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = String(Math.floor(100 + Math.random() * 900));
    const newCode = `PR-${now.getFullYear()}-${randNum}`;

    const items: SupplierReturnItem[] = payload.selectedSerials.map((s, idx) => ({
      id: `item-${newCode}-${idx + 1}`,
      serialId: s.serialId,
      serialNumber: s.serialNumber,
      productId: s.productId,
      productName: s.productName,
      productCode: s.productCode,
      productPrice: s.productPrice,
      defectReason: s.defectReason || payload.returnReasonGeneral,
      goodsReceiptCode: s.goodsReceiptCode,
      isPacked: false,
    }));

    const totalEstimatedValue = items.reduce((sum, it) => sum + it.productPrice, 0);

    const newOrder: SupplierReturnOrder = {
      id: `ret-${Date.now()}`,
      code: newCode,
      supplierId: payload.supplierId,
      supplierName: payload.supplierName,
      supplierCode: payload.supplierCode,
      supplierPhone: payload.supplierPhone,
      supplierEmail: payload.supplierEmail,
      supplierAddress: payload.supplierAddress,
      supplierContactPerson: payload.supplierContactPerson,
      status: 'WAITING_PACK', // GĐ 1: Chờ đóng gói hoàn hàng
      resolution: payload.resolution,
      returnReasonGeneral: payload.returnReasonGeneral,
      managerNotes: payload.managerNotes,
      totalQuantity: items.length,
      totalEstimatedValue,
      createdByName: payload.createdByName || 'Quản lý cửa hàng',
      createdAt: now.toISOString(),
      items,
      history: [
        {
          id: `log-${Date.now()}-1`,
          stageNumber: 1,
          stageName: 'GĐ 1: Lập đơn & Chỉ định sản phẩm',
          title: 'Khởi tạo đơn hoàn hàng và gửi yêu cầu đóng gói xuống bộ phận kho',
          actorName: payload.createdByName || 'Quản lý cửa hàng',
          actorRole: 'QUẢN LÝ CỬA HÀNG',
          timestamp: now.toISOString(),
          note: `Đã chọn ${items.length} serial lỗi. Chuyển trạng thái các serial sang "Chờ đóng gói hoàn hàng" và giao nhiệm vụ xuống kho.`,
        },
      ],
    };

    const updated = [newOrder, ...orders];
    this.saveOrders(updated);
    return newOrder;
  },

  /**
   * GIAI ĐOẠN 2 - BƯỚC 1 & 2 & 3: Nhân viên kho thực hiện đóng gói và xác nhận đóng gói thành công
   */
  confirmPacking(
    orderId: string,
    payload: {
      warehouseStaff: string;
      warehouseNotes?: string;
      packedItemIds?: string[]; // IDs các items đã tích đóng gói
    }
  ): SupplierReturnOrder {
    const orders = this.getOrders();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Không tìm thấy phiếu hoàn hàng');

    const target = orders[idx];
    const now = new Date().toISOString();

    // Cập nhật từng item thành packed
    const updatedItems = target.items.map((item) => {
      const isPacked =
        !payload.packedItemIds || payload.packedItemIds.length === 0
          ? true
          : payload.packedItemIds.includes(item.id);
      return {
        ...item,
        isPacked,
        packedAt: isPacked ? now : undefined,
      };
    });

    const updatedOrder: SupplierReturnOrder = {
      ...target,
      status: 'WAITING_HANDOVER', // GĐ 2: Chuyển sang "Chờ bàn giao ĐVVC"
      warehouseStaff: payload.warehouseStaff,
      warehouseNotes: payload.warehouseNotes,
      packedByName: payload.warehouseStaff,
      packedAt: now,
      items: updatedItems,
      history: [
        ...target.history,
        {
          id: `log-${Date.now()}`,
          stageNumber: 2,
          stageName: 'GĐ 2: Đóng gói & Bàn giao hàng hoàn',
          title: 'Nhân viên kho xác nhận đóng gói hoàn tất các sản phẩm chỉ định',
          actorName: payload.warehouseStaff,
          actorRole: 'NHÂN VIÊN KHO',
          timestamp: now,
          note: payload.warehouseNotes
            ? `Quy cách đóng gói: ${payload.warehouseNotes}`
            : 'Đã lấy đúng các cá thể serial từ khu vực hàng lỗi, đóng gói theo quy chuẩn bảo quản. Trạng thái chuyển sang "Chờ bàn giao ĐVVC".',
        },
      ],
    };

    orders[idx] = updatedOrder;
    this.saveOrders(orders);
    return updatedOrder;
  },

  /**
   * GIAI ĐOẠN 2 - BƯỚC 4: Nhân viên kho bàn giao đơn hoàn tới ĐVVC (Giao hàng)
   */
  handoverToCarrier(
    orderId: string,
    payload: {
      carrierName: string;
      trackingNumber: string;
      carrierPhone?: string;
      carrierNotes?: string;
      staffName: string;
    }
  ): SupplierReturnOrder {
    const orders = this.getOrders();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Không tìm thấy phiếu hoàn hàng');

    const target = orders[idx];
    const now = new Date().toISOString();

    const updatedOrder: SupplierReturnOrder = {
      ...target,
      status: 'HANDED_OVER', // GĐ 2->3: Chuyển sang "Đã bàn giao tới ĐVVC" (Đang vận chuyển)
      carrierName: payload.carrierName,
      trackingNumber: payload.trackingNumber,
      carrierPhone: payload.carrierPhone,
      carrierNotes: payload.carrierNotes,
      handedOverByName: payload.staffName,
      handedOverAt: now,
      history: [
        ...target.history,
        {
          id: `log-${Date.now()}-1`,
          stageNumber: 2,
          stageName: 'GĐ 2: Đóng gói & Bàn giao hàng hoàn',
          title: `Bàn giao kiện hàng hoàn tới Đơn vị vận chuyển: ${payload.carrierName}`,
          actorName: payload.staffName,
          actorRole: 'NHÂN VIÊN KHO',
          timestamp: now,
          note: `Đã bàn giao kiện hàng cùng biên bản xuất hoàn cho đối tác vận chuyển. Mã vận đơn: ${payload.trackingNumber}. Trạng thái cập nhật: "Đã bàn giao tới ĐVVC".`,
        },
        {
          id: `log-${Date.now()}-2`,
          stageNumber: 3,
          stageName: 'GĐ 3: Vận chuyển kiện hàng hoàn',
          title: 'Đơn vị vận chuyển tiếp nhận kiện hàng và bắt đầu lộ trình giao tới NCC',
          actorName: payload.carrierName,
          actorRole: 'ĐƠN VỊ VẬN CHUYỂN',
          timestamp: now,
          note: `ĐVVC ${payload.carrierName} đã tiếp nhận đơn thông qua thông điệp tiếp nhận, kiện hàng đang trên hành trình giao tới địa chỉ Nhà cung cấp.`,
        },
      ],
    };

    orders[idx] = updatedOrder;
    this.saveOrders(orders);
    return updatedOrder;
  },

  /**
   * GIAI ĐOẠN 3 - BƯỚC 2: ĐVVC bàn giao sản phẩm tới Nhà Cung Cấp
   */
  confirmDeliveredToSupplier(
    orderId: string,
    payload: {
      receivedByAtSupplier?: string;
      deliveryNotes?: string;
      deliveredAt?: string;
    }
  ): SupplierReturnOrder {
    const orders = this.getOrders();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Không tìm thấy phiếu hoàn hàng');

    const target = orders[idx];
    const now = payload.deliveredAt || new Date().toISOString();

    const updatedOrder: SupplierReturnOrder = {
      ...target,
      status: 'DELIVERED_SUPPLIER', // GĐ 3->4: Đã giao tới NCC (Chờ đối soát)
      deliveredAt: now,
      supplierFeedback: payload.deliveryNotes
        ? `Ghi chú bàn giao: ${payload.deliveryNotes}`
        : `Kiện hàng đã bàn giao thực tế tại kho Nhà cung cấp. Người nhận: ${payload.receivedByAtSupplier || target.supplierContactPerson || 'Bộ phận tiếp nhận RMA NCC'}.`,
      history: [
        ...target.history,
        {
          id: `log-${Date.now()}-1`,
          stageNumber: 3,
          stageName: 'GĐ 3: Vận chuyển kiện hàng hoàn',
          title: 'ĐVVC bàn giao thực tế kiện hàng tại địa chỉ Nhà cung cấp',
          actorName: target.carrierName || 'Đơn vị vận chuyển',
          actorRole: 'ĐƠN VỊ VẬN CHUYỂN',
          timestamp: now,
          note: `Kiện hàng đã đến địa chỉ kho của ${target.supplierName}. Người nhận ký biên nhận: ${payload.receivedByAtSupplier || 'Bộ phận kho tiếp nhận'}.`,
        },
        {
          id: `log-${Date.now()}-2`,
          stageNumber: 4,
          stageName: 'GĐ 4: Tiếp nhận và xác nhận hoàn tất',
          title: 'Nhà cung cấp tiếp nhận kiện hàng hoàn, kiểm tra ngoại quan và đối soát serial',
          actorName: target.supplierName,
          actorRole: 'NHÀ CUNG CẤP',
          timestamp: now,
          note: 'Nhà cung cấp đã nhận kiện hàng từ ĐVVC, đang kiểm tra đối soát số lượng và mã serial thực nhận.',
        },
      ],
    };

    orders[idx] = updatedOrder;
    this.saveOrders(orders);
    return updatedOrder;
  },

  /**
   * GIAI ĐOẠN 4 - BƯỚC 3: Quản lý cửa hàng nhận phản hồi từ NCC và xác nhận hoàn hàng thành công (Đóng quy trình)
   */
  completeOrder(
    orderId: string,
    payload: {
      managerName: string;
      supplierFeedbackNote: string;
      resolutionResult?: string;
    }
  ): SupplierReturnOrder {
    const orders = this.getOrders();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Không tìm thấy phiếu hoàn hàng');

    const target = orders[idx];
    const now = new Date().toISOString();

    const updatedOrder: SupplierReturnOrder = {
      ...target,
      status: 'COMPLETED', // GĐ 4: Hoàn tất quy trình hoàn trả
      completedByName: payload.managerName,
      completedAt: now,
      supplierFeedback: payload.supplierFeedbackNote || target.supplierFeedback,
      history: [
        ...target.history,
        {
          id: `log-${Date.now()}`,
          stageNumber: 4,
          stageName: 'GĐ 4: Tiếp nhận và xác nhận hoàn tất',
          title: 'Quản lý cửa hàng xác nhận đã hoàn hàng thành công và đóng quy trình hoàn trả',
          actorName: payload.managerName,
          actorRole: 'QUẢN LÝ CỬA HÀNG',
          timestamp: now,
          note: `Quản lý đã nhận thông điệp xác nhận từ NCC. Kết quả: ${payload.supplierFeedbackNote}. Tất cả ${target.totalQuantity} mã serial sản phẩm chính thức chuyển trạng thái "Đã trả về nhà cung cấp" (RETURNED). Quy trình hoàn trả đóng hoàn tất.`,
        },
      ],
    };

    orders[idx] = updatedOrder;
    this.saveOrders(orders);
    return updatedOrder;
  },

  /**
   * Hủy phiếu hoàn hàng (khi ở Giai đoạn 1)
   */
  cancelOrder(orderId: string, cancelReason: string, actorName = 'Quản lý cửa hàng'): SupplierReturnOrder {
    const orders = this.getOrders();
    const idx = orders.findIndex((o) => o.id === orderId);
    if (idx === -1) throw new Error('Không tìm thấy phiếu hoàn hàng');

    const target = orders[idx];
    const now = new Date().toISOString();

    const updatedOrder: SupplierReturnOrder = {
      ...target,
      status: 'CANCELLED',
      cancelledAt: now,
      cancelReason,
      history: [
        ...target.history,
        {
          id: `log-${Date.now()}`,
          stageNumber: 1,
          stageName: 'Hủy phiếu',
          title: 'Hủy đơn hoàn hàng',
          actorName,
          actorRole: 'QUẢN LÝ CỬA HÀNG',
          timestamp: now,
          note: `Lý do hủy: ${cancelReason}. Các serial được trả lại kho hàng lỗi.`,
        },
      ],
    };

    orders[idx] = updatedOrder;
    this.saveOrders(orders);
    return updatedOrder;
  },

  /**
   * Lấy danh sách các serial lỗi hiện có từ backend hoặc mock để phục vụ chọn khi tạo đơn hoàn hàng
   */
  async getDefectiveSerialsCandidates(): Promise<DefectiveSerialCandidate[]> {
    const activeOrders = this.getOrders().filter((o) => o.status !== 'CANCELLED' && o.status !== 'COMPLETED');
    const usedSerialNumbers = new Set<string>();
    activeOrders.forEach((o) => {
      o.items.forEach((it) => usedSerialNumbers.add(it.serialNumber));
    });

    try {
      // Gọi backend lấy receipts
      const [grRes, supRes, prodRes] = await Promise.all([
        adminGoodsReceiptService.getAllReceipts({ size: 50 }).catch(() => null),
        adminSupplierService.getAllSuppliers({ size: 100 }).catch(() => null),
        adminProductService.getAllProducts({ size: 100 }).catch(() => null),
      ]);

      const candidates: DefectiveSerialCandidate[] = [];

      if (grRes?.content && supRes?.content && prodRes?.content) {
        const supMap = new Map<number, any>();
        supRes.content.forEach((s) => supMap.set(s.id, s));

        const prodMap = new Map<number, any>();
        prodRes.content.forEach((p) => prodMap.set(p.id, p));

        grRes.content.forEach((gr) => {
          (gr.items || []).forEach((item) => {
            (item.productSerials || []).forEach((ser) => {
              if (ser.status === 'DEFECTIVE' || ser.status === 'PENDING_RETURN') {
                const prod = prodMap.get(ser.productId);
                const sup = supMap.get(prod?.supplierId || 1);
                candidates.push({
                  serialId: ser.id,
                  serialNumber: ser.serialNumber,
                  productId: ser.productId,
                  productName: prod?.name || `Sản phẩm #${ser.productId}`,
                  productCode: prod?.code || `SP-${ser.productId}`,
                  productPrice: prod?.price || item.actualUnitCost || 0,
                  supplierId: sup?.id || 1,
                  supplierName: sup?.name || 'Nhà cung cấp đối tác',
                  supplierCode: sup?.code || 'NCC-DEFAULT',
                  goodsReceiptId: gr.id,
                  goodsReceiptCode: gr.code,
                  receiptDate: gr.receivedAt ? new Date(gr.receivedAt).toLocaleDateString('vi-VN') : undefined,
                  defectReason: 'Phát hiện lỗi không hoạt động / trầy xước khi kiểm đếm nhập kho',
                  status: ser.status,
                  isInActiveReturnOrder: usedSerialNumbers.has(ser.serialNumber),
                });
              }
            });
          });
        });
      }

      // Gộp cùng mock data để luôn có phong phú sản phẩm test
      MOCK_DEFECTIVE_CANDIDATES.forEach((m) => {
        if (!candidates.some((c) => c.serialNumber === m.serialNumber)) {
          candidates.push({
            ...m,
            isInActiveReturnOrder: usedSerialNumbers.has(m.serialNumber),
          });
        }
      });

      return candidates;
    } catch {
      return MOCK_DEFECTIVE_CANDIDATES.map((m) => ({
        ...m,
        isInActiveReturnOrder: usedSerialNumbers.has(m.serialNumber),
      }));
    }
  },

  /**
   * Reset lại dữ liệu mẫu (cho việc demo)
   */
  resetToSampleData(): SupplierReturnOrder[] {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_RETURN_ORDERS));
    return INITIAL_RETURN_ORDERS;
  },
};

