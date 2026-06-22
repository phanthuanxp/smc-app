import { getDb } from './db';

export function seedIfEmpty() {
  const db = getDb();

  const shopCount = (db.prepare('SELECT COUNT(*) as c FROM shops').get() as { c: number }).c;
  if (shopCount > 0) return;

  // ── Shops ──────────────────────────────────────────
  const insertShop = db.prepare(`
    INSERT INTO shops (name, channel, status, product_count, revenue, orders)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const shops = [
    ['TikTok Shop VN 1', 'tiktok', 'active', 3200, 145000000, 420],
    ['TikTok Shop VN 2', 'tiktok', 'active', 2100, 98000000, 310],
    ['TikTok Fashion', 'tiktok', 'active', 1800, 87000000, 280],
    ['TikTok Beauty', 'tiktok', 'active', 950, 54000000, 190],
    ['TikTok Electronics', 'tiktok', 'error', 620, 31000000, 95],
    ['Shopee Store Chính', 'shopee', 'active', 4100, 210000000, 680],
    ['Shopee Fashion VN', 'shopee', 'active', 3200, 178000000, 540],
    ['Shopee Beauty & Care', 'shopee', 'active', 2800, 143000000, 420],
    ['Shopee Electronics', 'shopee', 'active', 1950, 102000000, 310],
    ['Shopee Home & Living', 'shopee', 'active', 1540, 87000000, 250],
    ['Shopee Sport', 'shopee', 'inactive', 820, 45000000, 130],
    ['Lazada VN Official', 'lazada', 'active', 2900, 132000000, 390],
    ['Lazada Fashion Hub', 'lazada', 'active', 2100, 98000000, 290],
    ['Lazada Tech Store', 'lazada', 'active', 1650, 76000000, 210],
    ['Lazada Home Decor', 'lazada', 'inactive', 980, 43000000, 120],
    ['Tiki Store Chính', 'tiki', 'active', 1800, 87000000, 240],
    ['Tiki Fashion', 'tiki', 'active', 1200, 61000000, 180],
    ['Tiki Electronics', 'tiki', 'active', 890, 45000000, 130],
    ['Facebook Shop Main', 'facebook', 'active', 1500, 72000000, 210],
    ['Facebook Beauty Shop', 'facebook', 'active', 980, 47000000, 140],
    ['Facebook Fashion VN', 'facebook', 'error', 650, 31000000, 95],
    ['Website Chính Thức', 'website', 'active', 5200, 245000000, 720],
    ['Website B2B', 'website', 'active', 2100, 98000000, 230],
  ];
  shops.forEach(s => insertShop.run(...s));

  // ── Products ────────────────────────────────────────
  const insertProduct = db.prepare(`
    INSERT INTO products (sku, name, category, description, price, cost_price, stock, weight, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const products = [
    ['SP001245', 'Áo thun cotton unisex basic', 'Thời trang Nam', 'Áo thun cotton 100% chất lượng cao, form basic unisex phù hợp mọi vóc dáng.', 199000, 85000, 320, 0.3, 'active'],
    ['SP001246', 'Quần jean ống suông nữ', 'Thời trang Nữ', 'Quần jean ống suông dáng đứng, chất liệu denim cao cấp, co giãn nhẹ.', 399000, 150000, 150, 0.6, 'active'],
    ['SP001247', 'Tai nghe Bluetooth Pro 5.0', 'Điện tử', 'Tai nghe không dây Bluetooth 5.0, chống ồn ANC, pin 30h, sạc nhanh USB-C.', 699000, 280000, 45, 0.25, 'active'],
    ['SP001248', 'Bình giữ nhiệt inox 500ml', 'Nhà cửa & Đời sống', 'Bình giữ nhiệt inox 304 cao cấp, giữ nóng 12h giữ lạnh 24h, dung tích 500ml.', 149000, 60000, 80, 0.45, 'active'],
    ['SP001249', 'Kem chống nắng SPF50+', 'Làm đẹp', 'Kem chống nắng vật lý SPF50+/PA++++, không nhờn rít, phù hợp da nhạy cảm.', 250000, 95000, 25, 0.1, 'active'],
    ['SP001250', 'Giày sneaker nam cao cấp', 'Giày dép', 'Giày sneaker da thật phối vải, đế cao su chống trượt, thiết kế hiện đại.', 890000, 380000, 0, 0.8, 'active'],
    ['SP001251', 'Đầm maxi hoa nhí nữ', 'Thời trang Nữ', 'Đầm maxi chất liệu lụa mềm mại, họa tiết hoa nhí, phù hợp đi biển.', 450000, 170000, 200, 0.4, 'active'],
    ['SP001252', 'Balo laptop chống nước 15.6"', 'Túi xách', 'Balo đựng laptop 15.6", chất liệu chống nước, nhiều ngăn tiện dụng.', 650000, 240000, 120, 0.9, 'active'],
    ['SP001253', 'Nước tẩy trang Micellar 400ml', 'Làm đẹp', 'Nước tẩy trang micellar làm sạch sâu, không cồn, phù hợp mọi loại da.', 185000, 70000, 95, 0.45, 'active'],
    ['SP001254', 'Đèn học LED cảm ứng', 'Điện tử', 'Đèn học LED cảm ứng điều chỉnh độ sáng, bảo vệ mắt, cổng USB sạc điện thoại.', 320000, 120000, 68, 0.5, 'active'],
    ['SP001255', 'Áo khoác dù 2 lớp unisex', 'Thời trang Nam', 'Áo khoác dù 2 lớp chống nước, giữ ấm tốt, phong cách streetwear.', 550000, 210000, 145, 0.55, 'active'],
    ['SP001256', 'Máy massage cầm tay mini', 'Sức khỏe', 'Máy massage mini 6 đầu massage, 20 chế độ, pin sạc, nhỏ gọn tiện lợi.', 480000, 180000, 38, 0.4, 'active'],
    ['SP001257', 'Chảo chống dính ceramic 28cm', 'Nhà cửa & Đời sống', 'Chảo chống dính công nghệ ceramic, không PFOA, phù hợp mọi loại bếp.', 390000, 145000, 72, 1.2, 'active'],
    ['SP001258', 'Giày dép nữ đế xuồng', 'Giày dép', 'Sandal đế xuồng 7cm, chất liệu PU cao cấp, dây quai mềm êm chân.', 320000, 120000, 55, 0.5, 'active'],
    ['SP001259', 'Vitamin C tổng hợp 60 viên', 'Sức khỏe', 'Vitamin C 1000mg kết hợp Zinc, tăng cường miễn dịch, làm đẹp da.', 280000, 105000, 180, 0.15, 'active'],
    ['SP001260', 'Set dao bếp 5 món inox 304', 'Nhà cửa & Đời sống', 'Bộ dao bếp 5 món inox 304 không gỉ, tay cầm ergonomic, kèm hộp đựng.', 520000, 195000, 40, 1.5, 'active'],
  ];
  products.forEach(p => insertProduct.run(...p));

  // ── Listings ────────────────────────────────────────
  const insertListing = db.prepare(`
    INSERT INTO listings (product_id, shop_id, status, price, stock, views, sales, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);
  const listings = [
    [1, 1, 'active', 199000, 80, 12400, 320],
    [1, 6, 'active', 199000, 90, 18900, 450],
    [1, 12, 'active', 209000, 70, 8700, 180],
    [1, 16, 'active', 199000, 80, 5400, 110],
    [2, 6, 'active', 399000, 50, 14300, 200],
    [2, 7, 'active', 389000, 40, 9800, 160],
    [2, 12, 'active', 399000, 35, 6200, 95],
    [2, 16, 'active', 399000, 25, 3400, 60],
    [3, 1, 'active', 699000, 20, 8900, 45],
    [3, 6, 'active', 699000, 15, 11200, 60],
    [3, 12, 'active', 719000, 10, 4300, 30],
    [4, 6, 'active', 149000, 30, 6700, 110],
    [4, 17, 'active', 149000, 25, 4200, 70],
    [5, 1, 'active', 250000, 15, 9800, 85],
    [5, 6, 'active', 250000, 10, 13400, 120],
    [5, 2, 'active', 260000, 0, 5600, 40],
    [6, 6, 'pending', 890000, 0, 2300, 0],
    [6, 17, 'pending', 890000, 0, 1800, 0],
    [6, 19, 'error', 890000, 0, 900, 0],
    [7, 1, 'active', 450000, 60, 7800, 150],
    [7, 7, 'active', 440000, 80, 9400, 180],
    [8, 6, 'active', 650000, 40, 5600, 85],
    [9, 1, 'active', 185000, 50, 11200, 200],
    [10, 6, 'active', 320000, 30, 4300, 65],
  ];
  listings.forEach(l => insertListing.run(...l));

  // ── Orders ──────────────────────────────────────────
  const insertOrder = db.prepare(`
    INSERT INTO orders (order_no, customer_name, customer_phone, customer_address, shop_id, status, total, shipping_fee, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ? || ' hours'))
  `);
  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, quantity, price, total) VALUES (?, ?, ?, ?, ?)
  `);

  const orderData = [
    ['DH12548', 'Nguyễn Minh Anh', '0901234567', '12 Nguyễn Huệ, Q1, TP.HCM', 1, 'new', 399000, 25000, '-1'],
    ['DH12547', 'Trần Quốc Bảo', '0912345678', '45 Lê Lợi, Q1, TP.HCM', 6, 'processing', 199000, 0, '-2'],
    ['DH12546', 'Phạm Thùy Dương', '0923456789', '78 Đinh Tiên Hoàng, Q3, TP.HCM', 1, 'completed', 699000, 30000, '-4'],
    ['DH12545', 'Lê Hoàng Nam', '0934567890', '23 Võ Thị Sáu, Q3, TP.HCM', 6, 'processing', 149000, 20000, '-6'],
    ['DH12544', 'Võ Thị Mỹ Linh', '0945678901', '56 Cách Mạng Tháng 8, Q10, TP.HCM', 12, 'error', 250000, 25000, '-8'],
    ['DH12543', 'Nguyễn Văn Hùng', '0956789012', '34 Trần Hưng Đạo, Q5, TP.HCM', 1, 'completed', 890000, 35000, '-10'],
    ['DH12542', 'Trần Thị Lan', '0967890123', '67 Lý Tự Trọng, Q1, TP.HCM', 6, 'completed', 450000, 25000, '-12'],
    ['DH12541', 'Phạm Minh Tuấn', '0978901234', '89 Nguyễn Thị Minh Khai, Q3, TP.HCM', 16, 'new', 650000, 30000, '-14'],
    ['DH12540', 'Lê Thị Hoa', '0989012345', '12 Bà Triệu, Q1, TP.HCM', 1, 'processing', 185000, 20000, '-16'],
    ['DH12539', 'Võ Minh Khoa', '0990123456', '45 Nguyễn Trãi, Q5, TP.HCM', 6, 'completed', 320000, 25000, '-18'],
    ['DH12538', 'Nguyễn Thị Bích', '0901111222', '78 Trần Phú, Q5, TP.HCM', 1, 'completed', 550000, 30000, '-20'],
    ['DH12537', 'Trần Văn Đức', '0912222333', '23 Phan Đình Phùng, Bình Thạnh, TP.HCM', 12, 'new', 280000, 25000, '-22'],
    ['DH12536', 'Phạm Thị Thu', '0923333444', '56 Hoàng Diệu, Q4, TP.HCM', 6, 'processing', 390000, 30000, '-24'],
    ['DH12535', 'Lê Văn Bình', '0934444555', '34 Ngô Gia Tự, Q10, TP.HCM', 1, 'cancelled', 199000, 0, '-26'],
    ['DH12534', 'Võ Thị Nga', '0945555666', '67 Đinh Bộ Lĩnh, Bình Thạnh, TP.HCM', 6, 'completed', 480000, 30000, '-28'],
    ['DH12533', 'Nguyễn Quang Vinh', '0956666777', '89 Lê Văn Sỹ, Q3, TP.HCM', 1, 'completed', 320000, 25000, '-30'],
    ['DH12532', 'Trần Bảo Châu', '0967777888', '12 Pasteur, Q1, TP.HCM', 6, 'new', 699000, 35000, '-32'],
    ['DH12531', 'Phạm Văn Long', '0978888999', '45 Nam Kỳ Khởi Nghĩa, Q3, TP.HCM', 12, 'processing', 520000, 30000, '-34'],
  ];

  orderData.forEach(o => {
    const result = insertOrder.run(...o);
    const orderId = result.lastInsertRowid;
    insertOrderItem.run(orderId, 1, 1, 199000, 199000);
  });

  // ── Daily Stats ─────────────────────────────────────
  const insertStat = db.prepare(`
    INSERT INTO daily_stats (date, channel, gmv, orders, sessions) VALUES (?, ?, ?, ?, ?)
  `);
  const channels = ['tiktok', 'shopee', 'lazada', 'website'];
  const baseGmv: Record<string, number> = { tiktok: 142, shopee: 118, lazada: 76, website: 48 };
  const baseOrders: Record<string, number> = { tiktok: 1100, shopee: 860, lazada: 520, website: 310 };

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    channels.forEach(ch => {
      const variation = 0.8 + Math.random() * 0.4;
      insertStat.run(
        dateStr, ch,
        Math.round(baseGmv[ch] * variation * 1_000_000),
        Math.round(baseOrders[ch] * variation),
        Math.round(baseOrders[ch] * variation * 3)
      );
    });
  }

  // ── Market Trends ────────────────────────────────────
  const insertTrend = db.prepare(`INSERT INTO market_trends (keyword, trend, score, date) VALUES (?, ?, ?, ?)`);
  const today = new Date().toISOString().split('T')[0];
  const trends = [
    ['áo thun form rộng', 'up', 87, today],
    ['tai nghe bluetooth', 'up', 82, today],
    ['kem chống nắng', 'up', 78, today],
    ['giày sneaker nam', 'up', 74, today],
    ['bình giữ nhiệt', 'down', 43, today],
    ['áo khoác nữ', 'down', 38, today],
    ['quần jean nữ', 'up', 71, today],
    ['son môi', 'up', 68, today],
    ['balo laptop', 'stable', 55, today],
    ['đèn led', 'down', 41, today],
  ];
  trends.forEach(t => insertTrend.run(...t));

  // ── Inventory Logs ───────────────────────────────────
  const insertLog = db.prepare(`INSERT INTO inventory_logs (product_id, type, quantity, note) VALUES (?, ?, ?, ?)`);
  insertLog.run(1, 'in', 200, 'Nhập hàng từ nhà cung cấp ABC');
  insertLog.run(2, 'in', 100, 'Nhập hàng từ nhà cung cấp XYZ');
  insertLog.run(3, 'out', 15, 'Xuất hàng đơn Shopee');
  insertLog.run(4, 'in', 50, 'Nhập hàng bổ sung');
  insertLog.run(5, 'out', 10, 'Xuất hàng đơn TikTok');
  insertLog.run(6, 'out', 5, 'Xuất hàng đơn Lazada');
}
