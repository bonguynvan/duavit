import { existsSync } from 'node:fs';
import { startServer } from './server.js';
import { openDatabase } from './db.js';
import { productionProblems } from './config.js';

if (existsSync('.env')) process.loadEnvFile('.env');

const env = process.env;
const int = (value, fallback) => (Number.isFinite(Number(value)) && value !== '' && value !== undefined ? Number(value) : fallback);

const production = env.NODE_ENV === 'production';
const problems = productionProblems(env);
if (problems.length > 0) {
  console.error(`Cấu hình production chưa đủ:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
const server = await startServer({
  db: openDatabase(env.DB_PATH || './data/duavit.sqlite'),
  auth: {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    adminEmails: (env.ADMIN_EMAILS ?? '').split(','),
    sessionDays: int(env.SESSION_DAYS, 30),
    // Fake sign-in for local development; impossible to enable in production.
    devLogin: !production && env.DEV_LOGIN === '1',
  },
  port: int(env.PORT, 3000),
  publicUrl: env.PUBLIC_URL ?? '',
  trustProxy: env.TRUST_PROXY === '1', // set when running behind Caddy/nginx
  maxSocketsPerIp: int(env.MAX_SOCKETS_PER_IP, 10),
  createPerMinute: int(env.ROOMS_CREATE_PER_MINUTE, 5),
  roomLimits: {
    maxRooms: int(env.MAX_ROOMS, 500),
    maxRoomsPerIp: int(env.MAX_ROOMS_PER_IP, 3),
    maxRoomsPerUser: int(env.MAX_ROOMS_PER_USER, 3),
    idleMs: int(env.ROOM_IDLE_MINUTES, 30) * 60 * 1000,
  },
});

console.info(`Đua Vịt Peti online on port ${server.port}${env.PUBLIC_URL ? ` (${env.PUBLIC_URL})` : ''}`);

const shutdown = () => server.close().then(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
