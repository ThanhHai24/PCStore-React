export type VietNamDivisionType =
  | 'tỉnh'
  | 'thành phố trung ương'
  | 'xã'
  | 'phường'
  | 'đặc khu'
  | string;

export interface Ward {
  name: string;
  code: number;
  division_type: VietNamDivisionType;
  codename: string;
  province_code: number;
}

export type WardResponse = Ward;

export interface ProvinceResponse {
  name: string;
  code: number;
  division_type: VietNamDivisionType;
  codename: string;
  phone_code: number;
  wards?: Ward[];
}

export interface LegacyWardResponse {
  name: string;
  code: number;
  division_type: string;
  codename: string;
  district_code: number;
  province_code: number;
}

export interface WardWithLegacySource {
  source_code: number;
  ward: WardResponse;
}

