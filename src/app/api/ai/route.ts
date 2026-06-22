import { NextRequest, NextResponse } from 'next/server';
import { routeAi } from '@/lib/ai-router';

const PROMPTS: Record<string, string> = {
  title:
    'Bạn là chuyên gia tối ưu tiêu đề sản phẩm cho sàn TMĐT Việt Nam (Shopee, TikTok Shop, Lazada). ' +
    'Viết MỘT tiêu đề hấp dẫn, chuẩn SEO, tối đa 120 ký tự, có từ khóa chính, không dùng emoji quá đà. ' +
    'Chỉ trả về tiêu đề, không giải thích.',
  description:
    'Bạn là copywriter TMĐT. Viết mô tả sản phẩm tiếng Việt chuẩn SEO, có cấu trúc: đoạn mở đầu hấp dẫn, ' +
    'danh sách 4-6 đặc điểm nổi bật (gạch đầu dòng), và 1 câu kêu gọi hành động. Giọng văn chuyên nghiệp, thuyết phục.',
  seo:
    'Bạn là chuyên gia SEO TMĐT. Phân tích sản phẩm và đề xuất: 5-8 từ khóa nên dùng (kèm lý do ngắn), ' +
    'điểm SEO ước tính hiện tại và sau tối ưu, và 3 gợi ý cải thiện cụ thể. Trình bày rõ ràng, có cấu trúc.',
  image:
    'Bạn là giám đốc nghệ thuật. Mô tả chi tiết 4 concept ảnh sản phẩm chuyên nghiệp (nền, ánh sáng, bố cục, phong cách) ' +
    'phù hợp để chụp/tạo cho sản phẩm này trên sàn TMĐT Việt Nam. Mỗi concept 1-2 câu.',
  video:
    'Bạn là nhà sản xuất nội dung TikTok. Viết kịch bản video KOL 15-30 giây giới thiệu sản phẩm: ' +
    'hook mở đầu, 2-3 cảnh chính kèm lời thoại, và call-to-action. Phong cách trẻ trung, bắt trend.',
  multichannel:
    'Bạn là chuyên gia vận hành đa kênh. Tóm tắt nội dung sản phẩm tối ưu cho từng sàn (TikTok Shop, Shopee, Lazada) ' +
    'và lưu ý khi đăng đồng loạt. Ngắn gọn, thực tế.',
};

export async function POST(req: NextRequest) {
  const { action, input } = await req.json();

  const system = PROMPTS[action];
  if (!system) return NextResponse.json({ error: 'Hành động AI không hợp lệ' }, { status: 400 });
  if (!input?.trim()) return NextResponse.json({ error: 'Vui lòng nhập thông tin sản phẩm' }, { status: 400 });

  try {
    const { result, provider, model } = await routeAi(system, `Thông tin sản phẩm:\n${input}`);
    return NextResponse.json({ result, provider, model });
  } catch (e: unknown) {
    const err = e as Error & { configRequired?: boolean };
    if (err.configRequired) {
      return NextResponse.json({ error: err.message, configRequired: true }, { status: 503 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
