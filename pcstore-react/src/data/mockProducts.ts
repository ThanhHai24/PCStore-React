import type { Product } from '../types/product';
import cleanPcImg from '../assets/images/products/clean_pc.png';
import pcJpg from '../assets/images/products/pc.jpg';
import rtxPng from '../assets/images/products/rtx.png';

export const mockProducts: Product[] = [
  {
    id: 'pc-miku-9800x3d',
    title: 'Bộ PC Hatsune Miku Ryzen 7 9800X3D, RAM 32GB, VGA RTX 5080 16GB',
    images: [cleanPcImg, pcJpg, rtxPng, cleanPcImg],
    thumbnails: [cleanPcImg, pcJpg, rtxPng, cleanPcImg],
    price: '136.000.000đ',
    numericPrice: 136000000,
    marketPrice: '145.000.000đ',
    installmentPrice: '11.666.533 / tháng',
    discountPercent: '-6%',
    badge: 'HOT',
    inStock: true,
    warrantyInfo: 'Bảo hành theo từng linh kiện',
    rating: 5.0,
    reviewCount: 12,
    viewCount: 20689,
    commentCount: 4,
    purchaseCount: 6,
    flashSale: {
      hours: 23,
      minutes: 33,
      seconds: 46,
    },
    category: 'pc-gaming',
    categoryName: 'PC GAMING',
    brand: 'ASUS / ROG',
    promotions: [
      'Quý khách có thể tùy chọn nâng cấp lên hoặc xuống cấu hình tương đương với: CPU, RAM, SSD theo nhu cầu.',
      'Miễn phí giao hàng toàn quốc.',
      'Tặng Voucher giảm giá 500.000đ cho lần mua tiếp theo.',
      'Tặng bàn di chuột Gaming Hatsune Miku Edition trị giá 690.000đ.'
    ],
    quickSpecs: {
      cpu: 'CPU AMD Ryzen 7 9800X3D TRAY NEW (Up to 5.2GHz | 8C / 16T | 96 MB Cache)',
      vga: 'Asus ROG Astral GeForce RTX 5080 16GB GDDR7 OC HATSUNE MIKU EDITION',
      ram: 'Gskill Trident Z5 RGB 32GB (2x16GB) DDR5 6000Mhz Black'
    },
    specsTable: [
      {
        key: 'CPU',
        name: 'CPU AMD Ryzen 7 9800X3D TRAY NEW (Up to 5.2GHz | 8C / 16T | 96 MB Cache)',
        warranty: '36TH'
      },
      {
        key: 'VGA',
        name: 'Asus ROG Astral GeForce RTX 5080 16GB GDDR7 OC HATSUNE MIKU EDITION',
        warranty: '36TH'
      },
      {
        key: 'RAM',
        name: 'Gskill Trident Z5 RGB 32GB (2x16GB) DDR5 6000Mhz Black',
        warranty: '60TH'
      },
      {
        key: 'SSD',
        name: 'NVMe 1TB Lexar NQ780 M.2 PCIe Gen4 x4 up to 6500MB/s read, 2500MB/s write',
        warranty: '60TH'
      },
      {
        key: 'MAIN',
        name: 'Mainboard ASUS ROG STRIX X870E-H GAMING WIFI 7 Hatsune Miku Edition',
        warranty: '36TH'
      },
      {
        key: 'PSU',
        name: 'Nguồn ASUS ROG Thor 1000W Platinum II ATX 3.0',
        warranty: '120TH'
      },
      {
        key: 'CASE',
        name: 'Vỏ máy tính ASUS ROG Hyperion GR701 Hatsune Miku Limited Edition',
        warranty: '24TH'
      }
    ],
    descriptionHtml: `
      <div class="space-y-4 text-gray-700 text-sm leading-relaxed">
        <h3 class="text-base font-bold text-gray-900">Đặc điểm nổi bật của Bộ PC Hatsune Miku Ryzen 7 9800X3D</h3>
        <p>Bộ PC Hatsune Miku Limited Edition sở hữu vẻ ngoài đậm chất e-sports và nghệ thuật Anime với sự hợp tác từ thương hiệu ASUS ROG. Toàn bộ thiết kế tông màu xanh ngọc bích miku cực kỳ độc đáo và sang trọng.</p>
        <p>Hiệu năng hủy diệt với CPU AMD Ryzen 7 9800X3D - vi xử lý gaming mạnh mẽ nhất thế giới hiện tại kết hợp cùng card đồ họa thế hệ mới ASUS ROG Astral RTX 5080 16GB GDDR7 giúp đáp ứng mượt mà mọi tựa game AAA ở độ phân giải 4K 144Hz+.</p>
      </div>
    `
  },
  {
    id: 'pc-intel-i7-14700f',
    title: 'Bộ PC Đồ Họa Intel Core i7-14700F, RAM 32GB, RTX 4060 Ti 8GB',
    images: [pcJpg, cleanPcImg, rtxPng],
    thumbnails: [pcJpg, cleanPcImg, rtxPng],
    price: '38.990.000đ',
    numericPrice: 38990000,
    marketPrice: '43.300.000đ',
    discountPercent: '-10%',
    badge: 'NEW',
    inStock: true,
    warrantyInfo: 'Bảo hành 36 tháng',
    rating: 5.0,
    reviewCount: 12,
    viewCount: 8400,
    commentCount: 4,
    purchaseCount: 18,
    promotions: [
      'Tặng gói bảo dưỡng miễn phí 2 năm.',
      'Giảm 10% khi mua kèm màn hình gaming.'
    ],
    specsTable: [
      { key: 'CPU', name: 'Intel Core i7-14700F (Up to 5.4GHz, 20 nhân 28 luồng)', warranty: '36TH' },
      { key: 'VGA', name: 'NVIDIA GeForce RTX 4060 Ti 8GB GDDR6', warranty: '36TH' },
      { key: 'RAM', name: '32GB DDR5 5600MHz', warranty: '36TH' },
      { key: 'SSD', name: '1TB NVMe PCIe Gen4', warranty: '36TH' }
    ],
    category: 'pc-do-hoa',
    categoryName: 'PC ĐỒ HỌA',
    brand: 'Intel'
  },
  {
    id: 'pc-intel-i5-14600k',
    title: 'Bộ PC Gaming Core i5-14600K, RAM 32GB, RTX 4070 Super 12GB',
    images: [rtxPng, cleanPcImg, pcJpg],
    thumbnails: [rtxPng, cleanPcImg, pcJpg],
    price: '46.900.000đ',
    numericPrice: 46900000,
    marketPrice: '49.900.000đ',
    discountPercent: '-6%',
    badge: 'HOT',
    inStock: true,
    warrantyInfo: 'Bảo hành 36 tháng',
    rating: 4.8,
    reviewCount: 8,
    viewCount: 12100,
    commentCount: 2,
    purchaseCount: 14,
    promotions: ['Giao hàng hỏa tốc trong 2h tại Hà Nội & TP.HCM.'],
    specsTable: [
      { key: 'CPU', name: 'Intel Core i5-14600K', warranty: '36TH' },
      { key: 'VGA', name: 'RTX 4070 Super 12GB', warranty: '36TH' },
      { key: 'RAM', name: '32GB DDR5 6000MHz', warranty: '36TH' }
    ],
    category: 'pc-gaming',
    categoryName: 'PC GAMING',
    brand: 'Intel'
  },
  {
    id: 'vga-asus-rtx-4080-super',
    title: 'Card màn hình ASUS ROG Strix GeForce RTX 4080 Super 16GB GDDR6X OC Edition',
    images: [rtxPng, cleanPcImg],
    thumbnails: [rtxPng, cleanPcImg],
    price: '33.990.000đ',
    numericPrice: 33990000,
    marketPrice: '36.500.000đ',
    discountPercent: '-7%',
    badge: 'HOT',
    inStock: true,
    warrantyInfo: 'Bảo hành 36 tháng chính hãng',
    rating: 5.0,
    reviewCount: 15,
    viewCount: 18900,
    commentCount: 6,
    purchaseCount: 22,
    category: 'vga',
    categoryName: 'VGA',
    brand: 'ASUS / ROG',
    promotions: ['Tặng giá đỡ VGA ROG cao cấp.'],
    specsTable: [
      { key: 'Chipset', name: 'NVIDIA GeForce RTX 4080 Super' },
      { key: 'Dung lượng VRAM', name: '16GB GDDR6X' },
      { key: 'Xung nhịp nhân (Boost)', name: '2670 MHz (OC Mode)' },
      { key: 'Số nhân CUDA', name: '10240 Cores' },
      { key: 'Băng thông Bus', name: '256-bit' },
      { key: 'Nguồn khuyến cáo', name: '850W' },
      { key: 'Cổng kết nối', name: '2x HDMI 2.1a, 3x DisplayPort 1.4a' }
    ]
  }
];

export const getProductById = (id?: string): Product => {
  if (!id) return mockProducts[0];
  const found = mockProducts.find(p => p.id === id);
  return found || mockProducts[0];
};
