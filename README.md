# 🦆 Đua Vịt Peti

[![test](https://github.com/bonguynvan/duavit/actions/workflows/test.yml/badge.svg)](https://github.com/bonguynvan/duavit/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-yellow.svg)](LICENSE)

Game đua nhân vật **ngẫu nhiên** cho livestream, sự kiện, lớp học và tiệc tùng: dán danh sách tên, bấm đua, cả phòng cùng xem ai về nhất.
Kết quả được chọn bằng **thuật toán công bằng, kiểm chứng được (provably fair)**: mã cam kết SHA-256 được công bố trước khi đua, ai cũng chạy lại và kiểm tra được.

**▶ Chơi miễn phí: [duavit.peti.vn](https://duavit.peti.vn)**

Dùng để: chọn ngẫu nhiên một người, chia đội, xếp thứ tự thuyết trình, chọn người trả lời câu hỏi…

> English: a free, open-source random-picker racing game (think "duck race") with a provably fair
> commit/reveal algorithm. Vanilla JS + Node, no build step. Contributions of new maps and
> characters are very welcome, see [CONTRIBUTING.md](CONTRIBUTING.md).

## Tính năng

- **Đua nhanh** (`/dua-nhanh`): không cần đăng nhập, chạy 100% trên trình duyệt. Dán tới 500 tên hoặc file CSV, chọn map và thời lượng, quay video, xuất kết quả CSV.
- **Phòng chơi** (`/r/MÃ`): host tạo phòng miễn phí (không cần tài khoản), người chơi quét QR bằng điện thoại, nhập tên, chọn nhân vật. Có chat, thả emoji, ném gạch (chỉ để vui).
- **Màn hình OBS** (`/r/MÃ/live`) cho người livestream.
- **Kiểm chứng** (`/kiem-chung`) và trang giải thích thuật toán (`/cong-bang`).
- Nhiều map: Đồng cỏ, Sa mạc, Băng tuyết, Bãi biển, Nông trại, Đền Hùng, Công trường, Ba Đình, Phố siêu anh hùng, Vòng quanh thế giới, Chợ đêm, Tết đến xuân về, Dinh Độc Lập (map đặc biệt, host tự bật).
- Hơn 30 nhân vật vẽ hoàn toàn bằng code (canvas), không dùng ảnh.

Mọi phụ kiện, cú ném, cú ngã, emoji đều **chỉ là hiệu ứng hình ảnh**: không nhân vật nào mạnh hơn, host không can thiệp được tốc độ.

## Chạy trên máy

Cần **Node.js 22.13+** (dùng `node:sqlite` có sẵn).

```bash
git clone https://github.com/bonguynvan/duavit.git
cd duavit
npm install
cp .env.example .env
npm start                    # tạo phòng không cần tài khoản; DEV_LOGIN=1 để thử trang /admin
```

Mở <http://localhost:3000>. Muốn thử nhân vật hay map mới thì vào thẳng <http://localhost:3000/dua-nhanh>.

| Lệnh | Việc |
|---|---|
| `npm start` | chạy server |
| `npm run dev` | chạy và tự khởi động lại khi sửa code |
| `npm test` | chạy toàn bộ test (`node:test`) |
| `npm run test:coverage` | test kèm độ phủ |

Biến môi trường nằm trong [`.env.example`](.env.example). Muốn tự host bản online thì xem [`deploy/README.md`](deploy/README.md) (Docker + Caddy).

## Đóng góp

Rất mong nhận PR thêm **map mới**, **nhân vật mới**, sửa lỗi, cải thiện giao diện điện thoại… Hướng dẫn từng bước nằm trong [CONTRIBUTING.md](CONTRIBUTING.md).
Nếu thấy dự án vui, hãy thả ⭐ cho repo nhé!

## Cấu trúc

```
shared/      chạy cả trên Node lẫn trình duyệt: catalog (nhân vật, map, luật), mô phỏng đua, thuật toán công bằng
src/         server Express + Socket.IO: phòng, trang quản trị (đăng nhập Google), SQLite
public/      trang web (ES modules thuần, không cần build): vẽ canvas, âm thanh, quay video
deploy/      Caddyfile, script cập nhật, hướng dẫn triển khai
test/        node:test (unit + integration qua socket thật)
```

Chi tiết kiến trúc và các quy tắc bất biến (tính tất định của cuộc đua, bảo mật…) nằm trong [`CLAUDE.md`](CLAUDE.md).

## Công bằng hoạt động thế nào?

1. Trước khi đua, server sinh một seed bí mật và công bố mã băm SHA-256 của nó.
2. Toàn bộ cuộc đua được tính từ `(seed, thứ tự người chơi, độ dài đường đua)` bằng bộ sinh số ngẫu nhiên sfc32.
3. Đua xong, seed được công khai. Ai cũng có thể băm lại để so với mã cam kết và chạy lại cuộc đua ở `/kiem-chung`.

Đọc thêm ở trang `/cong-bang`.

## Giấy phép

[MIT](LICENSE). Nhạc nền mp3 không đi kèm repo; nếu tự thêm, chỉ dùng nhạc bạn có quyền sử dụng.
