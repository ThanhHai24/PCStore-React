import pcImg from "../assets/images/products/pc.jpg";
import rtxImg from "../assets/images/products/rtx.png";
import cleanPcImg from "../assets/images/products/clean_pc.png";

export interface ProductSpecs {
  // General / Power
  tdp?: number; // Watts

  // CPU
  socket?: string; // e.g. "LGA 1700", "AM4", "AM5"

  // Mainboard
  ramType?: "DDR4" | "DDR5";
  ramSlots?: number;
  formFactor?: "E-ATX" | "ATX" | "Micro-ATX" | "Mini-ITX";

  // RAM
  sticksCount?: number; // Physical sticks count per package (e.g. 2 for 2x8GB)

  // VGA
  vgaLength?: number; // mm
  recommendedPsu?: number; // Watts

  // Cooler
  coolerType?: "AIR" | "AIO";
  coolerHeight?: number; // mm (for Air Cooler)
  radiatorSize?: number; // mm (for AIO, e.g. 120, 240, 280, 360)

  // Case
  maxGpuLength?: number; // mm
  maxCpuHeight?: number; // mm
  supportedForms?: Array<"E-ATX" | "ATX" | "Micro-ATX" | "Mini-ITX">;
  radiatorSupport?: number[]; // e.g. [120, 240, 280, 360]

  // PSU
  wattage?: number; // Watts
}

export interface BuilderProduct {
  id: string;
  slotIndex: number; // 1: CPU, 2: Main, 3: RAM, 4: VGA, 5: SSD, 6: HDD, 7: PSU, 8: Cooler, 9: Case, 10: Fan
  title: string;
  price: number;
  marketPrice?: number;
  discountPercent?: string;
  warranty: string;
  stockStatus: string;
  stockQuantity?: number;
  productCode: string;
  image: string;
  saleFrame?: string;
  specs?: ProductSpecs;
}

export const BUILDER_PRODUCTS: BuilderProduct[] = [
  // Slot 1: CPU
  {
    id: "cpu-1",
    slotIndex: 1,
    title: "CPU AMD Ryzen 5 5600X 3.7 GHz (4.6 GHz Turbo) / 36MB / 6 cores 12 threads / Socket AM4",
    price: 3690000,
    marketPrice: 4800000,
    discountPercent: "-23%",
    warranty: "36 tháng",
    stockStatus: "Còn hàng",
    productCode: "CPU000560X",
    image: pcImg,
    specs: { socket: "AM4", tdp: 65 },
  },
  {
    id: "cpu-2",
    slotIndex: 1,
    title: "CPU Intel Core i5 13400F / 2.5GHz Turbo 4.6GHz / 10 Nhân 16 Luồng / 20MB / LGA 1700",
    price: 4890000,
    marketPrice: 5990000,
    discountPercent: "-18%",
    warranty: "36 tháng",
    stockStatus: "Còn hàng",
    productCode: "CPU013400F",
    image: pcImg,
    specs: { socket: "LGA 1700", tdp: 65 },
  },
  {
    id: "cpu-3",
    slotIndex: 1,
    title: "CPU Intel Core i7 13700K / 3.4GHz Turbo 5.4GHz / 16 Nhân 24 Luồng / 30MB / LGA 1700",
    price: 9990000,
    marketPrice: 11990000,
    discountPercent: "-17%",
    warranty: "36 tháng",
    stockStatus: "Còn hàng",
    productCode: "CPU013700K",
    image: pcImg,
    specs: { socket: "LGA 1700", tdp: 125 },
  },
  {
    id: "cpu-4",
    slotIndex: 1,
    title: "CPU AMD Ryzen 7 7700X / 4.5GHz Turbo 5.4GHz / 8 Nhân 16 Luồng / Socket AM5",
    price: 7990000,
    marketPrice: 9200000,
    discountPercent: "-13%",
    warranty: "36 tháng",
    stockStatus: "Còn hàng",
    productCode: "CPU000770X",
    image: pcImg,
    specs: { socket: "AM5", tdp: 105 },
  },

  // Slot 2: Mainboard
  {
    id: "main-1",
    slotIndex: 2,
    title: "Bo Mạch Chủ ASUS TUF GAMING B760M-PLUS WIFI DDR4",
    price: 3890000,
    marketPrice: 4500000,
    discountPercent: "-14%",
    warranty: "36 tháng",
    stockStatus: "Còn hàng",
    productCode: "MB00B760M",
    image: cleanPcImg,
    specs: { socket: "LGA 1700", ramType: "DDR4", ramSlots: 4, formFactor: "Micro-ATX", tdp: 30 },
  },
  {
    id: "main-2",
    slotIndex: 2,
    title: "Bo Mạch Chủ MSI MAG B650 TOMAHAWK WIFI AM5 DDR5",
    price: 5690000,
    marketPrice: 6500000,
    discountPercent: "-12%",
    warranty: "36 tháng",
    stockStatus: "Còn hàng",
    productCode: "MB00B650T",
    image: cleanPcImg,
    specs: { socket: "AM5", ramType: "DDR5", ramSlots: 4, formFactor: "ATX", tdp: 30 },
  },
  {
    id: "main-3",
    slotIndex: 2,
    title: "Bo Mạch Chủ GIGABYTE B550M AORUS ELITE Socket AM4 DDR4",
    price: 2790000,
    marketPrice: 3200000,
    discountPercent: "-12%",
    warranty: "36 tháng",
    stockStatus: "Còn hàng",
    productCode: "MB00B550M",
    image: cleanPcImg,
    specs: { socket: "AM4", ramType: "DDR4", ramSlots: 4, formFactor: "Micro-ATX", tdp: 30 },
  },

  // Slot 3: RAM
  {
    id: "ram-1",
    slotIndex: 3,
    title: "RAM Kingston FURY Beast 16GB (2x8GB) DDR4 3200MHz",
    price: 1090000,
    marketPrice: 1450000,
    discountPercent: "-25%",
    warranty: "36 tháng",
    stockStatus: "Còn hàng",
    productCode: "RAM16G3200",
    image: pcImg,
    specs: { ramType: "DDR4", sticksCount: 2, tdp: 5 },
  },
  {
    id: "ram-2",
    slotIndex: 3,
    title: "RAM Corsair Vengeance RGB 32GB (2x16GB) DDR5 5600MHz",
    price: 2890000,
    marketPrice: 3500000,
    discountPercent: "-17%",
    warranty: "36 tháng",
    stockStatus: "Còn hàng",
    productCode: "RAM32GD5",
    image: pcImg,
    specs: { ramType: "DDR5", sticksCount: 2, tdp: 5 },
  },

  // Slot 4: VGA
  {
    id: "vga-1",
    slotIndex: 4,
    title: "Card Màn Hình MSI GeForce RTX 4060 VENTUS 2X BLACK 8G OC (Dài 199mm)",
    price: 8190000,
    marketPrice: 9500000,
    discountPercent: "-14%",
    warranty: "36 tháng",
    stockStatus: "Còn hàng",
    productCode: "VGA4060V",
    image: rtxImg,
    specs: { vgaLength: 199, recommendedPsu: 550, tdp: 115 },
  },
  {
    id: "vga-2",
    slotIndex: 4,
    title: "Card Màn Hình ASUS TUF Gaming GeForce RTX 4070 SUPER 12GB GDDR6X (Dài 301mm)",
    price: 18490000,
    marketPrice: 20990000,
    discountPercent: "-12%",
    warranty: "36 tháng",
    stockStatus: "Còn hàng",
    productCode: "VGA4070S",
    image: rtxImg,
    specs: { vgaLength: 301, recommendedPsu: 750, tdp: 220 },
  },

  // Slot 5: SSD
  {
    id: "ssd-1",
    slotIndex: 5,
    title: "Ổ Cứng SSD Kingston NV2 1TB PCIe 4.0 NVMe M.2 2280",
    price: 1590000,
    marketPrice: 1990000,
    discountPercent: "-20%",
    warranty: "36 tháng",
    stockStatus: "Còn hàng",
    productCode: "SSD1TBKS",
    image: cleanPcImg,
    specs: { tdp: 5 },
  },

  // Slot 6: HDD
  {
    id: "hdd-1",
    slotIndex: 6,
    title: "Ổ Cứng HDD Western Digital Blue 1TB 3.5 inch SATA3 7200RPM",
    price: 1190000,
    marketPrice: 1390000,
    discountPercent: "-14%",
    warranty: "24 tháng",
    stockStatus: "Còn hàng",
    productCode: "HDD1TBWDB",
    image: pcImg,
    specs: { tdp: 7 },
  },

  // Slot 7: PSU
  {
    id: "psu-1",
    slotIndex: 7,
    title: "Nguồn Máy Tính Corsair CV650 650W - 80 Plus Bronze",
    price: 1390000,
    marketPrice: 1690000,
    discountPercent: "-18%",
    warranty: "36 tháng",
    stockStatus: "Còn hàng",
    productCode: "PSU650CV",
    image: pcImg,
    specs: { wattage: 650 },
  },
  {
    id: "psu-2",
    slotIndex: 7,
    title: "Nguồn Máy Tính MSI MAG A750GL PCIE5 750W - 80 Plus Gold",
    price: 2690000,
    marketPrice: 3100000,
    discountPercent: "-13%",
    warranty: "60 tháng",
    stockStatus: "Còn hàng",
    productCode: "PSU750MSI",
    image: pcImg,
    specs: { wattage: 750 },
  },

  // Slot 8: Cooler
  {
    id: "cooler-1",
    slotIndex: 8,
    title: "Tản Nhiệt Khí CPU Thermalright Peerless Assassin 120 SE ARGB (Cao 155mm)",
    price: 890000,
    marketPrice: 1100000,
    discountPercent: "-19%",
    warranty: "24 tháng",
    stockStatus: "Còn hàng",
    productCode: "COOLPA120",
    image: cleanPcImg,
    specs: { coolerType: "AIR", coolerHeight: 155, tdp: 10 },
  },
  {
    id: "cooler-2",
    slotIndex: 8,
    title: "Tản Nhiệt Nước Thermalright Aqua Elite 360 V3 ARGB Black (Rad 360mm)",
    price: 1590000,
    marketPrice: 1890000,
    discountPercent: "-16%",
    warranty: "24 tháng",
    stockStatus: "Còn hàng",
    productCode: "COOL360AE",
    image: cleanPcImg,
    specs: { coolerType: "AIO", radiatorSize: 360, tdp: 15 },
  },

  // Slot 9: Case
  {
    id: "case-1",
    slotIndex: 9,
    title: "Vỏ Máy Tính Xigmatek Gaming X ARGB (Max GPU 310mm, CPU 160mm, Rad 240)",
    price: 790000,
    marketPrice: 950000,
    discountPercent: "-17%",
    warranty: "12 tháng",
    stockStatus: "Còn hàng",
    productCode: "CASEXIGGX",
    image: cleanPcImg,
    specs: {
      maxGpuLength: 310,
      maxCpuHeight: 160,
      supportedForms: ["ATX", "Micro-ATX", "Mini-ITX"],
      radiatorSupport: [120, 240],
      tdp: 0,
    },
  },
  {
    id: "case-2",
    slotIndex: 9,
    title: "Vỏ Máy Tính NZXT H5 Flow Black (Max GPU 365mm, CPU 165mm, Rad 360)",
    price: 2290000,
    marketPrice: 2690000,
    discountPercent: "-15%",
    warranty: "24 tháng",
    stockStatus: "Còn hàng",
    productCode: "CASENZXTH5",
    image: cleanPcImg,
    specs: {
      maxGpuLength: 365,
      maxCpuHeight: 165,
      supportedForms: ["ATX", "Micro-ATX", "Mini-ITX"],
      radiatorSupport: [120, 240, 280, 360],
      tdp: 0,
    },
  },

  // Slot 10: Fan
  {
    id: "fan-1",
    slotIndex: 10,
    title: "Bộ 3 Fan Tản Nhiệt Xigmatek Galaxy III Essential AX120 ARGB",
    price: 390000,
    marketPrice: 500000,
    discountPercent: "-22%",
    warranty: "12 tháng",
    stockStatus: "Còn hàng",
    productCode: "FANAX120",
    image: cleanPcImg,
    specs: { tdp: 5 },
  },
];
