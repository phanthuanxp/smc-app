'use client';
import PlatformHub, { PlatformConfig, AiTool } from '@/components/PlatformHub';
import { Sparkles, Zap, MessageSquare, TrendingUp, Tag, Star } from 'lucide-react';

const ShopeeLogo = () => (
  <svg viewBox="0 0 100 100" width="22" height="22">
    <path d="M30 40 Q30 18 50 18 Q70 18 70 40" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round"/>
    <rect x="14" y="38" width="72" height="52" rx="8" fill="white"/>
    <circle cx="37" cy="62" r="5" fill="#ee4d2d"/>
    <circle cx="63" cy="62" r="5" fill="#ee4d2d"/>
    <path d="M35 74 Q50 84 65 74" fill="none" stroke="#ee4d2d" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

const AI_TOOLS: AiTool[] = [
  {
    id: 'flash_sale',
    icon: <Zap size={18}/>,
    title: 'Flash Sale tối ưu',
    desc: 'AI gợi ý khung giờ, mức giảm giá, và sản phẩm phù hợp nhất cho Flash Sale Shopee',
    prompt: 'Xây dựng chiến lược Flash Sale cho shop Shopee thời trang. Đề xuất: khung giờ tốt nhất (theo data Shopee VN), mức giảm giá tối ưu theo từng loại SP, cách stack voucher, và checklist chuẩn bị trước khi Flash Sale.',
  },
  {
    id: 'keyword_seo',
    icon: <Tag size={18}/>,
    title: 'Keyword SEO Shopee',
    desc: 'Research từ khóa trending theo danh mục, tối ưu tiêu đề + mô tả sản phẩm',
    prompt: 'Hướng dẫn tối ưu SEO trên Shopee cho ngành thời trang nữ. Đưa ra: 20 từ khóa search volume cao, cách đặt tiêu đề chuẩn Shopee SEO (format + ví dụ), cách viết mô tả tăng ranking. Bao gồm long-tail keywords.',
  },
  {
    id: 'description',
    icon: <MessageSquare size={18}/>,
    title: 'Tối ưu mô tả & biến thể',
    desc: 'Viết mô tả SP chuẩn Shopee, tối ưu cấu trúc biến thể màu/size tăng conversion',
    prompt: 'Viết template mô tả sản phẩm chuẩn Shopee cho thời trang: cấu trúc đầy đủ (thông số, chất liệu, hướng dẫn chọn size, chính sách đổi trả). Kèm hướng dẫn set up biến thể màu/size để tăng tỷ lệ mua hàng.',
  },
  {
    id: 'compare_shops',
    icon: <TrendingUp size={18}/>,
    title: 'So sánh hiệu quả shop',
    desc: 'Phân tích chênh lệch giữa các shop Shopee, tìm điểm cần cải thiện',
    prompt: 'Framework so sánh và phân tích hiệu quả nhiều shop Shopee trong cùng ngành: chỉ số cần track (CTR, tỷ lệ add cart, conversion), cách đọc Shopee Analytics, 5 chỉ số quan trọng nhất và cách cải thiện.',
  },
  {
    id: 'voucher_ai',
    icon: <Star size={18}/>,
    title: 'Chiến lược Voucher & Coin',
    desc: 'Tối ưu Shopee Voucher, Shopee Coin cashback để tăng repeat purchase',
    prompt: 'Chiến lược voucher cho shop Shopee tăng doanh thu: cách dùng Shopee Voucher kết hợp Shopee Coin, mức cashback tối ưu, thời điểm phát voucher, cách dùng Freeship Xtra và Bundle Deal. Đưa ra plan theo tháng.',
  },
  {
    id: 'mall_upgrade',
    icon: <Sparkles size={18}/>,
    title: 'Nâng cấp Shopee Mall',
    desc: 'Lộ trình và checklist để đạt tiêu chuẩn Shopee Mall — tăng trust & conversion',
    prompt: 'Lộ trình chi tiết để shop Shopee đạt tiêu chuẩn Shopee Mall: điều kiện cần đáp ứng, thời gian thực tế, lợi ích khi đạt Mall (badge, Freeship Xtra, visibility), và checklist từng bước cụ thể.',
  },
];

const cfg: PlatformConfig = {
  channel: 'shopee',
  label: 'Shopee',
  color: '#ea580c',
  colorDark: '#c2410c',
  colorLight: '#fff7ed',
  colorBorder: '#fed7aa',
  logo: <ShopeeLogo/>,
  feeDefault: 4,
  platformFeatures: [
    'Shopee Mall badge', 'Flash Sale & Voucher', 'Freeship Xtra',
    'Shopee Coin cashback', 'Bundle Deal', 'Add-on Deal',
    'Flexi Combo', 'Shopee Live', 'Affiliate Program',
  ],
  aiTools: AI_TOOLS,
};

export default function ShopeePage() {
  return <PlatformHub cfg={cfg}/>;
}
