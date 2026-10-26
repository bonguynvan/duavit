# Triển khai lên VPS (Ubuntu + Docker)

> Hướng dẫn này dùng tên miền của bản chính thức (`duavit.peti.vn`). Nếu tự host, hãy thay tên miền của
> bạn trong `deploy/Caddyfile` (hoặc `deploy/edge/duavit.caddy`) và `.env` (`PUBLIC_URL`); có thể bỏ khối
> `dua.peti.vn` (link ngắn) nếu không cần. Trang chủ `peti.vn` nằm ở repo riêng `peti-vn/peti.vn`.

Kết quả sau khi làm xong:

| Địa chỉ | Nội dung |
|---|---|
| `https://duavit.peti.vn` | Game đua vịt |
| `https://dua.peti.vn` | Link ngắn, tự chuyển sang `duavit.peti.vn` |

Caddy tự lấy và gia hạn chứng chỉ HTTPS (Let's Encrypt). App Node không mở ra internet, chỉ Caddy gọi được.

---

## 1. Trỏ tên miền về VPS
Trong trang quản lý DNS của `peti.vn`, tạo các bản ghi **A** trỏ về **IP của VPS**:

| Tên | Loại | Giá trị |
|---|---|---|
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
Mở `https://duavit.peti.vn`.

## 6. Cập nhật phiên bản mới
```bash
cd ~/duavit && ./deploy/update.sh
```
Script tự sao lưu database, kéo code mới, build lại và kiểm tra sức khỏe app.

## 7. Sao lưu
```bash
./deploy/backup.sh      # ghi vào data/backups/, xóa bản cũ hơn 14 ngày
```
Nên đặt lịch hằng ngày, ví dụ file `/etc/cron.d/duavit-backup`:

```cron
15 3 * * * root /root/duavit/deploy/backup.sh >> /var/log/duavit-backup.log 2>&1
```
Giữ đúng 14 ngày: trang Quyền riêng tư hứa như vậy. Thỉnh thoảng tải `data/backups/` về máy khác.

## Máy đã có reverse proxy dùng chung (nhiều site trên một VPS)

Nếu cổng 80/443 đã thuộc về một Caddy (hoặc nginx) phục vụ các site khác, **đừng** chạy Caddy trong
`docker-compose.yml`; chỉ chạy app trên cổng loopback rồi để proxy chung chuyển tiếp:

```bash
echo 'COMPOSE_FILE=deploy/edge/compose.yml' > .deploy.env    # update.sh và backup.sh tự đọc file này
echo 'APP_PORT=3200' >> .deploy.env                           # đổi nếu cổng đã có app khác
echo 'APP_UID=10010' >> .deploy.env                           # uid riêng: user/dự án khác trên máy không đọc được data/
sudo chown -R 10010:10010 data
set -a; . ./.deploy.env; set +a
docker compose up -d --build                                  # app ở 127.0.0.1:3200
```

Rồi thêm site vào proxy chung, ví dụ chép `deploy/edge/duavit.caddy` vào thư mục site của Caddy, kiểm tra
(`caddy validate`) và reload. Proxy phải **ghi đè** `X-Forwarded-For` bằng IP thật của người dùng
(app tin hop đầu tiên khi `TRUST_PROXY=1`), và không nên bật access log (trang Quyền riêng tư cam kết không ghi IP).
Nếu dùng Cloudflare, để bản ghi ở chế độ **DNS only**: ở chế độ proxy, app chỉ thấy IP của Cloudflare và
giới hạn chống spam theo IP sẽ chặn nhầm người chơi.

## Xử lý sự cố
| Hiện tượng | Kiểm tra |
|---|---|
| Không có HTTPS / lỗi chứng chỉ | DNS đã trỏ đúng IP chưa; cổng 80 và 443 đã mở chưa (`sudo ufw status`); `docker compose logs caddy` |
| Đăng nhập Google báo `redirect_uri_mismatch` | Redirect URI trên Google Console phải đúng từng ký tự `https://duavit.peti.vn/auth/google/callback` |
| QR / link chia sẻ ra sai địa chỉ | `PUBLIC_URL` trong `.env` |
| Mọi người bị tính chung một IP (bị giới hạn) | `TRUST_PROXY=1` (đã đặt sẵn trong `docker-compose.yml`) |
| App không lên | `docker compose logs app`; kiểm tra quyền thư mục `data` (`sudo chown 1000:1000 data`) |
