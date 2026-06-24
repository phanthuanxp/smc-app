import { Suspense } from 'react';
import PlatformHub, { PlatformConfig, AiTool } from '@/components/PlatformHub';
import { Sparkles, Zap, MessageSquare, TrendingUp, Clock, Tag } from 'lucide-react';

const TikTokLogo = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.34 6.34 0 100 12.63 6.34 6.34 0 006.33-6.34V8.94a8.22 8.22 0 004.82 1.55V7.05a4.85 4.85 0 01-1.84-.36z"/>
  </svg>
);

const AI_TOOLS: AiTool[] = [
  {
    id: 'caption',
    icon: <MessageSquare size={18}/>,
    title: 'Tạo caption viral + hashtag',
    desc: 'Viết caption hấp dẫn và bộ hashtag trending phù hợp cho TikTok Shop',
    prompt: 'Viết 3 mẫu caption viral cho TikTok Shop bán thời trang, mỗi mẫu có hook mạnh ở đầu, emoji phù hợp, và 10 hashtag trending liên quan. Viết bằng tiếng Việt, tone trẻ trung.',
  },
  {
    id: 'posting_time',
    icon: <Clock size={18}/>,
    title: 'Giờ đăng tối ưu',
    desc: 'Phân tích và gợi ý khung giờ đăng bài hiệu quả nhất trên TikTok Việt Nam',
    prompt: 'Phân tích và đề xuất lịch đăng bài tối ưu cho TikTok Shop tại Việt Nam theo từng ngày trong tuần. Phân tích theo nhóm sản phẩm: thời trang, mỹ phẩm, đồ gia dụng. Trình bày dạng bảng.',
  },
  {
    id: 'title_seo',
    icon: <Tag size={18}/>,
    title: 'Tối ưu tiêu đề sản phẩm',
    desc: 'Chuẩn SEO TikTok Search — từ khóa trending, format chuẩn để ranking cao',
    prompt: 'Hướng dẫn tối ưu tiêu đề sản phẩm trên TikTok Shop để ranking cao trong TikTok Search. Đưa ra 5 template tiêu đề chuẩn SEO cho ngành thời trang, có giải thích cấu trúc từng phần.',
  },
  {
    id: 'compare_shops',
    icon: <TrendingUp size={18}/>,
    title: 'Phân tích hiệu quả shop',
    desc: 'AI so sánh điểm mạnh/yếu giữa các TikTok shop, đề xuất cải thiện',
    prompt: 'Đưa ra framework phân tích hiệu quả shop TikTok theo các chỉ số: tỷ lệ chuyển đổi, CTR, giờ cao điểm, loại nội dung. Gợi ý 5 hành động cụ thể để tăng doanh thu TikTok Shop.',
  },
  {
    id: 'live_script',
    icon: <Zap size={18}/>,
    title: 'Script TikTok LIVE',
    desc: 'Viết kịch bản bán hàng LIVE chuẩn format, tạo urgency và tăng conversion',
    prompt: 'Viết script TikTok LIVE bán hàng thời trang 30 phút. Bao gồm: lời chào mở đầu, giới thiệu sản phẩm với urgency, xử lý câu hỏi, kêu gọi mua hàng, kết thúc. Tiếng Việt tự nhiên.',
  },
  {
    id: 'affiliate',
    icon: <Sparkles size={18}/>,
    title: 'Chiến lược Affiliate',
    desc: 'Tối ưu chương trình TikTok Affiliate — hoa hồng, target KOC, brief nội dung',
    prompt: 'Xây dựng chiến lược TikTok Affiliate cho shop thời trang: mức hoa hồng phù hợp, tiêu chí chọn KOC/KOL, brief nội dung chuẩn, cách track hiệu quả. Đưa ra plan 30 ngày.',
  },
];

const cfg: PlatformConfig = {
  channel: 'tiktok',
  label: 'TikTok Shop',
  color: '#e11d48',
  colorDark: '#be123c',
  colorLight: '#fff0f5',
  colorBorder: '#fecdd3',
  logo: <TikTokLogo/>,
  feeDefault: 2,
  platformFeatures: [
    'TikTok LIVE bán hàng', 'Affiliate / KOC Program',
    'Flash Deal 24h', 'Video Showcase', 'TikTok Search SEO',
    'Creator Collaboration', 'Shop Voucher', 'Free Shipping',
  ],
  aiTools: AI_TOOLS,
};

export default function TikTokPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center" style={{ color: 'var(--smc-text-4)' }}>Đang tải...</div>}>
      <PlatformHub cfg={cfg}/>
    </Suspense>
  );
}
