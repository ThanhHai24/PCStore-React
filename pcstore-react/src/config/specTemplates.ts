import type { ProductType } from '../types/adminProduct';

export interface SpecItemData {
  key: string;
  name: string;
  warranty?: string;
  productId?: string;
  productCode?: string;
  productPrice?: number;
  productImage?: string;
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
    categoryKeywords: ['vga', 'card màn hình', 'card đồ họa', 'graphics card', 'gpu'],
    fields: [
      {
        key: 'Nhà sản xuất chip (GPU Vendor)',
        label: 'Nhà sản xuất chip (GPU Vendor)',
        type: 'select',
        options: [
          'NVIDIA',
          'AMD',
          'Intel'
        ],
      },
      {
        key: 'Dòng GPU (GPU Series)',
        label: 'Dòng GPU (GPU Series)',
        type: 'select',
        options: [
          'GeForce RTX 50 Series',
          'GeForce RTX 40 Series',
          'GeForce RTX 30 Series',
          'GeForce GTX 16 Series',
          'Radeon RX 8000 Series',
          'Radeon RX 7000 Series',
          'Radeon RX 6000 Series',
          'Intel Arc A-Series'
        ],
      },
      {
        key: 'Mã GPU (GPU Model)',
        label: 'Mã GPU (GPU Model)',
        type: 'text',
        placeholder: 'Ví dụ: RTX 5070, RTX 4060, RX 7900 XTX...',
      },
      {
        key: 'Dung lượng VRAM',
        label: 'Dung lượng VRAM',
        type: 'select',
        options: [
          '4GB',
          '6GB',
          '8GB',
          '10GB',
          '12GB',
          '16GB',
          '20GB',
          '24GB'
        ],
      },
      {
        key: 'Loại bộ nhớ (Memory Type)',
        label: 'Loại bộ nhớ (Memory Type)',
        type: 'select',
        options: [
          'GDDR7',
          'GDDR6X',
          'GDDR6',
          'GDDR5'
        ],
      },
      {
        key: 'Bus bộ nhớ (Memory Interface)',
        label: 'Bus bộ nhớ (Memory Interface)',
        type: 'select',
        options: [
          '64-bit',
          '96-bit',
          '128-bit',
          '192-bit',
          '256-bit',
          '320-bit',
          '384-bit'
        ],
      },
      {
        key: 'Số nhân đồ họa (CUDA / Stream Processors)',
        label: 'Số nhân đồ họa (CUDA / Stream Processors)',
        type: 'text',
        placeholder: 'Ví dụ: 6144 CUDA Cores (RTX 5070), 3072 CUDA Cores...',
      },
      {
        key: 'Xung nhịp cơ bản (Base Clock)',
        label: 'Xung nhịp cơ bản (Base Clock)',
        type: 'text',
        placeholder: 'Ví dụ: 2325 MHz',
      },
      {
        key: 'Xung nhịp tối đa (Boost Clock)',
        label: 'Xung nhịp tối đa (Boost Clock)',
        type: 'text',
        placeholder: 'Ví dụ: 2512 MHz (có thể OC lên 2557 MHz)',
      },
      {
        key: 'Chuẩn giao tiếp (Interface)',
        label: 'Chuẩn giao tiếp (Interface)',
        type: 'select',
        options: [
          'PCIe 5.0 x16',
          'PCIe 4.0 x16',
          'PCIe 4.0 x8',
          'PCIe 3.0 x16'
        ],
      },
      {
        key: 'Cổng xuất hình (Video Outputs)',
        label: 'Cổng xuất hình (Video Outputs)',
        type: 'text',
        placeholder: 'Ví dụ: 3x DisplayPort 2.1, 1x HDMI 2.1a',
      },
      {
        key: 'Cổng nguồn phụ (Power Connectors)',
        label: 'Cổng nguồn phụ (Power Connectors)',
        type: 'select',
        options: [
          'Không cần nguồn phụ',
          '1x 8-pin',
          '2x 8-pin',
          '3x 8-pin',
          '1x 12VHPWR (16-pin)',
          '1x 12V-2x6',
          '1x 6-pin'
        ],
      },
      {
        key: 'Công suất tiêu thụ (TGP/TBP)',
        label: 'Công suất tiêu thụ (TGP/TBP)',
        type: 'text',
        placeholder: 'Ví dụ: 250W, 115W...',
      },
      {
        key: 'Nguồn đề xuất (Recommended PSU)',
        label: 'Nguồn đề xuất (Recommended PSU)',
        type: 'select',
        options: [
          '400W',
          '450W',
          '500W',
          '550W',
          '600W',
          '650W',
          '750W',
          '850W',
          '1000W',
          '1200W',
          '1600W'
        ],
      },
      {
        key: 'Số quạt tản nhiệt (Cooling Design)',
        label: 'Số quạt tản nhiệt (Cooling Design)',
        type: 'select',
        options: [
          '1 Quạt (ITX)',
          '2 Quạt',
          '3 Quạt',
          'Tản nhiệt nước (AIO)',
          'Tản nhiệt thụ động (Fanless)'
        ],
      },
      {
        key: 'Kích thước (Dimensions - L x W x H)',
        label: 'Kích thước (Dimensions - L x W x H)',
        type: 'text',
        placeholder: 'Ví dụ: 325 x 140 x 60 mm',
      },
      {
        key: 'Số khe cắm chiếm dụng (Slot Width)',
        label: 'Số khe cắm chiếm dụng (Slot Width)',
        type: 'select',
        options: [
          '1 Slot',
          '2 Slot',
          '2.5 Slot',
          '3 Slot',
          '3.5 Slot',
          '4 Slot'
        ],
      }
    ]
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
    categoryKeywords: ['mainboard', 'bo mạch chủ', 'motherboard', 'main'],
    fields: [
      {
        key: 'Kích thước (Form Factor)',
        label: 'Kích thước (Form Factor)',
        type: 'select',
        options: [
          'E-ATX (Mở rộng)',
          'ATX (Tiêu chuẩn)',
          'Micro-ATX (mATX)',
          'Mini-ITX (ITX)'
        ],
      },
      {
        key: 'Socket hỗ trợ',
        label: 'Socket hỗ trợ',
        type: 'select',
        options: [
          'LGA 1700 (Intel Gen 12/13/14)',
          'LGA 1851 (Intel Core Ultra Series 2)',
          'LGA 1200 (Intel Gen 10/11)',
          'AM5 (AMD Ryzen 7000/8000/9000)',
          'AM4 (AMD Ryzen 1000 - 5000)'
        ],
      },
      {
        key: 'Chipset',
        label: 'Chipset',
        type: 'select',
        options: [
          'Intel Z890',
          'Intel B860',
          'Intel Z790',
          'Intel B760',
          'Intel H610',
          'Intel Z690',
          'AMD X870E / X870',
          'AMD B850',
          'AMD X670E / X670',
          'AMD B650E / B650',
          'AMD A620'
        ],
      },
      {
        key: 'Chuẩn RAM hỗ trợ',
        label: 'Chuẩn RAM hỗ trợ',
        type: 'select',
        options: [
          'DDR5',
          'DDR4'
        ],
      },
      {
        key: 'Số khe cắm RAM',
        label: 'Số khe cắm RAM',
        type: 'select',
        options: [
          '2 Khe',
          '4 Khe',
          '8 Khe (Workstation)'
        ],
      },
      {
        key: 'Dung lượng RAM tối đa',
        label: 'Dung lượng RAM tối đa',
        type: 'select',
        options: [
          '64GB',
          '96GB',
          '128GB',
          '192GB',
          '256GB'
        ],
      },
      {
        key: 'Tốc độ RAM hỗ trợ tối đa',
        label: 'Tốc độ RAM hỗ trợ tối đa',
        type: 'text',
        placeholder: 'Ví dụ: DDR5 7200+ MT/s (OC), DDR4 3200 MT/s',
      },
      {
        key: 'Khe cắm PCIe x16 (Dành cho VGA)',
        label: 'Khe cắm PCIe x16 (Dành cho VGA)',
        type: 'select',
        options: [
          '1x PCIe 5.0 x16',
          '1x PCIe 4.0 x16',
          '2x PCIe 5.0 x16',
          '2x PCIe 4.0 x16',
          '1x PCIe 3.0 x16'
        ],
      },
      {
        key: 'Số cổng lưu trữ M.2 NVMe',
        label: 'Số cổng lưu trữ M.2 NVMe',
        type: 'select',
        options: [
          '1 Cổng',
          '2 Cổng',
          '3 Cổng',
          '4 Cổng',
          '5 Cổng'
        ],
      },
      {
        key: 'Chuẩn M.2 tốc độ cao nhất hỗ trợ',
        label: 'Chuẩn M.2 tốc độ cao nhất hỗ trợ',
        type: 'select',
        options: [
          'PCIe 5.0 x4',
          'PCIe 4.0 x4',
          'PCIe 3.0 x4'
        ],
      },
      {
        key: 'Số cổng SATA 3 (Lưu trữ 2.5"/3.5")',
        label: 'Số cổng SATA 3 (Lưu trữ 2.5"/3.5")',
        type: 'select',
        options: [
          '2 Cổng',
          '4 Cổng',
          '6 Cổng',
          '8 Cổng'
        ],
      },
      {
        key: 'Kết nối mạng LAN (Ethernet)',
        label: 'Kết nối mạng LAN (Ethernet)',
        type: 'select',
        options: [
          '1 Gbps (10/100/1000 Mbps)',
          '2.5 Gbps',
          '5 Gbps',
          '10 Gbps'
        ],
      },
      {
        key: 'Kết nối không dây (Wi-Fi / Bluetooth)',
        label: 'Kết nối không dây (Wi-Fi / Bluetooth)',
        type: 'select',
        options: [
          'Không có',
          'Wi-Fi 5 + Bluetooth',
          'Wi-Fi 6 + Bluetooth 5.2',
          'Wi-Fi 6E + Bluetooth 5.3',
          'Wi-Fi 7 + Bluetooth 5.4'
        ],
      },
      {
        key: 'Cổng xuất hình onboard (Cần CPU có iGPU)',
        label: 'Cổng xuất hình onboard (Cần CPU có iGPU)',
        type: 'text',
        placeholder: 'Ví dụ: 1x HDMI 2.1, 1x DisplayPort 1.4',
      },
      {
        key: 'Chân cắm cấp nguồn CPU',
        label: 'Chân cắm cấp nguồn CPU',
        type: 'select',
        options: [
          '1x 8-pin',
          '8-pin + 4-pin',
          '2x 8-pin'
        ],
      },
      {
        key: 'Chân cắm ARGB/RGB (Header)',
        label: 'Chân cắm ARGB/RGB (Header)',
        type: 'text',
        placeholder: 'Ví dụ: 3x Addressable Gen 2 (5V), 1x Aura RGB (12V)',
      }
    ]
  },
  {
    id: 'ram',
    name: 'RAM / Bộ nhớ trong',
    categoryKeywords: ['ram', 'bộ nhớ trong', 'memory', 'ddr4', 'ddr5'],
    fields: [
      {
        key: 'Loại RAM (Form Factor)',
        label: 'Loại RAM (Form Factor)',
        type: 'select',
        options: [
          'U-DIMM (Desktop PC)',
          'SO-DIMM (Laptop / Mini PC)',
          'R-DIMM (Server / Workstation)'
        ],
      },
      {
        key: 'Chuẩn RAM (Memory Type)',
        label: 'Chuẩn RAM (Memory Type)',
        type: 'select',
        options: [
          'DDR5',
          'DDR4',
          'DDR3'
        ],
      },
      {
        key: 'Tổng dung lượng (Total Capacity)',
        label: 'Tổng dung lượng (Total Capacity)',
        type: 'select',
        options: [
          '8GB',
          '16GB',
          '24GB',
          '32GB',
          '48GB',
          '64GB',
          '96GB',
          '128GB'
        ],
      },
      {
        key: 'Quy cách đóng gói (Kit / Single)',
        label: 'Quy cách đóng gói (Kit / Single)',
        type: 'select',
        options: [
          '1 x 8GB (Single)',
          '2 x 8GB (Kit 16GB)',
          '1 x 16GB (Single)',
          '2 x 16GB (Kit 32GB)',
          '2 x 24GB (Kit 48GB)',
          '1 x 32GB (Single)',
          '2 x 32GB (Kit 64GB)',
          '4 x 16GB (Kit 64GB)',
          '2 x 48GB (Kit 96GB)',
          '4 x 32GB (Kit 128GB)'
        ],
      },
      {
        key: 'Tốc độ Bus (Memory Speed)',
        label: 'Tốc độ Bus (Memory Speed)',
        type: 'select',
        options: [
          '3200 MT/s',
          '3600 MT/s',
          '4800 MT/s',
          '5200 MT/s',
          '5600 MT/s',
          '6000 MT/s',
          '6400 MT/s',
          '7200 MT/s',
          '8000 MT/s'
        ],
        placeholder: 'Ví dụ: 6000 MT/s (hoặc MHz)',
      },
      {
        key: 'Độ trễ (CAS Latency)',
        label: 'Độ trễ (CAS Latency)',
        type: 'text',
        placeholder: 'Ví dụ: CL30, CL32, CL36, CL16 (Điền cụ thể như CL30-38-38-96)',
      },
      {
        key: 'Điện áp (Voltage)',
        label: 'Điện áp (Voltage)',
        type: 'select',
        options: [
          '1.1V (Mặc định JEDEC DDR5)',
          '1.2V (Mặc định JEDEC DDR4 / DDR5)',
          '1.35V',
          '1.4V',
          '1.45V'
        ],
      },
      {
        key: 'Hỗ trợ ép xung (Overclocking Profile)',
        label: 'Hỗ trợ ép xung (Overclocking Profile)',
        type: 'select',
        options: [
          'Intel XMP 3.0',
          'AMD EXPO',
          'Cả XMP 3.0 và EXPO',
          'Intel XMP 2.0 (DDR4)',
          'Không hỗ trợ (Plug and Play JEDEC)'
        ],
      },
      {
        key: 'Tản nhiệt (Heatsink)',
        label: 'Tản nhiệt (Heatsink)',
        type: 'select',
        options: [
          'Có tản nhiệt (Nhôm)',
          'Không có tản nhiệt (RAM bo lùn/trần)'
        ],
      },
      {
        key: 'Hỗ trợ LED',
        label: 'Hỗ trợ LED',
        type: 'select',
        options: [
          'Không có LED',
          'LED RGB',
          'LED ARGB (Đồng bộ Mainboard)'
        ],
      },
      {
        key: 'Chiều cao thanh RAM (Height Clearance)',
        label: 'Chiều cao thanh RAM (Height Clearance)',
        type: 'text',
        placeholder: 'Ví dụ: 44mm (Quan trọng khi dùng tản nhiệt khí Tháp đôi)',
      }
    ]
  },
  {
    id: 'ssd',
    name: 'Ổ cứng SSD',
    categoryKeywords: ['ssd', 'ổ cứng', 'ổ cứng ssd', 'nvme', 'lưu trữ', 'storage'],
    fields: [
      {
        key: 'Dung lượng (Capacity)',
        label: 'Dung lượng (Capacity)',
        type: 'select',
        options: [
          '250GB - 256GB',
          '500GB - 512GB',
          '1TB',
          '2TB',
          '4TB',
          '8TB'
        ],
      },
      {
        key: 'Kích thước / Chuẩn cắm (Form Factor)',
        label: 'Kích thước / Chuẩn cắm (Form Factor)',
        type: 'select',
        options: [
          'M.2 2280 (Phổ biến nhất)',
          'M.2 2230 (Cho Handheld/Mini PC)',
          'M.2 2242',
          '2.5 inch (SATA)',
          'PCIe Add-in Card'
        ],
      },
      {
        key: 'Chuẩn giao tiếp (Interface)',
        label: 'Chuẩn giao tiếp (Interface)',
        type: 'select',
        options: [
          'NVMe PCIe Gen 5.0 x4',
          'NVMe PCIe Gen 4.0 x4',
          'NVMe PCIe Gen 3.0 x4',
          'SATA III (6Gb/s)'
        ],
      },
      {
        key: 'Tốc độ đọc tuần tự (Sequential Read)',
        label: 'Tốc độ đọc tuần tự (Sequential Read)',
        type: 'text',
        placeholder: 'Ví dụ: 7450 MB/s, 3500 MB/s, 560 MB/s...',
      },
      {
        key: 'Tốc độ ghi tuần tự (Sequential Write)',
        label: 'Tốc độ ghi tuần tự (Sequential Write)',
        type: 'text',
        placeholder: 'Ví dụ: 6900 MB/s, 3000 MB/s, 530 MB/s...',
      },
      {
        key: 'Loại chip nhớ (NAND Flash Type)',
        label: 'Loại chip nhớ (NAND Flash Type)',
        type: 'select',
        options: [
          '3D TLC (Hiệu năng/Độ bền tốt - Phổ biến)',
          '3D QLC (Dung lượng cao/Giá rẻ)',
          '3D MLC (Độ bền cực cao/Cao cấp)'
        ],
      },
      {
        key: 'Bộ nhớ đệm (Cache)',
        label: 'Bộ nhớ đệm (Cache)',
        type: 'select',
        options: [
          'Có DRAM Cache (Độc lập)',
          'HMB (Không DRAM - Dùng RAM hệ thống)',
          'Không có'
        ],
      },
      {
        key: 'Tản nhiệt đi kèm (Heatsink)',
        label: 'Tản nhiệt đi kèm (Heatsink)',
        type: 'select',
        options: [
          'Không có tản nhiệt (Bo mạch trần)',
          'Có tản nhiệt nhôm (Dày)',
          'Có tản nhiệt nhôm (Mỏng / Graphene)'
        ],
      },
      {
        key: 'Độ bền (TBW - Terabytes Written)',
        label: 'Độ bền (TBW - Terabytes Written)',
        type: 'text',
        placeholder: 'Ví dụ: 600 TBW, 1200 TBW (Tuổi thọ ghi dữ liệu)',
      }
    ]
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
    name: 'Nguồn máy tính / PSU',
    categoryKeywords: ['psu', 'nguồn', 'nguồn máy tính', 'power supply', 'nguồn pc'],
    fields: [
      {
        key: 'Công suất tối đa (Wattage)',
        label: 'Công suất tối đa (Wattage)',
        type: 'select',
        options: [
          '400W',
          '450W',
          '500W',
          '550W',
          '600W',
          '650W',
          '750W',
          '850W',
          '1000W',
          '1200W',
          '1300W',
          '1600W'
        ],
      },
      {
        key: 'Kích thước / Chuẩn nguồn (Form Factor)',
        label: 'Kích thước / Chuẩn nguồn (Form Factor)',
        type: 'select',
        options: [
          'ATX (Phổ biến nhất cho case Mid/Full Tower)',
          'SFX (Dành cho case Mini-ITX)',
          'SFX-L (Mini-ITX nhưng dài hơn)',
          'TFX (Dành cho case Slim/SFF)'
        ],
      },
      {
        key: 'Chứng nhận hiệu suất (80 PLUS)',
        label: 'Chứng nhận hiệu suất (80 PLUS)',
        type: 'select',
        options: [
          '80 PLUS Titanium (Cao cấp nhất)',
          '80 PLUS Platinum',
          '80 PLUS Gold',
          '80 PLUS Silver',
          '80 PLUS Bronze',
          '80 PLUS White / Standard',
          'Không có chứng nhận'
        ],
      },
      {
        key: 'Thiết kế cáp (Modularity)',
        label: 'Thiết kế cáp (Modularity)',
        type: 'select',
        options: [
          'Full-Modular (Tháo rời 100% cáp - Dễ đi dây)',
          'Semi-Modular (Tháo rời cáp phụ, cáp main liền)',
          'Non-Modular (Cáp liền toàn bộ)'
        ],
      },
      {
        key: 'Chuẩn nguồn ATX',
        label: 'Chuẩn nguồn ATX',
        type: 'select',
        options: [
          'ATX 3.1 (Mới nhất - Đầu cắm 12V-2x6)',
          'ATX 3.0 (Đầu cắm 12VHPWR cho PCIe 5.0)',
          'ATX 2.52 / ATX 2.4 (Chuẩn cũ)',
          'ATX 2.31'
        ],
      },
      {
        key: 'Đầu cấp nguồn PCIe 5.0 (16-pin GPU)',
        label: 'Đầu cấp nguồn PCIe 5.0 (16-pin GPU)',
        type: 'select',
        options: [
          'Có (1x 600W 12V-2x6 / 12VHPWR)',
          'Có (1x 450W 12V-2x6 / 12VHPWR)',
          'Có (2x 600W 12V-2x6 / 12VHPWR)',
          'Không có'
        ],
      },
      {
        key: 'Đầu cấp nguồn CPU (EPS/ATX12V 8-pin)',
        label: 'Đầu cấp nguồn CPU (EPS/ATX12V 8-pin)',
        type: 'select',
        options: [
          '1x 8-pin (4+4)',
          '2x 8-pin (4+4)'
        ],
      },
      {
        key: 'Đầu cấp nguồn VGA (PCIe 8-pin / 6+2-pin)',
        label: 'Đầu cấp nguồn VGA (PCIe 8-pin / 6+2-pin)',
        type: 'select',
        options: [
          '1 Cổng (6+2-pin)',
          '2 Cổng (6+2-pin)',
          '3 Cổng (6+2-pin)',
          '4 Cổng (6+2-pin)',
          '6 Cổng (6+2-pin)'
        ],
      },
      {
        key: 'Đầu cấp nguồn SATA (Cho SSD/HDD 2.5/3.5)',
        label: 'Đầu cấp nguồn SATA (Cho SSD/HDD 2.5/3.5)',
        type: 'text',
        placeholder: 'Ví dụ: 4 cổng, 6 cổng, 8 cổng...',
      },
      {
        key: 'Đầu cấp nguồn Molex (4-pin cho quạt cũ/phụ kiện)',
        label: 'Đầu cấp nguồn Molex (4-pin cho quạt cũ/phụ kiện)',
        type: 'text',
        placeholder: 'Ví dụ: 2 cổng, 4 cổng...',
      },
      {
        key: 'Điện áp đầu vào (Input Voltage)',
        label: 'Điện áp đầu vào (Input Voltage)',
        type: 'select',
        options: [
          '100 - 240V (Auto Volt - Dải rộng)',
          '200 - 240V (Dải hẹp)'
        ],
      },
      {
        key: 'Quạt làm mát',
        label: 'Quạt làm mát',
        type: 'select',
        options: [
          '120mm',
          '135mm',
          '140mm',
          'Zero RPM Mode (Quạt dừng khi tải nhẹ)'
        ],
      },
      {
        key: 'Kích thước nguồn (L x W x H)',
        label: 'Kích thước nguồn (L x W x H)',
        type: 'text',
        placeholder: 'Ví dụ: 150 x 140 x 86 mm (Dài 140mm)',
      }
    ]
  },
  {
    id: 'case',
    name: 'Vỏ máy tính / Case',
    categoryKeywords: ['case', 'vỏ máy tính', 'vỏ case', 'chassis', 'thùng máy'],
    fields: [
      {
        key: 'Loại Case (Form Factor)',
        label: 'Loại Case (Form Factor)',
        type: 'select',
        options: [
          'Full Tower (Cỡ lớn)',
          'Mid Tower (Tiêu chuẩn - Phổ biến nhất)',
          'Mini Tower (Cỡ nhỏ)',
          'SFF / Mini-ITX (Siêu nhỏ)',
          'Dual Chamber (Bể cá / Hai buồng)'
        ],
      },
      {
        key: 'Mainboard hỗ trợ',
        label: 'Mainboard hỗ trợ',
        type: 'select',
        options: [
          'E-ATX, ATX, Micro-ATX, Mini-ITX',
          'ATX, Micro-ATX, Mini-ITX',
          'Micro-ATX, Mini-ITX',
          'Chỉ Mini-ITX',
          'Hỗ trợ Mainboard giấu dây (Back-connect)'
        ],
      },
      {
        key: 'Màu sắc (Color)',
        label: 'Màu sắc (Color)',
        type: 'select',
        options: [
          'Đen (Black)',
          'Trắng (White)',
          'Hồng (Pink)',
          'Bạc / Xám (Silver/Grey)'
        ],
      },
      {
        key: 'Chất liệu mặt hông / Mặt trước',
        label: 'Chất liệu mặt hông / Mặt trước',
        type: 'select',
        options: [
          'Mặt trước Lưới (Mesh) / Hông Kính cường lực',
          'Mặt trước Kính / Hông Kính cường lực (Bể cá)',
          'Thép nguyên khối / Nhôm',
          'Kính cường lực toàn cảnh (Curved Glass)'
        ],
      },
      {
        key: 'Chiều dài VGA tối đa (Max GPU Clearance)',
        label: 'Chiều dài VGA tối đa (Max GPU Clearance)',
        type: 'text',
        placeholder: 'Ví dụ: 400mm, 340mm (Cực kỳ quan trọng để bắt lỗi VGA)',
      },
      {
        key: 'Chiều cao tản nhiệt CPU tối đa (Max CPU Cooler Clearance)',
        label: 'Chiều cao tản nhiệt CPU tối đa (Max CPU Cooler Clearance)',
        type: 'text',
        placeholder: 'Ví dụ: 165mm, 170mm (Quan trọng khi dùng Tản khí)',
      },
      {
        key: 'Chiều dài Nguồn tối đa (Max PSU Clearance)',
        label: 'Chiều dài Nguồn tối đa (Max PSU Clearance)',
        type: 'text',
        placeholder: 'Ví dụ: 180mm, 200mm, 220mm (Quan trọng khi chọn PSU lớn)',
      },
      {
        key: 'Hỗ trợ Tản nhiệt nước (Radiator Support) - Nóc (Top)',
        label: 'Hỗ trợ Tản nhiệt nước (Radiator Support) - Nóc (Top)',
        type: 'select',
        options: [
          'Hỗ trợ Rad 360mm / 280mm',
          'Hỗ trợ Rad 240mm / 280mm',
          'Hỗ trợ Rad 420mm',
          'Không hỗ trợ'
        ],
      },
      {
        key: 'Hỗ trợ Tản nhiệt nước (Radiator Support) - Mặt trước (Front)',
        label: 'Hỗ trợ Tản nhiệt nước (Radiator Support) - Mặt trước (Front)',
        type: 'select',
        options: [
          'Hỗ trợ Rad 360mm / 280mm',
          'Hỗ trợ Rad 420mm',
          'Hỗ trợ Rad 240mm',
          'Không hỗ trợ (Ví dụ: Các dòng case bể cá)'
        ],
      },
      {
        key: 'Số lượng quạt gắn sẵn (Pre-installed Fans)',
        label: 'Số lượng quạt gắn sẵn (Pre-installed Fans)',
        type: 'select',
        options: [
          'Không có quạt',
          '1 Quạt (Không LED)',
          '3 Quạt (ARGB)',
          '4 Quạt (ARGB - 3 Trước, 1 Sau)',
          '4 Quạt (ARGB - 3 Đáy/Hông, 1 Sau - Bể cá)',
          '6 Quạt (ARGB)'
        ],
      },
      {
        key: 'Hỗ trợ khay ổ cứng (Drive Bays)',
        label: 'Hỗ trợ khay ổ cứng (Drive Bays)',
        type: 'text',
        placeholder: 'Ví dụ: 2x 3.5" HDD, 2x 2.5" SSD',
      },
      {
        key: 'Cổng kết nối mặt trước (Front I/O)',
        label: 'Cổng kết nối mặt trước (Front I/O)',
        type: 'text',
        placeholder: 'Ví dụ: 1x Type-C, 2x USB 3.0, 1x Audio Jack',
      },
      {
        key: 'Hỗ trợ dựng dọc VGA (Vertical GPU Mount)',
        label: 'Hỗ trợ dựng dọc VGA (Vertical GPU Mount)',
        type: 'select',
        options: [
          'Có (Cần mua thêm Riser Cable)',
          'Có (Kèm sẵn Riser Cable)',
          'Không hỗ trợ'
        ],
      },
      {
        key: 'Kích thước Case (L x W x H)',
        label: 'Kích thước Case (L x W x H)',
        type: 'text',
        placeholder: 'Ví dụ: 460 x 210 x 485 mm',
      }
    ]
  },
  {
    id: 'cooler',
    name: 'Tản nhiệt CPU',
    categoryKeywords: ['tản nhiệt', 'tản nhiệt cpu', 'cooler', 'tản nhiệt nước', 'aio', 'tản nhiệt khí'],
    fields: [
      {
        key: 'Loại tản nhiệt (Cooler Type)',
        label: 'Loại tản nhiệt (Cooler Type)',
        type: 'select',
        options: [
          'Tản nhiệt khí - Tháp đơn (Single Tower)',
          'Tản nhiệt khí - Tháp đôi (Dual Tower)',
          'Tản nhiệt khí - Top-down (Khí thổi xuống)',
          'Tản nhiệt nước AIO 120mm',
          'Tản nhiệt nước AIO 240mm',
          'Tản nhiệt nước AIO 280mm',
          'Tản nhiệt nước AIO 360mm',
          'Tản nhiệt nước AIO 420mm'
        ],
      },
      {
        key: 'Socket hỗ trợ (Socket Compatibility)',
        label: 'Socket hỗ trợ (Socket Compatibility)',
        type: 'select',
        options: [
          'Intel 1700/1851/1200/115x & AMD AM4/AM5',
          'Chỉ Intel (1700/1851/1200/115x)',
          'Chỉ AMD (AM4/AM5)',
          'Intel 1700 & AMD AM5 (Chỉ hỗ trợ socket mới)',
          'Hỗ trợ thêm TR4/sTR5 (Cho chip HEDT/Threadripper)'
        ],
      },
      {
        key: 'Màu sắc (Color)',
        label: 'Màu sắc (Color)',
        type: 'select',
        options: [
          'Đen (Black)',
          'Trắng (White)',
          'Bạc (Silver)'
        ],
      },
      {
        key: 'Chiều cao tản nhiệt (Dành cho Tản khí)',
        label: 'Chiều cao tản nhiệt (Dành cho Tản khí)',
        type: 'text',
        placeholder: 'Ví dụ: 154mm, 165mm (Cực kỳ quan trọng để check cấn Case)',
      },
      {
        key: 'Kích thước Radiator (Dành cho Tản AIO)',
        label: 'Kích thước Radiator (L x W x H)',
        type: 'text',
        placeholder: 'Ví dụ: 397 x 120 x 27 mm (Bề dày 27mm là chuẩn phổ thông)',
      },
      {
        key: 'Thiết kế Block/Pump (Dành cho Tản AIO)',
        label: 'Thiết kế Block/Pump',
        type: 'text',
        placeholder: 'Ví dụ: Pump hình tròn (như Jonsbo TH-360), Vuông, Vô cực...',
      },
      {
        key: 'Kích thước quạt (Fan Size)',
        label: 'Kích thước quạt (Fan Size)',
        type: 'select',
        options: [
          '120mm (120 x 120 x 25mm)',
          '140mm (140 x 140 x 25mm)',
          '92mm / 100mm (Cho tản mini)'
        ],
      },
      {
        key: 'Số lượng quạt đi kèm',
        label: 'Số lượng quạt đi kèm',
        type: 'select',
        options: [
          '1 Quạt',
          '2 Quạt',
          '3 Quạt'
        ],
      },
      {
        key: 'Tốc độ quạt (Fan Speed)',
        label: 'Tốc độ quạt (Fan Speed)',
        type: 'text',
        placeholder: 'Ví dụ: 500 - 2200 RPM',
      },
      {
        key: 'Lưu lượng gió tối đa (Airflow)',
        label: 'Lưu lượng gió tối đa (Airflow)',
        type: 'text',
        placeholder: 'Ví dụ: 85.85 CFM',
      },
      {
        key: 'Led / Hiển thị (Lighting & Display)',
        label: 'Led / Hiển thị (Lighting & Display)',
        type: 'select',
        options: [
          'Không LED',
          'LED RGB (Auto)',
          'LED ARGB (Đồng bộ Mainboard 5V 3-pin)',
          'Có màn hình LCD hiển thị nhiệt độ',
          'Gương vô cực (Infinity Mirror)'
        ],
      },
      {
        key: 'Khoảng không RAM (RAM Clearance - Cho Tản Khí)',
        label: 'Khoảng không RAM (RAM Clearance)',
        type: 'text',
        placeholder: 'Ví dụ: Hỗ trợ RAM cao tối đa 42mm (tránh cấn RAM)',
      },
      {
        key: 'TDP Hỗ trợ tối đa (Cooling Power)',
        label: 'TDP Hỗ trợ tối đa (Cooling Power)',
        type: 'text',
        placeholder: 'Ví dụ: 250W, 300W (Nên >= TDP Turbo của CPU)',
      }
    ]
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
