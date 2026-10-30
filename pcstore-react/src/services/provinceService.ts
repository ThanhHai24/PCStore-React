import { PROVINCE_API_ENDPOINTS } from '../config/api';
import type { ProvinceResponse, WardResponse } from '../types/province';

// Fallback data in case the public API is unavailable
const FALLBACK_PROVINCES: ProvinceResponse[] = [
  { code: 1, name: 'Thành phố Hà Nội', division_type: 'thành phố trung ương', codename: 'ha_noi', phone_code: 24 },
  { code: 79, name: 'Thành phố Hồ Chí Minh', division_type: 'thành phố trung ương', codename: 'ho_chi_minh', phone_code: 28 },
  { code: 48, name: 'Thành phố Đà Nẵng', division_type: 'thành phố trung ương', codename: 'da_nang', phone_code: 236 },
  { code: 31, name: 'Thành phố Hải Phòng', division_type: 'thành phố trung ương', codename: 'hai_phong', phone_code: 225 },
  { code: 92, name: 'Thành phố Cần Thơ', division_type: 'thành phố trung ương', codename: 'can_tho', phone_code: 292 },
  { code: 22, name: 'Thành phố Quảng Ninh', division_type: 'thành phố trung ương', codename: 'quang_ninh', phone_code: 203 },
  { code: 24, name: 'Thành phố Bắc Ninh', division_type: 'thành phố trung ương', codename: 'bac_ninh', phone_code: 222 },
  { code: 46, name: 'Thành phố Huế', division_type: 'thành phố trung ương', codename: 'hue', phone_code: 234 },
  { code: 75, name: 'Thành phố Đồng Nai', division_type: 'thành phố trung ương', codename: 'dong_nai', phone_code: 251 },
];

const FALLBACK_WARDS: Record<number, WardResponse[]> = {
  1: [
    { code: 4, name: 'Phường Ba Đình', division_type: 'phường', codename: 'phuong_ba_dinh', province_code: 1 },
    { code: 70, name: 'Phường Hoàn Kiếm', division_type: 'phường', codename: 'phuong_hoan_kiem', province_code: 1 },
    { code: 166, name: 'Phường Cầu Giấy', division_type: 'phường', codename: 'phuong_cau_giay', province_code: 1 },
    { code: 235, name: 'Phường Đống Đa', division_type: 'phường', codename: 'phuong_dong_da', province_code: 1 },
    { code: 256, name: 'Phường Hai Bà Trưng', division_type: 'phường', codename: 'phuong_hai_ba_trung', province_code: 1 },
    { code: 367, name: 'Phường Thanh Xuân', division_type: 'phường', codename: 'phuong_thanh_xuan', province_code: 1 },
  ],
  79: [
    { code: 26560, name: 'Phường Bến Nghé', division_type: 'phường', codename: 'phuong_ben_nghe', province_code: 79 },
    { code: 26566, name: 'Phường Bến Thành', division_type: 'phường', codename: 'phuong_ben_thanh', province_code: 79 },
    { code: 26572, name: 'Phường Thảo Điền', division_type: 'phường', codename: 'phuong_thao_dien', province_code: 79 },
    { code: 26575, name: 'Phường An Phú', division_type: 'phường', codename: 'phuong_an_phu', province_code: 79 },
  ],
  48: [
    { code: 20194, name: 'Phường Hải Châu', division_type: 'phường', codename: 'phuong_hai_chau', province_code: 48 },
    { code: 20200, name: 'Phường Thanh Khê', division_type: 'phường', codename: 'phuong_thanh_khe', province_code: 48 },
  ],
  31: [
    { code: 11443, name: 'Phường Hồng Bàng', division_type: 'phường', codename: 'phuong_hong_bang', province_code: 31 },
    { code: 11446, name: 'Phường Ngô Quyền', division_type: 'phường', codename: 'phuong_ngo_quyen', province_code: 31 },
  ],
  92: [
    { code: 31105, name: 'Phường Ninh Kiều', division_type: 'phường', codename: 'phuong_ninh_kieu', province_code: 92 },
    { code: 31108, name: 'Phường Cái Răng', division_type: 'phường', codename: 'phuong_cai_rang', province_code: 92 },
  ],
};

// Memory cache to avoid redundant network calls
let provincesCache: ProvinceResponse[] | null = null;
const wardsCache = new Map<number, WardResponse[]>();

export const provinceService = {
  /**
   * Lấy danh sách toàn bộ Tỉnh / Thành phố
   */
  async getProvinces(search?: string): Promise<ProvinceResponse[]> {
    if (!search && provincesCache && provincesCache.length > 0) {
      return provincesCache;
    }

    try {
      const url = search && search.trim()
        ? `${PROVINCE_API_ENDPOINTS.PROVINCES}?search=${encodeURIComponent(search.trim())}`
        : PROVINCE_API_ENDPOINTS.PROVINCES;

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: ProvinceResponse[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        if (!search) {
          provincesCache = data;
        }
        return data;
      }
      return FALLBACK_PROVINCES;
    } catch (error) {
      console.warn('[provinceService] Không thể kết nối Province API, sử dụng dữ liệu dự phòng:', error);
      return FALLBACK_PROVINCES;
    }
  },

  /**
   * Lấy thông tin Tỉnh / Thành phố kèm danh sách Phường / Xã (depth = 2)
   */
  async getProvinceWithWards(code: number): Promise<ProvinceResponse> {
    try {
      const res = await fetch(PROVINCE_API_ENDPOINTS.PROVINCE_DETAIL(code, 2));
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data: ProvinceResponse = await res.json();
      if (data && data.wards) {
        wardsCache.set(code, data.wards);
      }
      return data;
    } catch (error) {
      console.warn(`[provinceService] Lỗi khi lấy chi tiết tỉnh code=${code}:`, error);
      const fallbackProv = FALLBACK_PROVINCES.find((p) => p.code === code) || {
        code,
        name: `Tỉnh/Thành phố #${code}`,
        division_type: 'tỉnh',
        codename: `code_${code}`,
        phone_code: 0,
        wards: FALLBACK_WARDS[code] || [],
      };
      return fallbackProv;
    }
  },

  /**
   * Lấy danh sách Phường / Xã theo mã Tỉnh / Thành phố
   */
  async getWardsByProvince(provinceCode: number, search?: string): Promise<WardResponse[]> {
    if (!search && wardsCache.has(provinceCode)) {
      return wardsCache.get(provinceCode)!;
    }

    try {
      const url = PROVINCE_API_ENDPOINTS.WARDS(provinceCode, search);
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: WardResponse[] = await res.json();
      if (Array.isArray(data)) {
        if (!search) {
          wardsCache.set(provinceCode, data);
        }
        return data;
      }
      return FALLBACK_WARDS[provinceCode] || [];
    } catch (error) {
      console.warn(`[provinceService] Lỗi khi tải danh sách phường/xã cho tỉnh code=${provinceCode}:`, error);
      return FALLBACK_WARDS[provinceCode] || [];
    }
  },

  /**
   * Lấy chi tiết thông tin Phường / Xã theo mã
   */
  async getWardByCode(code: number): Promise<WardResponse | null> {
    try {
      const res = await fetch(PROVINCE_API_ENDPOINTS.WARD_DETAIL(code));
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return await res.json();
    } catch (error) {
      console.warn(`[provinceService] Lỗi khi lấy thông tin phường/xã code=${code}:`, error);
      return null;
    }
  },
};

export default provinceService;

