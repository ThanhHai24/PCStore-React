import type { ProductType } from '../types/adminProduct';

export interface SpecItemData {
  key: string;
  name: string;
  warranty?: string;
  productId?: string;
  productCode?: string;
  productPrice?: number;
}

export interface SpecTemplateField {
  key: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  defaultWarranty?: string;
  type?: 'text' | 'select';
  options?: string[];
}

export interface ComponentTemplate {
  id: string;
  name: string;
  categoryKeywords: string[];
  fields: SpecTemplateField[];
}

/**
 * 9 linh kiện bắt buộc / tiêu chuẩn cho PC Build
 * (cpu, mainboard, ram, ssd, hdd, psu, case, cooler, casefan, vga)
 */
export const PC_STANDARD_PARTS: Array<{
  id: string;
  key: string;
  label: string;
  categoryKeywords: string[];
  defaultWarranty: string;
}> = [
    { id: 'cpu', key: 'CPU', label: 'CPU (Bộ vi xử lý)', categoryKeywords: ['cpu', 'bộ xử lý', 'vi xử lý', 'processor'], defaultWarranty: '36 Tháng' },
    { id: 'mainboard', key: 'Mainboard', label: 'Bo mạch chủ (Mainboard)', categoryKeywords: ['mainboard', 'bo mạch', 'motherboard', 'main'], defaultWarranty: '36 Tháng' },
    { id: 'ram', key: 'RAM', label: 'Bộ nhớ trong (RAM)', categoryKeywords: ['ram', 'bộ nhớ'], defaultWarranty: '36 Tháng' },
    { id: 'ssd', key: 'SSD', label: 'Ổ cứng SSD', categoryKeywords: ['ssd', 'ổ cứng ssd', 'nvme', 'ổ ssd'], defaultWarranty: '36 Tháng' },
    { id: 'hdd', key: 'HDD', label: 'Ổ cứng HDD', categoryKeywords: ['hdd', 'ổ cứng hdd', 'ổ cứng cơ', 'ổ hdd'], defaultWarranty: '24 Tháng' },
    { id: 'psu', key: 'PSU', label: 'Nguồn máy tính (PSU)', categoryKeywords: ['psu', 'nguồn', 'power supply'], defaultWarranty: '36 Tháng' },
    { id: 'case', key: 'Case', label: 'Vỏ máy tính (Case)', categoryKeywords: ['case', 'vỏ máy', 'thùng máy', 'vỏ case'], defaultWarranty: '12 Tháng' },
    { id: 'cooler', key: 'Cooler', label: 'Tản nhiệt CPU (Cooler)', categoryKeywords: ['tản nhiệt', 'cooler', 'aio', 'cooling'], defaultWarranty: '24 Tháng' },
    { id: 'casefan', key: 'Case Fan', label: 'Quạt tản nhiệt (Case Fan)', categoryKeywords: ['fan', 'quạt', 'casefan'], defaultWarranty: '12 Tháng' },
    { id: 'vga', key: 'VGA', label: 'Card đồ họa (VGA / GPU)', categoryKeywords: ['vga', 'card', 'gpu', 'đồ họa', 'card màn hình'], defaultWarranty: '36 Tháng' },
  ];

/**
 * Cấu hình tiêu chuẩn cho Laptop (nhập trực tiếp thông số)
 */
export const LAPTOP_STANDARD_FIELDS: SpecTemplateField[] = [
  { key: 'CPU', label: 'Bộ vi xử lý (CPU)', placeholder: 'VD: Intel Core i7-13700H (14 nhân, 20 luồng, up to 5.0 GHz)' },
  { key: 'RAM', label: 'Bộ nhớ RAM', placeholder: 'VD: 16GB (2x8GB) DDR5 4800MHz (2 khe, nâng cấp tối đa 64GB)' },
  { key: 'Ổ cứng', label: 'Ổ cứng lưu trữ', placeholder: 'VD: 512GB M.2 NVMe PCIe Gen 4 SSD (Còn trống 1 khe M.2)' },
  { key: 'Card đồ họa', label: 'Card đồ họa (GPU)', placeholder: 'VD: NVIDIA GeForce RTX 4060 8GB GDDR6' },
  { key: 'Màn hình', label: 'Màn hình', placeholder: 'VD: 15.6 inch FHD (1920x1080) 144Hz IPS, 100% sRGB' },
  { key: 'Bàn phím & Touchpad', label: 'Bàn phím & Chuột cảm ứng', placeholder: 'VD: Đèn nền RGB 4 vùng, Touchpad cảm ứng đa điểm' },
  { key: 'Cổng kết nối', label: 'Cổng kết nối (I/O)', placeholder: 'VD: 1x Type-C (Thunderbolt 4), 3x USB 3.2 Gen 1, 1x HDMI 2.1, 1x RJ45, 1x Audio 3.5mm' },
  { key: 'Pin & Sạc', label: 'Pin & Bộ sạc', placeholder: 'VD: 4-Cell 90Wh, Củ sạc 240W' },
  { key: 'Trọng lượng & Kích thước', label: 'Trọng lượng & Kích thước', placeholder: 'VD: 2.2 kg - 354 x 251 x 22.4 mm' },
  { key: 'Hệ điều hành', label: 'Hệ điều hành', placeholder: 'VD: Windows 11 Home bản quyền' },
  { key: 'Bảo hành', label: 'Thời gian bảo hành', placeholder: 'VD: 24 Tháng chính hãng' },
];

/**
 * Các mẫu thông số kỹ thuật chi tiết cho từng loại Linh kiện / Thiết bị
 */
export const COMPONENT_SPEC_TEMPLATES: ComponentTemplate[] = [
  {
    id: 'vga',
    name: 'VGA / Card màn hình',
    categoryKeywords: ['vga', 'card màn hình', 'card đồ họa', 'gpu', 'đồ họa'],
    fields: [
      { key: 'Chipset đồ họa', label: 'Chipset đồ họa (GPU)', placeholder: 'VD: GeForce RTX 4070 SUPER' },
      { key: 'Dung lượng bộ nhớ', label: 'Dung lượng VRAM', placeholder: 'VD: 12GB GDDR6X' },
      { key: 'Giao diện bộ nhớ', label: 'Memory Bus', placeholder: 'VD: 192-bit' },
      { key: 'Xung nhịp Boost', label: 'Xung nhịp Boost Clock', placeholder: 'VD: 2505 MHz' },
      { key: 'Cổng kết nối', label: 'Cổng xuất hình', placeholder: 'VD: 3x DisplayPort 1.4a, 1x HDMI 2.1a' },
      { key: 'Chuẩn giao tiếp', label: 'Giao diện PCIe', placeholder: 'VD: PCI Express 4.0 x16' },
      { key: 'Nguồn khuyến nghị', label: 'Nguồn khuyến nghị (PSU)', placeholder: 'VD: Tối thiểu 650W, đầu cấp nguồn 1x 16-pin' },
      { key: 'Kích thước card', label: 'Kích thước', placeholder: 'VD: 261 x 126 x 50 mm (2.5 slot)' },
      { key: 'Bảo hành', label: 'Bảo hành', placeholder: 'VD: 36 Tháng' },
    ],
  },
  {
    id: 'cpu',
    name: 'CPU / Bộ vi xử lý',
    categoryKeywords: ['cpu', 'bộ vi xử lý', 'vi xử lý', 'bộ xử lý', 'processor'],
    fields: [
      {
        key: 'Dòng CPU (Series)',
        label: 'Dòng CPU (Series)',
        type: 'select',
        options: [
          'Intel Core i3',
          'Intel Core i5',
          'Intel Core i7',
          'Intel Core i9',
          'Intel Core Ultra 5',
          'Intel Core Ultra 7',
          'Intel Core Ultra 9',
          'AMD Ryzen 3',
          'AMD Ryzen 5',
          'AMD Ryzen 7',
          'AMD Ryzen 9',
          'AMD Ryzen Threadripper',
          'Intel Xeon',
        ],
      },
      {
        key: 'Mã sản phẩm (Model)',
        label: 'Mã sản phẩm (Model)',
        type: 'text',
        placeholder: 'Ví dụ: i5-14600K, Ryzen 5 7600X, i7-14700KF...',
      },
      {
        key: 'Thế hệ (Generation)',
        label: 'Thế hệ (Generation)',
        type: 'select',
        options: [
          'Intel Gen 14th',
          'Intel Gen 13th',
          'Intel Gen 12th',
          'Intel Core Ultra Series 2',
          'Intel Core Ultra Series 1',
          'Intel Gen 11th',
          'Intel Gen 10th',
          'AMD Ryzen 9000 Series',
          'AMD Ryzen 8000 Series',
          'AMD Ryzen 7000 Series',
          'AMD Ryzen 5000 Series',
        ],
      },
      {
        key: 'Socket',
        label: 'Socket',
        type: 'select',
        options: [
          'LGA 1700',
          'LGA 1851',
          'LGA 1200',
          'AM5',
          'AM4',
          'sTR5',
          'sTRX4',
        ],
      },
      {
        key: 'Kiến trúc (Codename)',
        label: 'Kiến trúc (Codename)',
        type: 'text',
        placeholder: 'Ví dụ: Raptor Lake, Zen 4, Arrow Lake, Alder Lake...',
      },
      {
        key: 'Tổng số nhân (Cores)',
        label: 'Tổng số nhân (Cores)',
        type: 'select',
        options: [
          '4 Nhân',
          '6 Nhân',
          '8 Nhân',
          '10 Nhân (6P + 4E)',
          '12 Nhân',
          '14 Nhân (6P + 8E)',
          '16 Nhân (8P + 8E)',
          '20 Nhân (8P + 12E)',
          '24 Nhân (8P + 16E)',
          '32 Nhân',
          '64 Nhân',
        ],
        placeholder: 'Ví dụ: 14 Nhân (6 P-cores + 8 E-cores) hoặc 8 Nhân',
      },
      {
        key: 'Số nhân hiệu năng cao (P-cores)',
        label: 'Số nhân hiệu năng cao (P-cores)',
        type: 'text',
        placeholder: 'Ví dụ: 6 P-cores (hoặc để trống nếu không có)',
      },
      {
        key: 'Số nhân tiết kiệm điện (E-cores)',
        label: 'Số nhân tiết kiệm điện (E-cores)',
        type: 'text',
        placeholder: 'Ví dụ: 8 E-cores (hoặc để trống nếu không có)',
      },
      {
        key: 'Số luồng (Threads)',
        label: 'Số luồng (Threads)',
        type: 'select',
        options: [
          '4 Luồng',
          '6 Luồng',
          '8 Luồng',
          '12 Luồng',
          '16 Luồng',
          '20 Luồng',
          '24 Luồng',
          '28 Luồng',
          '32 Luồng',
          '64 Luồng',
          '128 Luồng',
        ],
      },
      {
        key: 'Xung nhịp cơ bản (Base Clock)',
        label: 'Xung nhịp cơ bản (Base Clock)',
        type: 'text',
        placeholder: 'Ví dụ: 3.5 GHz (P-core: 3.5 GHz, E-core: 2.6 GHz)',
      },
      {
        key: 'Xung nhịp tối đa (Boost Clock)',
        label: 'Xung nhịp tối đa (Boost Clock)',
        type: 'text',
        placeholder: 'Ví dụ: 5.3 GHz',
      },
      {
        key: 'Bộ nhớ đệm L2 (L2 Cache)',
        label: 'Bộ nhớ đệm L2 (L2 Cache)',
        type: 'text',
        placeholder: 'Ví dụ: 20MB',
      },
      {
        key: 'Bộ nhớ đệm L3 (L3 Cache)',
        label: 'Bộ nhớ đệm L3 (L3 Cache)',
        type: 'text',
        placeholder: 'Ví dụ: 24MB (hoặc 32MB, 96MB 3D V-Cache)',
      },
      {
        key: 'Chuẩn RAM hỗ trợ',
        label: 'Chuẩn RAM hỗ trợ',
        type: 'select',
        options: [
          'DDR4 / DDR5',
          'DDR5',
          'DDR4',
        ],
      },
      {
        key: 'Tốc độ RAM tối đa',
        label: 'Tốc độ RAM tối đa',
        type: 'text',
        placeholder: 'Ví dụ: Up to DDR5 5600 MT/s, DDR4 3200 MT/s',
      },
      {
        key: 'Dung lượng RAM tối đa',
        label: 'Dung lượng RAM tối đa',
        type: 'select',
        options: [
          '192GB',
          '128GB',
          '64GB',
          '256GB',
          '512GB',
        ],
      },
      {
        key: 'Kênh bộ nhớ (Memory Channels)',
        label: 'Kênh bộ nhớ (Memory Channels)',
        type: 'select',
        options: [
          '2 (Dual Channel)',
          '4 (Quad Channel)',
          '1 (Single Channel)',
        ],
      },
      {
        key: 'Phiên bản PCIe hỗ trợ',
        label: 'Phiên bản PCIe hỗ trợ',
        type: 'select',
        options: [
          'PCIe 5.0 / PCIe 4.0',
          'PCIe 5.0',
          'PCIe 4.0',
          'PCIe 3.0',
        ],
      },
      {
        key: 'GPU tích hợp',
        label: 'GPU tích hợp',
        type: 'select',
        options: [
          'Không có (Dòng F Intel / CPU không iGPU)',
          'Intel UHD Graphics 770',
          'Intel UHD Graphics 730',
          'Intel UHD Graphics 710',
          'Intel Arc Graphics',
          'AMD Radeon Graphics',
          'AMD Radeon 780M / 760M',
        ],
      },
      {
        key: 'Xung nhịp đồ họa',
        label: 'Xung nhịp đồ họa',
        type: 'text',
        placeholder: 'Ví dụ: 1.50 GHz (hoặc Không có)',
      },
      {
        key: 'TDP mặc định (Base Power)',
        label: 'TDP mặc định (Base Power)',
        type: 'select',
        options: [
          '65W',
          '125W',
          '105W',
          '170W',
          '35W',
          '45W',
          '54W',
          '58W',
          '150W',
        ],
      },
      {
        key: 'TDP tối đa (Turbo Power)',
        label: 'TDP tối đa (Turbo Power)',
        type: 'text',
        placeholder: 'Ví dụ: 181W, 253W...',
      },
      {
        key: 'Nhiệt độ hoạt động tối đa (T-junction)',
        label: 'Nhiệt độ hoạt động tối đa (T-junction)',
        type: 'select',
        options: [
          '100°C',
          '95°C',
          '90°C',
          '105°C',
        ],
      },
      {
        key: 'Tản nhiệt đi kèm (Stock Cooler)',
        label: 'Tản nhiệt đi kèm (Stock Cooler)',
        type: 'select',
        options: [
          'Không',
          'Có',
          'Có (Intel Laminar)',
          'Có (AMD Wraith Stealth)',
          'Có (AMD Wraith Prism RGB)',
        ],
      },
      {
        key: 'Bảo hành',
        label: 'Thời gian bảo hành',
        type: 'select',
        defaultValue: '36 Tháng',
        defaultWarranty: '36 Tháng',
        options: [
          '36 Tháng',
          '24 Tháng',
          '12 Tháng',
        ],
      },
    ],
  },
  {
    id: 'mainboard',
    name: 'Mainboard / Bo mạch chủ',
    categoryKeywords: ['mainboard', 'bo mạch', 'motherboard', 'bo mạch chủ', 'main'],
    fields: [
      { key: 'Chipset', label: 'Chipset bo mạch', placeholder: 'VD: Intel B760 / AMD B650' },
      { key: 'Socket', label: 'Socket vi xử lý', placeholder: 'VD: LGA 1700 / AM5' },
      { key: 'Chuẩn kích thước', label: 'Form Factor', placeholder: 'VD: Micro-ATX (24.4 x 24.4 cm)' },
      { key: 'Khe cắm RAM', label: 'Số khe & Chuẩn RAM', placeholder: 'VD: 4x DDR5, Tối đa 192GB, Bus 7200+(OC) MHz' },
      { key: 'Khe mở rộng', label: 'Khe cắm PCIe', placeholder: 'VD: 1x PCIe 5.0 x16, 2x PCIe 4.0 x16 (hỗ trợ x1)' },
      { key: 'Lưu trữ hỗ trợ', label: 'Cổng lưu trữ', placeholder: 'VD: 2x M.2 PCIe 4.0 x4, 4x SATA 6Gb/s' },
      { key: 'Kết nối mạng', label: 'LAN / Wi-Fi', placeholder: 'VD: 2.5Gb Ethernet, Wi-Fi 6E + Bluetooth 5.3' },
      { key: 'Cổng kết nối sau', label: 'Cổng I/O phía sau', placeholder: 'VD: 1x USB-C 3.2 Gen2, 4x USB 3.2, 2x USB 2.0, HDMI, DP' },
      { key: 'Bảo hành', label: 'Bảo hành', placeholder: 'VD: 36 Tháng' },
    ],
  },
  {
    id: 'ram',
    name: 'RAM / Bộ nhớ trong',
    categoryKeywords: ['ram', 'bộ nhớ ram', 'bộ nhớ trong', 'dram'],
    fields: [
      { key: 'Dung lượng', label: 'Dung lượng RAM', placeholder: 'VD: 32GB (2x16GB)' },
      { key: 'Chuẩn RAM', label: 'Thế hệ RAM', placeholder: 'VD: DDR5 / DDR4' },
      { key: 'Tốc độ Bus', label: 'Tốc độ Bus (MHz)', placeholder: 'VD: 6000MHz' },
      { key: 'Độ trễ (CAS Latency)', label: 'Độ trễ CL', placeholder: 'VD: CL30 (30-36-36-76)' },
      { key: 'Điện áp hoạt động', label: 'Điện áp', placeholder: 'VD: 1.35V' },
      { key: 'Hỗ trợ Profile', label: 'XMP / EXPO', placeholder: 'VD: Intel XMP 3.0 & AMD EXPO' },
      { key: 'Tản nhiệt & LED', label: 'Tản nhiệt / LED', placeholder: 'VD: Tản nhôm cao cấp, LED RGB đồng bộ' },
      { key: 'Bảo hành', label: 'Bảo hành', placeholder: 'VD: 36 Tháng' },
    ],
  },
  {
    id: 'ssd',
    name: 'Ổ cứng SSD',
    categoryKeywords: ['ssd', 'nvme', 'ổ cứng ssd', 'ổ ssd', 'thể rắn'],
    fields: [
      { key: 'Dung lượng', label: 'Dung lượng lưu trữ', placeholder: 'VD: 1TB / 2TB' },
      { key: 'Chuẩn giao tiếp', label: 'Form Factor & Giao thức', placeholder: 'VD: M.2 2280 NVMe PCIe 4.0 x4' },
      { key: 'Tốc độ đọc tuần tự', label: 'Tốc độ đọc (Max)', placeholder: 'VD: Lên tới 7450 MB/s' },
      { key: 'Tốc độ ghi tuần tự', label: 'Tốc độ ghi (Max)', placeholder: 'VD: Lên tới 6900 MB/s' },
      { key: 'Độ bền (TBW)', label: 'Chỉ số TBW', placeholder: 'VD: 600 TBW' },
      { key: 'Bộ nhớ đệm DRAM', label: 'DRAM Cache', placeholder: 'VD: 1GB LPDDR4 / HMB (DRAM-less)' },
      { key: 'Bảo hành', label: 'Bảo hành', placeholder: 'VD: 60 Tháng (hoặc theo TBW)' },
    ],
  },
  {
    id: 'hdd',
    name: 'Ổ cứng HDD',
    categoryKeywords: ['hdd', 'ổ cứng cơ', 'ổ cứng hdd', 'ổ hdd'],
    fields: [
      { key: 'Dung lượng', label: 'Dung lượng', placeholder: 'VD: 2TB / 4TB' },
      { key: 'Kích thước', label: 'Kích thước Form Factor', placeholder: 'VD: 3.5 inch' },
      { key: 'Tốc độ vòng quay', label: 'Tốc độ quay (RPM)', placeholder: 'VD: 7200 RPM / 5400 RPM' },
      { key: 'Bộ nhớ đệm (Cache)', label: 'Bộ nhớ đệm', placeholder: 'VD: 256MB Cache' },
      { key: 'Chuẩn kết nối', label: 'Cổng kết nối', placeholder: 'VD: SATA 3 (6Gb/s)' },
      { key: 'Bảo hành', label: 'Bảo hành', placeholder: 'VD: 24 Tháng' },
    ],
  },
  {
    id: 'psu',
    name: 'Nguồn máy tính (PSU)',
    categoryKeywords: ['psu', 'nguồn', 'power supply', 'nguồn máy tính'],
    fields: [
      { key: 'Công suất thực', label: 'Công suất tối đa', placeholder: 'VD: 750W / 850W' },
      { key: 'Chứng nhận hiệu suất', label: 'Chuẩn 80 Plus', placeholder: 'VD: 80 Plus Gold (Hiệu suất > 90%)' },
      { key: 'Kiểu cáp nguồn', label: 'Modular', placeholder: 'VD: Full Modular (Dây rời toàn bộ)' },
      { key: 'Chuẩn nguồn', label: 'Tiêu chuẩn', placeholder: 'VD: ATX 3.0, PCIe 5.0 (Cáp 12VHPWR 16-pin)' },
      { key: 'Kích thước quạt làm mát', label: 'Quạt tản nhiệt', placeholder: 'VD: 120mm FDB Fan, chế độ Zero RPM' },
      { key: 'Bảo vệ nguồn', label: 'Chế độ bảo vệ', placeholder: 'VD: OVP, UVP, OCP, OTP, SCP, OPP' },
      { key: 'Bảo hành', label: 'Bảo hành', placeholder: 'VD: 60 Tháng' },
    ],
  },
  {
    id: 'case',
    name: 'Vỏ máy tính (Case)',
    categoryKeywords: ['case', 'vỏ máy', 'thùng máy', 'vỏ case'],
    fields: [
      { key: 'Loại case', label: 'Kiểu thùng máy', placeholder: 'VD: Mid Tower / Mini Tower' },
      { key: 'Chất liệu', label: 'Chất liệu vỏ', placeholder: 'VD: Thép SPCC 0.7mm, Kính cường lực 4mm' },
      { key: 'Hỗ trợ Mainboard', label: 'Mainboard hỗ trợ', placeholder: 'VD: E-ATX, ATX, Micro-ATX, Mini-ITX' },
      { key: 'Hỗ trợ VGA tối đa', label: 'Chiều dài VGA tối đa', placeholder: 'VD: Tối đa 380mm' },
      { key: 'Hỗ trợ tản CPU', label: 'Chiều cao tản CPU tối đa', placeholder: 'VD: Tối đa 165mm' },
      { key: 'Hỗ trợ Radiator tản nước', label: 'Radiator tản nhiệt', placeholder: 'VD: Mặt trên 240/280/360mm, Mặt trước 360mm' },
      { key: 'Số quạt đi kèm', label: 'Quạt tản nhiệt lắp sẵn', placeholder: 'VD: 3x Fan ARGB 120mm mặt trước, 1x Fan 120mm phía sau' },
      { key: 'Cổng kết nối mặt trước', label: 'Cổng I/O mặt trước', placeholder: 'VD: 1x USB-C, 2x USB 3.0, Audio HD' },
      { key: 'Bảo hành', label: 'Bảo hành', placeholder: 'VD: 12 Tháng' },
    ],
  },
  {
    id: 'cooler',
    name: 'Tản nhiệt (Cooler / Fan)',
    categoryKeywords: ['tản nhiệt', 'cooler', 'quạt tản', 'cooling', 'aio', 'quạt làm mát', 'case fan', 'fan'],
    fields: [
      { key: 'Loại tản nhiệt', label: 'Kiểu tản nhiệt', placeholder: 'VD: Tản nhiệt nước AIO 360mm / Tản khí tháp đôi' },
      { key: 'Socket CPU hỗ trợ', label: 'Socket hỗ trợ', placeholder: 'VD: Intel LGA1700/1200/115x, AMD AM5/AM4' },
      { key: 'Kích thước Radiator/Tản', label: 'Kích thước', placeholder: 'VD: 397 x 120 x 27 mm (Radiator nhôm)' },
      { key: 'Thông số quạt', label: 'Quạt tản nhiệt', placeholder: 'VD: 3x 120mm PWM (800 - 2000 RPM, 72 CFM)' },
      { key: 'Độ ồn quạt', label: 'Độ ồn tối đa', placeholder: 'VD: < 28.5 dBA' },
      { key: 'Đèn LED hiển thị', label: 'LED & Màn hình', placeholder: 'VD: Màn hình LCD 2.4 inch hiển thị thông số, LED ARGB' },
      { key: 'Bảo hành', label: 'Bảo hành', placeholder: 'VD: 36 Tháng (Đổi mới nếu rò nước)' },
    ],
  },
  {
    id: 'monitor',
    name: 'Màn hình máy tính',
    categoryKeywords: ['màn hình', 'monitor', 'display', 'screen', 'màn'],
    fields: [
      { key: 'Kích thước màn hình', label: 'Kích thước (inch)', placeholder: 'VD: 27 inch' },
      { key: 'Độ phân giải', label: 'Độ phân giải', placeholder: 'VD: 2K QHD (2560 x 1440)' },
      { key: 'Tấm nền', label: 'Tấm nền hiển thị', placeholder: 'VD: Fast IPS / OLED' },
      { key: 'Tần số quét', label: 'Tần số quét (Hz)', placeholder: 'VD: 180Hz / 240Hz' },
      { key: 'Thời gian phản hồi', label: 'Thời gian phản hồi', placeholder: 'VD: 1ms (GtG) / 0.03ms' },
      { key: 'Độ sáng & Độ tương phản', label: 'Độ sáng & Tương phản', placeholder: 'VD: 400 cd/m² (HDR400), 1000:1' },
      { key: 'Độ phủ màu', label: 'Độ phủ màu', placeholder: 'VD: 99% sRGB, 95% DCI-P3' },
      { key: 'Cổng kết nối', label: 'Cổng xuất hình', placeholder: 'VD: 2x HDMI 2.0, 1x DisplayPort 1.4, 1x Audio 3.5mm' },
      { key: 'Tính năng chân đế', label: 'Khả năng điều chỉnh chân đế', placeholder: 'VD: Nâng hạ độ cao, xoay dọc 90 độ, gập nghiêng' },
      { key: 'Bảo hành', label: 'Bảo hành', placeholder: 'VD: 36 Tháng chính hãng' },
    ],
  },
  {
    id: 'keyboard',
    name: 'Bàn phím máy tính',
    categoryKeywords: ['bàn phím', 'keyboard', 'phím cơ', 'bàn phím cơ', 'phím'],
    fields: [
      { key: 'Loại bàn phím', label: 'Kiểu bàn phím', placeholder: 'VD: Bàn phím cơ Custom / Bàn phím văn phòng' },
      { key: 'Loại Switch', label: 'Switch phím', placeholder: 'VD: Red Switch / Brown Switch / Switch từ tính HE' },
      { key: 'Layout & Kích thước', label: 'Layout phím', placeholder: 'VD: 75% (82 phím) / Fullsize 108 phím / TKL 87 phím' },
      { key: 'Chuẩn kết nối', label: 'Kết nối', placeholder: 'VD: 3 chế độ (Type-C có dây, Wireless 2.4GHz, Bluetooth 5.1)' },
      { key: 'Chất liệu Keycap', label: 'Keycap & Profile', placeholder: 'VD: PBT Double-shot, Cherry Profile' },
      { key: 'Tính năng Hot-swap', label: 'Hỗ trợ Hot-swap', placeholder: 'VD: Có hỗ trợ Hot-swap 5-pin xuôi mạch' },
      { key: 'Đèn nền', label: 'Hệ thống LED', placeholder: 'VD: LED RGB 16.8 triệu màu từng phím' },
      { key: 'Thời lượng Pin', label: 'Dung lượng pin', placeholder: 'VD: 4000mAh (Lên tới 200 giờ sử dụng)' },
      { key: 'Bảo hành', label: 'Bảo hành', placeholder: 'VD: 24 Tháng' },
    ],
  },
  {
    id: 'mouse',
    name: 'Chuột máy tính',
    categoryKeywords: ['chuột', 'mouse', 'chuột gaming', 'chuột không dây'],
    fields: [
      { key: 'Cảm biến (Sensor)', label: 'Mắt đọc / Cảm biến', placeholder: 'VD: PixArt PAW3395 / HERO 25K' },
      { key: 'Độ phân giải (DPI)', label: 'Mức DPI tối đa', placeholder: 'VD: Lên tới 26.000 DPI' },
      { key: 'Tần số phản hồi', label: 'Polling Rate', placeholder: 'VD: 1000Hz / 4000Hz / 8000Hz' },
      { key: 'Chuẩn kết nối', label: 'Kết nối', placeholder: 'VD: Wireless 2.4GHz + Bluetooth + Type-C' },
      { key: 'Số nút bấm', label: 'Số lượng nút', placeholder: 'VD: 6 nút bấm có thể lập trình' },
      { key: 'Trọng lượng', label: 'Trọng lượng', placeholder: 'VD: Siêu nhẹ 52g' },
      { key: 'Thời lượng Pin', label: 'Pin sử dụng', placeholder: 'VD: Lên tới 90 giờ liên tục' },
      { key: 'Switch chuột', label: 'Độ bền Switch', placeholder: 'VD: Huano Blue Shell Pink Dot (80 triệu lần nhấn)' },
      { key: 'Bảo hành', label: 'Bảo hành', placeholder: 'VD: 24 Tháng' },
    ],
  },
  {
    id: 'headset',
    name: 'Tai nghe / Âm thanh',
    categoryKeywords: ['tai nghe', 'headset', 'headphone', 'earphone', 'loa', 'âm thanh', 'speaker'],
    fields: [
      { key: 'Kiểu tai nghe', label: 'Thiết kế', placeholder: 'VD: Chụp tai Over-ear / Nhét tai In-ear' },
      { key: 'Chuẩn kết nối', label: 'Cổng kết nối', placeholder: 'VD: Wireless 2.4GHz + Bluetooth 5.2 + Jack 3.5mm' },
      { key: 'Kích thước Driver', label: 'Màng loa (Driver)', placeholder: 'VD: 50mm Neodymium' },
      { key: 'Dải tần số đáp ứng', label: 'Dải tần đáp ứng', placeholder: 'VD: 20Hz - 20.000Hz' },
      { key: 'Trở kháng', label: 'Trở kháng', placeholder: 'VD: 32 Ohm' },
      { key: 'Microphone', label: 'Micro đàm thoại', placeholder: 'VD: Mic tháo rời khử ồn đa hướng' },
      { key: 'Công nghệ âm thanh', label: 'Âm thanh vòm', placeholder: 'VD: Giả lập 7.1 Virtual Surround Sound' },
      { key: 'Trọng lượng', label: 'Trọng lượng', placeholder: 'VD: 260g đệm mút hoạt tính êm ái' },
      { key: 'Bảo hành', label: 'Bảo hành', placeholder: 'VD: 24 Tháng' },
    ],
  },
  {
    id: 'gear',
    name: 'Gaming Gear & Phụ kiện',
    categoryKeywords: ['gear', 'gaming gear', 'phụ kiện', 'tay cầm', 'webcam', 'ghế', 'bàn gaming', 'lót chuột', 'mousepad'],
    fields: [
      { key: 'Loại thiết bị', label: 'Phân loại', placeholder: 'VD: Tay cầm chơi game / Webcam FHD / Ghế gaming' },
      { key: 'Chuẩn kết nối', label: 'Kết nối', placeholder: 'VD: USB / Wireless 2.4GHz / Bluetooth' },
      { key: 'Chất liệu & Thiết kế', label: 'Chất liệu', placeholder: 'VD: Da PU cao cấp / Nhựa ABS chịu lực' },
      { key: 'Tính năng nổi bật', label: 'Tính năng chính', placeholder: 'VD: Cần xoay Hall Effect chống trôi, rung phản hồi' },
      { key: 'Tương thích', label: 'Hệ máy hỗ trợ', placeholder: 'VD: PC Windows, macOS, Android, iOS, Console' },
      { key: 'Bảo hành', label: 'Bảo hành', placeholder: 'VD: 12 Tháng / 24 Tháng' },
    ],
  },
  {
    id: 'generic',
    name: 'Mẫu linh kiện tùy chỉnh (Tự do)',
    categoryKeywords: [],
    fields: [
      { key: 'Thương hiệu / Xuất xứ', label: 'Thương hiệu', placeholder: 'VD: Chính hãng' },
      { key: 'Tính năng nổi bật', label: 'Tính năng', placeholder: 'VD: Hiệu năng cao, độ bền vượt trội' },
      { key: 'Kích thước & Trọng lượng', label: 'Kích thước', placeholder: 'VD: Chuẩn nhà sản xuất' },
      { key: 'Bảo hành', label: 'Bảo hành', placeholder: 'VD: 36 Tháng' },
    ],
  },
];

/**
 * Tự động xác định ProductType ('LAPTOP' | 'PC' | 'COMPONENT') dựa trên tên danh mục
 */
export function detectProductTypeFromCategory(categoryName?: string): ProductType {
  if (!categoryName) return 'COMPONENT';
  const lower = categoryName.toLowerCase().trim();

  // 1. Laptop
  if (
    lower.includes('laptop') ||
    lower.includes('máy tính xách tay') ||
    lower.includes('notebook') ||
    lower.includes('macbook')
  ) {
    return 'LAPTOP';
  }

  // 2. PC (Desktop / Nguyên bộ)
  if (
    lower.includes('máy tính để bàn') ||
    lower.includes('máy bộ') ||
    lower.includes('nguyên bộ') ||
    lower.includes('desktop') ||
    lower.includes('pc đồng bộ') ||
    lower.includes('pc gaming') ||
    lower.includes('pc đồ họa') ||
    lower.includes('pc văn phòng') ||
    lower.includes('bộ máy tính') ||
    lower.startsWith('pc ') ||
    lower.endsWith(' pc') ||
    lower.includes(' pc ') ||
    lower === 'pc'
  ) {
    return 'PC';
  }

  // 3. Components & Peripherals
  return 'COMPONENT';
}

/**
 * Tự động tìm kiếm mẫu linh kiện phù hợp dựa trên tên danh mục
 */
export function detectComponentTemplate(categoryName?: string): ComponentTemplate {
  if (!categoryName) {
    return COMPONENT_SPEC_TEMPLATES[0]; // Mặc định là VGA
  }
  const lower = categoryName.toLowerCase().trim();

  for (const t of COMPONENT_SPEC_TEMPLATES) {
    if (t.id === 'generic') continue;
    if (t.categoryKeywords.some((kw) => lower.includes(kw))) {
      return t;
    }
  }

  // Fallback to generic template
  return COMPONENT_SPEC_TEMPLATES.find((t) => t.id === 'generic') || COMPONENT_SPEC_TEMPLATES[0];
}

/**
 * Lấy toàn bộ thông tin mẫu thông số phù hợp theo danh mục sản phẩm
 */
export function getSpecTemplateForCategory(categoryName?: string): {
  mode: 'PC' | 'LAPTOP' | 'COMPONENT';
  productType: ProductType;
  template: ComponentTemplate | null;
  items: SpecItemData[];
  defaultSpecsJson: string;
} {
  const pType = detectProductTypeFromCategory(categoryName);

  if (pType === 'PC') {
    const items: SpecItemData[] = PC_STANDARD_PARTS.map((p) => ({
      key: p.key,
      name: '',
      warranty: p.defaultWarranty,
    }));
    return {
      mode: 'PC',
      productType: 'PC',
      template: null,
      items,
      defaultSpecsJson: JSON.stringify(items, null, 2),
    };
  }

  if (pType === 'LAPTOP') {
    const items: SpecItemData[] = LAPTOP_STANDARD_FIELDS.map((f) => ({
      key: f.key,
      name: f.defaultValue || '',
      warranty: '24 Tháng',
    }));
    return {
      mode: 'LAPTOP',
      productType: 'LAPTOP',
      template: null,
      items,
      defaultSpecsJson: JSON.stringify(items, null, 2),
    };
  }

  // COMPONENT
  const template = detectComponentTemplate(categoryName);
  const items: SpecItemData[] = template.fields.map((f) => ({
    key: f.key,
    name: f.defaultValue || '',
  }));
  return {
    mode: 'COMPONENT',
    productType: 'COMPONENT',
    template,
    items,
    defaultSpecsJson: JSON.stringify(items, null, 2),
  };
}

/**
 * Ghép nối thông số hiện tại với mẫu thông số mới của danh mục,
 * bảo toàn các giá trị mà người dùng đã nhập nếu trùng key
 */
export function mergeSpecsWithTemplate(currentSpecStr: string, templateItems: SpecItemData[]): string {
  if (!currentSpecStr || !currentSpecStr.trim() || currentSpecStr.trim() === '[]') {
    return JSON.stringify(templateItems, null, 2);
  }

  try {
    let existingItems: SpecItemData[] = [];
    const trimmed = currentSpecStr.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        existingItems = parsed;
      }
    }

    if (existingItems.length === 0) {
      return JSON.stringify(templateItems, null, 2);
    }

    // Map existing items by lowercase key
    const existingMap = new Map<string, SpecItemData>();
    for (const item of existingItems) {
      if (item.key) {
        existingMap.set(item.key.toLowerCase().trim(), item);
      }
    }

    // Build merged list starting with template fields
    const merged: SpecItemData[] = templateItems.map((tmpl) => {
      const found = existingMap.get(tmpl.key.toLowerCase().trim());
      if (found) {
        existingMap.delete(tmpl.key.toLowerCase().trim());
        return {
          ...tmpl,
          name: found.name || tmpl.name || '',
          warranty: found.warranty || tmpl.warranty,
          productId: found.productId,
          productCode: found.productCode,
          productPrice: found.productPrice,
        };
      }
      return tmpl;
    });

    // Append any extra custom items that were previously filled by user
    existingMap.forEach((val) => {
      if (val.name && val.name.trim() !== '') {
        merged.push(val);
      }
    });

    return JSON.stringify(merged, null, 2);
  } catch {
    return JSON.stringify(templateItems, null, 2);
  }
}

/**
 * Dọn dẹp các trường rỗng trước khi lưu vào Database backend
 */
export function cleanEmptySpecsForSaving(specStr?: string | null): string {
  if (!specStr || !specStr.trim()) return '';
  try {
    const parsed = JSON.parse(specStr.trim());
    if (Array.isArray(parsed)) {
      const valid = parsed.filter(
        (item: any) => (item.name && String(item.name).trim() !== '') || item.productId
      );
      return valid.length > 0 ? JSON.stringify(valid, null, 2) : '';
    }
    return specStr;
  } catch {
    return specStr;
  }
}
