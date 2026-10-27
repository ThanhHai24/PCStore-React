export type CategoryType =
  | 'CPU'
  | 'Mainboard'
  | 'RAM'
  | 'VGA'
  | 'SSD'
  | 'HDD'
  | 'PSU'
  | 'Case'
  | 'Cooler'
  | 'PC'
  | 'Laptop'
  | 'Monitor'
  | 'Keyboard'
  | 'Mouse'
  | 'Headset'
  | 'Generic';

export function detectCategoryType(categoryName?: string): CategoryType {
  if (!categoryName) return 'PC';
  const n = categoryName.toLowerCase().trim();
  if (n.includes('laptop') || n.includes('máy tính xách tay') || n.includes('notebook')) return 'Laptop';
  if (n.includes('case') || n.includes('vỏ máy') || n.includes('vỏ case') || n.includes('thùng máy')) return 'Case';
  if (n.includes('tản nhiệt') || n.includes('cooler') || n.includes('cooling')) return 'Cooler';
  if (n.includes('cpu') || n.includes('bộ xử lý') || n.includes('processor')) return 'CPU';
  if (n.includes('mainboard') || n.includes('bo mạch') || n.includes('motherboard')) return 'Mainboard';
  if (n.includes('ram') || (n.includes('bộ nhớ') && !n.includes('ssd'))) return 'RAM';
  if (n.includes('vga') || n.includes('card màn hình') || n.includes('gpu') || n.includes('card đồ họa')) return 'VGA';
  if (n.includes('ssd')) return 'SSD';
  if (n.includes('hdd') || n.includes('ổ cứng cơ')) return 'HDD';
  if (n.includes('psu') || n.includes('nguồn')) return 'PSU';
  if (n.includes('pc') || n.includes('nguyên bộ') || n.includes('máy tính để bàn') || n.includes('desktop')) return 'PC';
  return 'Generic';
}
