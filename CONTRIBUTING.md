# Đóng góp cho Đua Vịt Peti

Cảm ơn bạn đã muốn góp sức! Những PR được chào đón nhất:

- 🐣 **Nhân vật mới** (vẽ bằng canvas, không dùng ảnh)
- 🗺️ **Map mới** (bảng màu + phong cảnh nhiều lớp)
- 🐛 Sửa lỗi, cải thiện trên điện thoại, khả năng truy cập, hiệu năng

Với thay đổi lớn (tính năng mới, đổi luật đua, đổi giao diện chính), hãy mở **issue** trước để bàn, tránh làm xong mới thấy lệch hướng.

## Chuẩn bị

```bash
git clone https://github.com/<tài-khoản-của-bạn>/duavit.git   # sau khi fork
cd duavit
npm install
cp .env.example .env
DEV_LOGIN=1 npm run dev
```

Mở <http://localhost:3000/dua-nhanh> để xem thử: trang này chạy hoàn toàn trên trình duyệt, không cần đăng nhập. Không cần build: sửa file trong `public/` rồi tải lại trang là thấy.

Chạy `npm test` trước khi gửi PR. Test `test/catalog.test.js` sẽ báo nếu bạn quên đăng ký phần vẽ cho nhân vật hoặc map mới.

---

## Thêm nhân vật

Mỗi nhân vật gồm 3 phần:

### 1. Khai báo trong `shared/catalog.js`

```js
export const ANIMALS = [
  // ...
  { id: 'buffalo', name: 'Trâu', color: '#5b5f6b' },
];
```

- `id`: camelCase, chữ ASCII, không trùng.
- `name`: tên tiếng Việt hiển thị cho người chơi.
- `color`: màu chính dạng `#rrggbb`.
- `maps: ['mapId']` (tùy chọn): nhân vật chỉ xuất hiện trên những map đó.
- `group` (tùy chọn): tab của nhân vật trong bảng chọn (`CHARACTER_GROUPS`). Mặc định nhân vật riêng của map vào tab của map đó, còn lại vào "Động vật". Một bộ nhân vật theo chủ đề mới thì thêm một nhóm vào `CHARACTER_GROUPS`.

### 2. Viết hàm vẽ (painter)

Nhân vật dùng chung thì thêm vào `ANIMAL_PAINTERS` trong `public/js/painters.js`. Một bộ nhân vật theo chủ đề thì nên tạo file riêng, ví dụ `public/js/painters-tet.js`, rồi gộp vào `PAINTERS` trong `public/js/draw.js` (xem cách `painters-holiday.js` đang làm).

```js
buffalo(ctx, c, p, m, face) {
  // c: màu chính, p: pha chuyển động (tăng dần khi chạy), m: true khi đang chạy, face: huy hiệu tên
  const dark = shade(c, -0.18);
  [[-20, Math.PI], [22, 0]].forEach(([x, o]) => leg(ctx, x, -30, 28, swing(p, o, m), dark));
  ellipse(ctx, 0, -42, 36, 17, c);
  [[-12, 0], [14, Math.PI]].forEach(([x, o]) => leg(ctx, x, -30, 28, swing(p, o, m), c));
  drawFace(ctx, 38, -60, 17, face, c);
},
```

Quy ước hệ tọa độ:

- Nhân vật **quay mặt sang phải**, gốc tọa độ `(0, 0)` nằm **trên mặt đất, giữa thân**; trục y âm là đi lên.
- Dài khoảng **100 đơn vị** (từ khoảng -50 đến +50), cao không quá ~105 đơn vị.
- Dùng các hàm có sẵn trong `public/js/paint.js` (`shape`, `ellipse`, `circle`, `poly`, `stroke`, `leg`, `swing`, `shade`…) để có viền mực dày giống phong cách chung.
- Bắt buộc gọi `drawFace(ctx, x, y, r, face, c)`: đó là huy hiệu chữ cái đầu tên người chơi.
- Dùng `swing(p, offset, m)` cho chân/tay để nhân vật đứng yên khi `m === false`.

### 3. Vị trí phụ kiện (`HEAD_TOP`)

Phụ kiện (👑, 🕶️…) nổi phía trên đầu. Thêm `[x, y]` (tính theo đơn vị nhân vật) vào `HEAD_TOP` trong `public/js/draw.js`, hoặc vào bảng `*_HEAD_TOP` trong file painter theo chủ đề của bạn:

```js
buffalo: [36, -82],
```

Kiểm tra bằng cách chọn nhân vật ở trang người chơi và đeo vài phụ kiện.

---

## Thêm map

### 1. Khai báo trong `shared/catalog.js`

```js
MAPS.push({
  id: 'ruongbacthang', name: 'Ruộng bậc thang', trackLength: 680,
  palette: { skyTop: '#8fd3ff', skyBottom: '#fff1c9', ground: '#86c25a', laneA: '#c9a26b', laneB: '#bf9760', line: '#fff6e5' },
  cheers: ['Lúa chín vàng rồi!', 'Về đích thôi!'],          // tùy chọn: chữ trên băng rôn
  allowedAnimals: ['buffalo', 'duck', 'chicken', 'frog'],    // tùy chọn: chỉ cho chọn những nhân vật này
});
```

| Trường | Ý nghĩa |
|---|---|
| `trackLength` | độ dài mặc định (300–1200); ~8 đơn vị/giây, tức 680 ≈ 85 giây |
| `palette` | đủ 6 màu: `skyTop`, `skyBottom`, `ground`, `laneA`, `laneB`, `line` |
| `cheers` | câu cổ vũ chạy trên băng rôn |
| `allowedAnimals` | danh sách `id` nhân vật được chọn trên map |
| `finish` | kiểu vạch đích đặc biệt: `palace-gate`, `temple-drum`, `ribbon`, `flag-raise` (bỏ trống = vạch caro) |
| `special: true` | ẩn mặc định, host phải bật "map đặc biệt" (dành cho chủ đề nhạy cảm/lễ kỷ niệm) |

### 2. Vẽ phong cảnh

Thêm một mục vào `SCENERY` (`public/js/scenery.js`), hoặc vào file phong cảnh theo chủ đề như `scenery-holiday.js` rồi gộp trong `draw.js`. Mỗi map có tối đa 4 lớp, lớp nào cũng tùy chọn:

```js
ruongbacthang: {
  fixed(ctx, w, base, h, t) { sun(ctx, w * 0.85, h * 0.3, h * 0.15, '#ffe066'); },  // đứng yên (mặt trời, mây)
  far: (ctx, w, base, h) => hills(ctx, w, base, h * 0.5, '#7cb86a', 1.4),           // lớp xa, cuộn chậm
  near(ctx, w, base, h, t) { /* ruộng, nhà, cây… */ },                              // lớp gần, cuộn nhanh hơn
  overlay(ctx, w, base, h, t) { /* mưa, tuyết, pháo hoa… */ },                      // phủ lên trên, không cuộn
},
```

- `w`: bề rộng một ô lặp; `far`/`near` được lặp ngang liên tục nên mép trái và mép phải phải khớp nhau.
- `base`: tọa độ y của đường chân trời; `h`: chiều cao vùng phong cảnh; `t`: thời gian (ms) để làm chuyển động.
- Đừng dùng `Math.random()` khi vẽ (cảnh sẽ nhấp nháy); muốn ngẫu nhiên thì dùng công thức cố định theo chỉ số `i`.

### 3. Nhạc (tùy chọn)

Map tự dùng nhạc 8-bit có sẵn. **Không** commit file mp3 vào repo; xem `public/music/README.txt`.

---

## Quy tắc nội dung

- **Tự vẽ, tự sáng tác.** Không dùng nhân vật có bản quyền (Doraemon, Pikachu, Mario…), logo thương hiệu, hay hình người thật.
- **Không** vẽ một nhóm người, dân tộc, quốc gia, tôn giáo… thành con vật hay hình ảnh xúc phạm. Hình ảnh lịch sử, văn hóa được hoan nghênh nếu thể hiện trân trọng; chủ đề nhạy cảm thì đặt `special: true`.
- Toàn bộ chữ trên giao diện bằng **tiếng Việt**; người đua gọi là **"nhân vật"**.
- **Không dùng từ ngữ cờ bạc**: "may rủi", "may mắn", "cầu may", "giải thưởng", "tiền thưởng", "trúng thưởng", "cược"… Hãy dùng "ngẫu nhiên", "random", "thuật toán công bằng". (Ngoại lệ duy nhất: điều khoản cấm trong `/dieu-khoan`.)
- **Không thêm bất cứ thứ gì liên quan đến tiền**: vật phẩm trả phí, nạp tiền, tiền ảo, điểm quy đổi, quảng cáo, liên kết tới trang cá cược. Dự án miễn phí và sẽ luôn như vậy.
- Thêm cookie, lưu thêm dữ liệu, gọi dịch vụ bên thứ ba hay ghi log? Cập nhật luôn trang `public/privacy.html` trong cùng PR.

## Quy tắc kỹ thuật

- **Không thay đổi kết quả đua.** Nhân vật, map, phụ kiện chỉ là hình ảnh. Mọi thay đổi trong `shared/race.js`, `shared/simulate.js`, `shared/fair.js` hoặc `RULES` cần mở issue bàn trước, vì chúng ảnh hưởng tới tính công bằng và việc kiểm chứng các cuộc đua cũ.
- CSP rất chặt: không dùng `innerHTML`, không viết `style="…"` hay `<script>` nội tuyến. Đặt style qua `el(tag, { style: {...} })` trong `public/js/ui.js`.
- Không thêm thư viện hay bước build nếu chưa bàn trước; dự án cố ý giữ JavaScript thuần.
- File nhỏ, gọn (dưới ~800 dòng). File painter/scenery dài quá thì tách theo chủ đề.
- Có thay đổi logic thì viết test kèm theo (`node:test`, đặt trong `test/`).

## Gửi PR

1. Tạo nhánh từ `main`: `git checkout -b feat/map-ruong-bac-thang`.
2. Commit theo kiểu [Conventional Commits](https://www.conventionalcommits.org/): `feat: thêm map Ruộng bậc thang`, `fix: …`.
3. `npm test` phải xanh.
4. Trong PR, đính kèm **ảnh chụp hoặc GIF** nhân vật/map đang chạy (cả trên máy tính lẫn màn hình điện thoại nếu được).

Bằng việc gửi PR, bạn đồng ý cho phát hành đóng góp của mình theo [giấy phép MIT](LICENSE) của dự án.

## Báo lỗi bảo mật

Đừng mở issue công khai; xem [SECURITY.md](SECURITY.md).
