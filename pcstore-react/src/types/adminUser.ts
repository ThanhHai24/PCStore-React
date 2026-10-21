export type BackendRole =
  | 'ADMIN'
  | 'MANAGER'
  | 'CUSTOMER'
  | 'STAFF_WAREHOUSE'
  | 'STAFF_SALES'
  | 'STAFF_TECH'
  | 'STAFF'
  | string;

export type BackendStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED' | string;

export interface BackendUserResponse {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phoneNumber?: string | null;
  address?: string | null;
  citizenIdentificationCard?: string | null;
  role: BackendRole;
  status: BackendStatus;
  createdDate?: string | null;
  createdBy?: number | null;
  lastModifiedDate?: string | null;
  lastModifiedBy?: number | null;
}

export interface PageResponseUserResponse {
  content: BackendUserResponse[];
  pageNumber: number;
  pageSize: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface UserCreateRequest {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  citizenIdentificationCard?: string;
  role?: BackendRole;
  status?: BackendStatus;
}

export interface UserUpdateRequest {
  username: string;
  fullName: string;
  email: string;
  password?: string;
  phoneNumber?: string;
  address?: string;
  citizenIdentificationCard?: string;
  role?: BackendRole;
  status?: BackendStatus;
}

export interface UserStatusUpdateRequest {
  status: BackendStatus;
}

export interface GetUsersParams {
  keyword?: string;
  role?: string;
  status?: string;
  page?: number; // 0-based
  size?: number;
  sort?: string[];
}
