// One-time sign-in link for an admin, for servers without Google sign-in (or when it is down).
// Only someone with shell access to the server can run this, so it is as safe as the server itself.
// Usage (inside the container): node src/tools/admin-link.js [email]   (defaults to the first ADMIN_EMAILS)
import { openDatabase } from '../db.js';
import { AuthStore } from '../auth/store.js';

const LINK_MINUTES = 10;

const admins = (process.env.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
const email = (process.argv[2] ?? admins[0] ?? '').trim().toLowerCase();
if (!email) {
  console.error('Chưa có email quản trị. Thêm ADMIN_EMAILS=email@cua-ban vào .env, khởi động lại app rồi chạy lại.');
  process.exit(1);
}
if (!admins.includes(email)) {
  console.error(`${email} không có trong ADMIN_EMAILS (${admins.join(', ') || 'trống'}). Thêm vào .env rồi khởi động lại app.`);
  process.exit(1);
}

const store = new AuthStore(openDatabase(process.env.DB_PATH || './data/duavit.sqlite'), { adminEmails: admins });
const now = Date.now();
const user = store.upsertLocalAdmin(email, now);
const token = store.createLoginLink(user.id, now, LINK_MINUTES * 60 * 1000);
const base = (process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/+$/, '');
console.info(`Link đăng nhập quản trị cho ${email} (dùng 1 lần, hết hạn sau ${LINK_MINUTES} phút):\n\n${base}/auth/link?token=${token}\n`);
