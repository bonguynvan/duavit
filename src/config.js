// Startup checks: production must never fall back to request headers for its own URL.

/**
 * What is missing or unsafe in a production environment (empty list = fine).
 * @param {Record<string, string | undefined>} env
 * @returns {string[]}
 */
export function productionProblems(env) {
  if (env.NODE_ENV !== 'production') return [];
  const problems = [];
  if (!String(env.PUBLIC_URL ?? '').startsWith('https://')) {
    problems.push('PUBLIC_URL phải là địa chỉ https (VD https://duavit.peti.vn): dùng cho cookie Secure, link chia sẻ và Google redirect.');
  }
  return problems;
}

/**
 * What works in production but leaves a feature switched off (the server still starts).
 * @param {Record<string, string | undefined>} env
 * @returns {string[]}
 */
export function productionWarnings(env) {
  if (env.NODE_ENV !== 'production') return [];
  const warnings = [];
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
    warnings.push('Thiếu GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET: tạm đóng tạo phòng; Đua nhanh và các trang công khai vẫn chạy.');
  }
  return warnings;
}
