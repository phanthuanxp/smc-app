# Triển khai Shop Management Core lên VPS

Hướng dẫn deploy production: Next.js 16 + better-sqlite3, chạy bằng PM2 sau Nginx + SSL.

## Yêu cầu VPS
- Ubuntu/Debian, quyền sudo
- Node.js ≥ 20 (khuyến nghị 22 LTS)
- Build tools cho native module `better-sqlite3`: `python3`, `make`, `g++`
- Nginx + Certbot (cho domain + HTTPS)
- PM2 (chạy nền + tự khởi động lại)

## Biến môi trường (`.env.local` trên VPS)
```
AUTH_SECRET="<chuỗi ngẫu nhiên ≥32 ký tự — tạo bằng: openssl rand -base64 48>"
APP_BASE_URL="https://your-domain.com"          # BẮT BUỘC đúng domain để OAuth sàn hoạt động
# ANTHROPIC_API_KEY="sk-ant-..."                 # bật AI thật
# TIKTOK_APP_KEY=""  TIKTOK_APP_SECRET=""         # bật TikTok Shop
# SHOPEE_PARTNER_ID=""  SHOPEE_PARTNER_KEY=""      # bật Shopee
# SYNC_INTERVAL_MINUTES="10"
```
> Redirect URL khai trên sàn phải khớp: `https://your-domain.com/api/channels/{tiktok|shopee}/callback`

## Các bước (chạy trên VPS)
```bash
# 1. Lấy code (qua git)
git clone <repo-url> smc-app && cd smc-app

# 2. Cài & build (npm install sẽ tự build better-sqlite3 từ source)
npm ci
npm run build

# 3. Tạo .env.local theo mẫu trên (ít nhất AUTH_SECRET + APP_BASE_URL)

# 4. Chạy nền bằng PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup    # làm theo dòng lệnh nó in ra để tự chạy sau reboot

# 5. Nginx reverse proxy → localhost:3000  (xem mẫu bên dưới), rồi:
sudo certbot --nginx -d your-domain.com
```

## Mẫu Nginx (`/etc/nginx/sites-available/smc-app`)
```nginx
server {
  server_name your-domain.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/smc-app /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Cập nhật về sau
```bash
cd smc-app && git pull && npm ci && npm run build && pm2 restart smc-app
```

## Ghi chú
- DB SQLite nằm ở `data/smc.db` (tự tạo + seed lần đầu). Sao lưu = copy file này. KHÔNG xoá khi deploy lại.
- Tài khoản đăng nhập mặc định: `admin@shopcore.vn` / `admin123` — **đổi ngay sau khi deploy**.
- Scheduler tự đồng bộ chạy trong tiến trình `next start` (không cần cron riêng).
