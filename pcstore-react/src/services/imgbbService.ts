/**
 * Dịch vụ tải ảnh lên ImgBB (ImgBB Image Upload Service)
 * Tài liệu API: https://api.imgbb.com/
 */

// ============================================================================
// CẤU HÌNH API KEY IMGBB
// Bạn có thể điền API key tại file .env: VITE_IMGBB_API_KEY="your_api_key_here"
// Hoặc điền tạm trực tiếp vào biến IMGBB_API_KEY_FALLBACK bên dưới.
// ============================================================================
export const IMGBB_API_KEY_FALLBACK = 'eb6f7a446f476715af2c6cc0701de314';

/**
 * Kiểm tra tính hợp lệ của file ảnh trước khi xử lý
 */
export const validateImageFile = (
  file: File,
  maxSizeMB = 32
): { valid: boolean; error?: string } => {
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      error: 'Tệp tải lên không phải là ảnh hợp lệ (PNG, JPG, WEBP, GIF,...)',
    };
  }
  const maxSizeInBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeInBytes) {
    return {
      valid: false,
      error: `Dung lượng ảnh vượt quá giới hạn tối đa cho phép (${maxSizeMB}MB)`,
    };
  }
  return { valid: true };
};

/**
 * Lấy API key ImgBB từ biến môi trường hoặc biến fallback
 */
export const getImgbbApiKey = (): string => {
  const envKey =
    import.meta.env.VITE_IMGBB_API_KEY ||
    import.meta.env.VITE_IMGBB_KEY ||
    '';

  const cleanedEnv = String(envKey).trim().replace(/^["']|["']$/g, '');
  if (cleanedEnv && cleanedEnv !== 'YOUR_IMGBB_API_KEY') {
    return cleanedEnv;
  }

  return IMGBB_API_KEY_FALLBACK.trim();
};

export interface ImgBBImageInfo {
  filename: string;
  name: string;
  mime: string;
  extension: string;
  url: string;
}

export interface ImgBBResponseData {
  id: string;
  title: string;
  url_viewer: string;
  url: string;
  display_url: string;
  width: number;
  height: number;
  size: number;
  time: number;
  expiration: number;
  image: ImgBBImageInfo;
  thumb: ImgBBImageInfo;
  medium?: ImgBBImageInfo;
  delete_url: string;
}

export interface ImgBBApiResponse {
  data: ImgBBResponseData;
  success: boolean;
  status: number;
  error?: {
    message: string;
    code: number;
  };
}

export interface UploadImageOptions {
  name?: string;
  expiration?: number; // Số giây lưu trữ (60 - 15552000). Bỏ trống = lưu vĩnh viễn
  apiKey?: string;
}

/**
 * Upload tệp ảnh lên ImgBB và trả về đầy đủ dữ liệu phản hồi từ ImgBB
 *
 * @param file File ảnh hoặc Blob hoặc chuỗi base64
 * @param options Tùy chọn đặt tên, thời gian hết hạn hoặc chỉ định apiKey riêng
 * @returns Thông tin ảnh đã upload từ ImgBB
 */
export async function uploadImageToImgBB(
  file: File | Blob | string,
  options?: UploadImageOptions
): Promise<ImgBBResponseData> {
  const apiKey = options?.apiKey || getImgbbApiKey();

  if (!apiKey) {
    throw new Error(
      'Chưa cấu hình API Key ImgBB!'
    );
  }

  // Kiểm tra định dạng tệp nếu là File
  if (file instanceof File) {
    if (!file.type.startsWith('image/')) {
      throw new Error('Tệp tải lên không phải là ảnh hợp lệ (PNG, JPG, WEBP, GIF,...)');
    }
    // Giới hạn 32MB theo chính sách ImgBB
    const maxSizeInBytes = 32 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      throw new Error('Dung lượng ảnh vượt quá giới hạn tối đa cho phép (32MB)');
    }
  }

  const formData = new FormData();
  formData.append('image', file);

  if (options?.name) {
    formData.append('name', options.name);
  }
  if (options?.expiration) {
    formData.append('expiration', String(options.expiration));
  }

  const uploadUrl = `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    const result: ImgBBApiResponse = await response.json().catch(() => null);

    if (!response.ok || !result || !result.success) {
      const errorMsg =
        result?.error?.message ||
        `Tải ảnh lên ImgBB thất bại (Mã phản hồi HTTP ${response.status})`;
      throw new Error(errorMsg);
    }

    return result.data;
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến máy chủ ImgBB. Vui lòng kiểm tra lại kết nối mạng internet.');
    }
    throw error;
  }
}

/**
 * Hàm tiện ích để upload ảnh nhanh và lấy trực tiếp URL ảnh hiển thị
 *
 * @param file File ảnh từ input file
 * @param options Tùy chọn upload
 * @returns Đường dẫn URL ảnh trực tiếp (display_url hoặc url)
 */
export async function uploadImage(
  file: File | Blob | string,
  options?: UploadImageOptions
): Promise<string> {
  const data = await uploadImageToImgBB(file, options);
  return data.display_url || data.url;
}

export const imgbbService = {
  uploadImageToImgBB,
  uploadImage,
  getImgbbApiKey,
  validateImageFile,
};

export default imgbbService;
