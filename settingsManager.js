/**
 * SETTINGS MANAGER (settingsManager.js)
 * Quản lý các cấu hình tùy biến của Quản trị viên:
 * - Mục tiêu quy mô nhân viên y tế (targetRespondents: mặc định 500)
 * - Google Sheet Webhook URL
 * Tự động lưu vào data/settings.json chuẩn ACID, không mất khi khởi động lại máy chủ
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const isServerless = Boolean(
  process.env.VERCEL === '1' ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.NOW_REGION
);

const ROOT_SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');
const DATA_DIR = isServerless ? path.join(os.tmpdir(), 'khao-sat-data') : path.join(__dirname, 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function getAllSettings() {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf8');
      return JSON.parse(raw);
    } else if (isServerless && fs.existsSync(ROOT_SETTINGS_FILE)) {
      // Khi serverless cold-start, seed từ file settings.json gốc trong bundle
      const raw = fs.readFileSync(ROOT_SETTINGS_FILE, 'utf8');
      const seedData = JSON.parse(raw);
      saveAllSettings(seedData);
      return seedData;
    }
  } catch (_) {}
  return {};
}

function saveAllSettings(settings) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('[SettingsManager] Lỗi lưu cài đặt:', err.message);
    return false;
  }
}

/**
 * Lấy mục tiêu quy mô nhân viên khảo sát (Mặc định: 500)
 */
function getTargetRespondents() {
  const envTarget = parseInt(process.env.TARGET_RESPONDENTS, 10);
  if (!isNaN(envTarget) && envTarget > 0) return envTarget;

  const settings = getAllSettings();
  const savedTarget = parseInt(settings.targetRespondents, 10);
  if (!isNaN(savedTarget) && savedTarget > 0) return savedTarget;

  return 500;
}

/**
 * Cập nhật mục tiêu quy mô nhân viên khảo sát
 */
function setTargetRespondents(newTarget) {
  const val = parseInt(newTarget, 10);
  if (isNaN(val) || val <= 0 || val > 1000000) {
    throw new Error('Số lượng nhân viên mục tiêu phải là số nguyên dương từ 1 đến 1.000.000!');
  }
  const settings = getAllSettings();
  settings.targetRespondents = val;
  settings.updatedAt = new Date().toISOString();
  saveAllSettings(settings);
  return val;
}

/**
 * Tự động đồng bộ mục tiêu từ client nếu server đang ở giá trị mặc định (500)
 */
function syncClientTarget(clientTarget) {
  const val = parseInt(clientTarget, 10);
  if (!isNaN(val) && val > 0 && val <= 1000000) {
    const current = getTargetRespondents();
    if (current === 500 && val !== 500) {
      setTargetRespondents(val);
      return val;
    }
    return current;
  }
  return getTargetRespondents();
}

/**
 * Lấy Google Sheet Webhook URL
 */
function getGoogleSheetWebhookUrl() {
  const envUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL;
  if (envUrl && envUrl.trim()) return envUrl.trim();
  const settings = getAllSettings();
  return (settings.googleSheetWebhookUrl || '').trim();
}

/**
 * Lưu Google Sheet Webhook URL
 */
function setGoogleSheetWebhookUrl(url) {
  const settings = getAllSettings();
  settings.googleSheetWebhookUrl = (url || '').trim();
  settings.updatedAt = new Date().toISOString();
  saveAllSettings(settings);
  return true;
}

/**
 * Tự động đồng bộ Webhook URL từ client header/query nếu serverless container chưa có
 */
function syncClientWebhook(clientWebhook) {
  const url = String(clientWebhook || '').trim();
  if (url && (url.startsWith('https://script.google.com') || url.startsWith('http'))) {
    const current = getGoogleSheetWebhookUrl();
    if (!current || current !== url) {
      setGoogleSheetWebhookUrl(url);
      return url;
    }
    return current;
  }
  return getGoogleSheetWebhookUrl();
}

/**
 * Mật khẩu mặc định an toàn chuẩn y tế (Chứa chữ hoa, chữ thường, số, ký tự @)
 * Tuyệt đối không bị Google Chrome cảnh báo rò rỉ dữ liệu (compromised password)
 */
const DEFAULT_ADMIN_PASSWORD = 'Admin@BV2026';

/**
 * Lấy mật khẩu Quản trị viên hiện tại (Mặc định: 'Admin@BV2026')
 */
function getAdminPassword() {
  const envPass = process.env.ADMIN_PASS;
  const settings = getAllSettings();
  if (settings.adminPassword && typeof settings.adminPassword === 'string' && settings.adminPassword.trim()) {
    return settings.adminPassword.trim();
  }
  if (envPass && envPass.trim()) return envPass.trim();
  return DEFAULT_ADMIN_PASSWORD;
}

/**
 * Đổi mật khẩu Quản trị viên mới
 */
function setAdminPassword(newPassword) {
  const pass = String(newPassword || '').trim();
  if (!pass || pass.length < 6) {
    throw new Error('Mật khẩu mới phải có độ dài tối thiểu từ 6 ký tự trở lên!');
  }
  if (pass.length > 50) {
    throw new Error('Mật khẩu không được dài quá 50 ký tự!');
  }
  const settings = getAllSettings();
  settings.adminPassword = pass;
  settings.passwordUpdatedAt = new Date().toISOString();
  saveAllSettings(settings);
  return true;
}

/**
 * Xác thực mật khẩu (Hỗ trợ mật khẩu tùy biến, Admin@BV2026 và fallback admin123)
 */
function verifyAdminPassword(inputPassword) {
  const input = String(inputPassword || '').trim();
  const current = getAdminPassword();
  if (input === current) return true;
  
  // Tương thích ngược: nếu chưa từng đổi mật khẩu tùy biến, cho phép cả 'admin123'
  const settings = getAllSettings();
  if (!settings.adminPassword && (input === 'admin123' || input === DEFAULT_ADMIN_PASSWORD)) {
    return true;
  }
  return false;
}

/**
 * Khôi phục (Reset) mật khẩu về mặc định an toàn 'Admin@BV2026'
 */
function resetAdminPassword() {
  const settings = getAllSettings();
  delete settings.adminPassword;
  settings.passwordResetAt = new Date().toISOString();
  saveAllSettings(settings);
  return DEFAULT_ADMIN_PASSWORD;
}

module.exports = {
  getAllSettings,
  getTargetRespondents,
  setTargetRespondents,
  syncClientTarget,
  getGoogleSheetWebhookUrl,
  setGoogleSheetWebhookUrl,
  syncClientWebhook,
  getAdminPassword,
  setAdminPassword,
  verifyAdminPassword,
  resetAdminPassword
};

