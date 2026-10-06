import type { ReviewItem } from '../types/review';

export interface QuestionItem {
  id: string;
  userName: string;
  question: string;
  date: string;
  answer?: {
    adminName: string;
    text: string;
    date: string;
  };
}

export const mockReviewsList: ReviewItem[] = [
  {
    id: 'r1',
    userName: 'Nguyễn Văn Hùng',
    rating: 5,
    date: '05/08/2026',
    comment: 'Máy chạy mượt mà, render video 4K cực nhanh. Shop đóng gói cẩn thận, giao hàng siêu tốc!',
    purchased: true,
  },
  {
    id: 'r2',
    userName: 'Trần Minh Anh',
    rating: 5,
    date: '02/08/2026',
    comment: 'Cấu hình Hatsune Miku cực đẹp, LED RGB lung linh, chiến mượt mọi game AAA ở độ phân giải 4K.',
    purchased: true,
  },
  {
    id: 'r3',
    userName: 'Lê Hoàng Nam',
    rating: 4,
    date: '28/07/2026',
    comment: 'Sản phẩm tuyệt vời, chiến tốt mọi tựa game hiện nay. Đóng gói rất cẩn thận.',
    purchased: true,
  }
];

export const mockQAItems: QuestionItem[] = [
  {
    id: 'q1',
    userName: 'Phạm Đức Anh',
    question: 'Bộ PC này có hỗ trợ trả góp 0% qua thẻ tín dụng không shop?',
    date: '01/08/2026',
    answer: {
      adminName: 'QTV PCStore',
      text: 'Chào bạn! PCStore có hỗ trợ trả góp 0% lãi suất qua thẻ tín dụng của 26 ngân hàng liên kết nhé ạ.',
      date: '01/08/2026'
    }
  },
  {
    id: 'q2',
    userName: 'Hoàng Quốc Việt',
    question: 'Máy đã cài sẵn Windows và các phần mềm cơ bản chưa ạ?',
    date: '03/08/2026',
    answer: {
      adminName: 'QTV PCStore',
      text: 'Chào bạn! Khi mua PC tại PCStore, kỹ thuật viên sẽ hỗ trợ cài sẵn Windows bản quyền và đầy đủ driver, phần mềm cơ bản theo yêu cầu hoàn toàn miễn phí ạ.',
      date: '03/08/2026'
    }
  }
];
