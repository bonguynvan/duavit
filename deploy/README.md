# Triển khai lên VPS (Ubuntu + Docker)

> Hướng dẫn này dùng tên miền của bản chính thức (`peti.vn`, `duavit.peti.vn`). Nếu tự host, hãy thay
> tên miền của bạn trong `deploy/Caddyfile`, `deploy/update.sh` và `.env` (`PUBLIC_URL`); có thể bỏ khối
> `peti.vn` / `www.peti.vn` / `dua.peti.vn` trong Caddyfile cùng volume `sites/peti` nếu không cần trang giới thiệu.

Kết quả sau khi làm xong:

| Địa chỉ | Nội dung |
|---|---|
| `https://peti.vn` | Trang link tree (tĩnh, `sites/peti`) |
| `https://duavit.peti.vn` | Game đua vịt |
| `https://dua.peti.vn` | Link ngắn, tự chuyển sang `duavit.peti.vn` |

Caddy tự lấy và gia hạn chứng chỉ HTTPS (Let's Encrypt). App Node không mở ra internet, chỉ Caddy gọi được.

---

## 1. Trỏ tên miền về VPS
Trong trang quản lý DNS của `peti.vn`, tạo các bản ghi **A** trỏ về **IP của VPS**:

| Tên | Loại | Giá trị |
|---|---|---|
| `@` | A | IP VPS |
| `www` | A | IP VPS |
| `duavit` | A | IP VPS |
| `dua` | A | IP VPS |

Kiểm tra (trên máy bất kỳ): `nslookup duavit.peti.vn` phải ra đúng IP VPS. Có thể mất vài phút đến vài giờ.

## 2. Chuẩn bị VPS
SSH vào VPS rồi chạy:

```bash
sudo apt update && sudo apt -y upgrade
# Tường lửa: chỉ mở SSH, HTTP, HTTPS
sudo apt -y install ufw git curl
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp && sudo ufw allow 443/udp
sudo ufw --force enable
```

Cài Docker (kho chính thức của Docker):

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # đăng xuất rồi SSH lại để có hiệu lực
docker compose version          # kiểm tra
```

> Nếu kho Docker chưa hỗ trợ bản Ubuntu bạn dùng: `sudo apt -y install docker.io docker-compose-v2`.

## 3. Lấy mã nguồn
```bash
git clone https://github.com/peti-vn/duavit.git ~/duavit
cd ~/duavit
```

## 4. Cấu hình
```bash
cp .env.example .env
nano .env
```
Các giá trị cần điền:

```dotenv
PUBLIC_URL=https://duavit.peti.vn
NODE_ENV=production
GOOGLE_CLIENT_ID=...            # từ Google Cloud Console
GOOGLE_CLIENT_SECRET=...
ADMIN_EMAILS=email-cua-ban@gmail.com
ACME_EMAIL=email-cua-ban@gmail.com   # Let's Encrypt gửi cảnh báo hết hạn chứng chỉ
DEV_LOGIN=0
```

Google Cloud Console → OAuth client → **Authorized redirect URIs** phải có:
`https://duavit.peti.vn/auth/google/callback`

Thư mục dữ liệu (app chạy bằng user `node`, uid 1000):

```bash
mkdir -p data music
sudo chown 1000:1000 data
```

Nhạc nền theo map (tùy chọn): chép file vào `music/`, đặt tên theo mã map, ví dụ `music/saigon.mp3`.
Lưu ý: phát nhạc có bản quyền trên livestream có thể bị nền tảng quét bản quyền.

## 5. Chạy
```bash
docker compose up -d --build
docker compose ps               # app phải "healthy"
docker compose logs -f caddy    # xem Caddy lấy chứng chỉ (Ctrl+C để thoát)
```
Mở `https://duavit.peti.vn` và `https://peti.vn`.

## 6. Cập nhật phiên bản mới
```bash
cd ~/duavit && ./deploy/update.sh
```
Script tự sao lưu database, kéo code mới, build lại và kiểm tra sức khỏe app.

## 7. Sao lưu
```bash
docker compose exec -T app node src/tools/backup.js     # ghi vào data/backups/
```
Nên đặt lịch hằng ngày (`crontab -e`):

```cron
0 3 * * * cd ~/duavit && docker compose exec -T app node src/tools/backup.js && find data/backups -mtime +14 -delete
```
Và thỉnh thoảng tải `data/backups/` về máy khác.

## Xử lý sự cố
| Hiện tượng | Kiểm tra |
|---|---|
| Không có HTTPS / lỗi chứng chỉ | DNS đã trỏ đúng IP chưa; cổng 80 và 443 đã mở chưa (`sudo ufw status`); `docker compose logs caddy` |
| Đăng nhập Google báo `redirect_uri_mismatch` | Redirect URI trên Google Console phải đúng từng ký tự `https://duavit.peti.vn/auth/google/callback` |
| QR / link chia sẻ ra sai địa chỉ | `PUBLIC_URL` trong `.env` |
| Mọi người bị tính chung một IP (bị giới hạn) | `TRUST_PROXY=1` (đã đặt sẵn trong `docker-compose.yml`) |
| App không lên | `docker compose logs app`; kiểm tra quyền thư mục `data` (`sudo chown 1000:1000 data`) |
