/**
 * GOOGLE SHEET SYNC SERVICE (googleSheetSync.js)
 * Tự động đồng bộ thời gian thực (Real-time) dữ liệu khảo sát sang Google Sheets
 * Chuẩn hóa nhãn tiếng Việt theo Bộ Tiêu chí Chất lượng Bệnh viện - Bộ Y tế
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

const DATA_DIR = isServerless ? path.join(os.tmpdir(), 'khao-sat-data') : path.join(__dirname, 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

const settingsManager = require('./settingsManager');

function getWebhookUrl() {
  return settingsManager.getGoogleSheetWebhookUrl();
}

function setWebhookUrl(url) {
  return settingsManager.setGoogleSheetWebhookUrl(url);
}


// Bảng ánh xạ tiếng Việt chuẩn
const DEPT_LABELS = {
  noi: 'Khối Lâm sàng Nội',
  ngoai: 'Khối Lâm sàng Ngoại',
  capcuu: 'Khối Khám bệnh & Cấp cứu',
  canlamsang: 'Khối Cận lâm sàng & Dược',
  hanhchinh: 'Khối Phòng ban chức năng',
  other: 'Khác'
};

const ROLE_LABELS = {
  bacsi: 'Bác sĩ / Bác sĩ CKI-CKII',
  dieuduong: 'Điều dưỡng / Hộ sinh',
  kythuatvien: 'Kỹ thuật viên y tế',
  duocsi: 'Dược sĩ',
  quanly_hanhchinh: 'Cán bộ QL / Hành chính',
  hotro: 'Hộ lý / Y công / Hỗ trợ',
  other: 'Khác'
};

const EXP_LABELS = {
  duoi2: 'Dưới 2 năm',
  tu2den5: 'Từ 2 đến 5 năm',
  tu5den10: 'Từ 5 đến 10 năm',
  tren10: 'Trên 10 năm',
  other: 'Khác'
};

const GENDER_LABELS = {
  nam: 'Nam',
  nu: 'Nữ',
  khac: 'Không nêu'
};

const DEGREE_LABELS = {
  trungcap_caodang: 'Trung cấp / Cao đẳng',
  daihoc: 'Đại học',
  saudaihoc: 'Sau đại học (ThS, CKI, CKII, TS)',
  other: 'Khác'
};

const COMMITMENT_LABELS = {
  chac_chan: 'Chắc chắn gắn bó lâu dài',
  co_the: 'Có thể gắn bó',
  phan_van: 'Đang phân vân',
  du_dinh_chuyen: 'Dự định chuyển nơi khác',
  unknown: 'Chưa xác định'
};

// Chuẩn hóa một phiếu thành định dạng gửi sang Google Sheet
function formatSurveyForSheet(s) {
  return {
    id: s.id,
    submittedAt: s.submittedAt ? new Date(s.submittedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
    department: DEPT_LABELS[s.demographics?.department] || s.demographics?.department || '',
    role: ROLE_LABELS[s.demographics?.role] || s.demographics?.role || '',
    experience: EXP_LABELS[s.demographics?.experience] || s.demographics?.experience || '',
    gender: GENDER_LABELS[s.demographics?.gender] || s.demographics?.gender || '',
    degree: DEGREE_LABELS[s.demographics?.degree] || s.demographics?.degree || '',
    
    // Nhóm A: Cơ sở vật chất & Môi trường
    a1: s.answers?.a1 || 3,
    a2: s.answers?.a2 || 3,
    a3: s.answers?.a3 || 3,
    a4: s.answers?.a4 || 3,
    a5: s.answers?.a5 || 3,
    
    // Nhóm B: Lãnh đạo & Quản lý
    b1: s.answers?.b1 || 3,
    b2: s.answers?.b2 || 3,
    b3: s.answers?.b3 || 3,
    b4: s.answers?.b4 || 3,
    b5: s.answers?.b5 || 3,
    
    // Nhóm C: Tiền lương & Đãi ngộ
    c1: s.answers?.c1 || 3,
    c2: s.answers?.c2 || 3,
    c3: s.answers?.c3 || 3,
    c4: s.answers?.c4 || 3,
    c5: s.answers?.c5 || 3,
    
    // Nhóm D: Quan hệ đồng nghiệp
    d1: s.answers?.d1 || 3,
    d2: s.answers?.d2 || 3,
    d3: s.answers?.d3 || 3,
    d4: s.answers?.d4 || 3,
    
    // Nhóm E: Đào tạo & Thăng tiến
    e1: s.answers?.e1 || 3,
    e2: s.answers?.e2 || 3,
    e3: s.answers?.e3 || 3,
    e4: s.answers?.e4 || 3,
    
    // Đánh giá chung
    overallScore: s.overall?.score ?? 8,
    commitment: COMMITMENT_LABELS[s.overall?.commitment] || s.overall?.commitment || '',
    enps: s.overall?.enps ?? 8,
    suggestions: s.overall?.suggestions || ''
  };
}

/**
 * Gửi ngầm (Bất đồng bộ) 1 phiếu mới sang Google Sheet
 * Không làm chậm hoặc chặn phản hồi nộp phiếu của nhân viên
 */
async function syncSurveyAsync(survey, customWebhookUrl = null) {
  const webhookUrl = (customWebhookUrl || getWebhookUrl() || '').trim();
  if (!webhookUrl) {
    console.warn(`[GoogleSheetSync Warning] Phiếu ${survey.id} chưa thể đẩy sang Google Sheet vì chưa cấu hình Webhook URL.`);
    return { success: false, reason: 'Chưa cấu hình Google Sheet Webhook URL' };
  }

  const payload = {
    action: 'add_survey',
    survey: formatSurveyForSheet(survey)
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    const resultText = await response.text();
    console.log(`[GoogleSheetSync] Đã đồng bộ phiếu ${survey.id} sang Google Sheet. Phản hồi:`, resultText.slice(0, 100));
    return { success: true };
  } catch (err) {
    console.warn(`[GoogleSheetSync Warning] Lỗi khi gửi phiếu ${survey.id} sang Google Sheet:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Đồng bộ toàn bộ danh sách phiếu hiện có sang Google Sheet
 */
async function syncAllSurveys(surveys, customWebhookUrl = null) {
  const webhookUrl = (customWebhookUrl || getWebhookUrl() || '').trim();
  if (!webhookUrl) {
    throw new Error('Chưa cấu hình liên kết Google Sheet Webhook!');
  }

  const formattedList = surveys.map(formatSurveyForSheet);
  const payload = {
    action: 'sync_all',
    surveys: formattedList
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    redirect: 'follow'
  });

  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return data;
  } catch (_) {
    return { success: true, message: text };
  }
}

/**
 * Kiểm tra kết nối tới Google Sheet Webhook (Test Ping)
 */
async function testWebhook(customUrl = null) {
  const targetUrl = (customUrl || getWebhookUrl() || '').trim();
  if (!targetUrl) {
    throw new Error('Vui lòng nhập đường dẫn Google Apps Script Webhook URL.');
  }

  if (targetUrl.includes('...')) {
    throw new Error('Đường link Webhook bị thiếu (chứa dấu ba chấm "..."). Link chuẩn của Google dài khoảng 70-100 ký tự (Ví dụ: https://script.google.com/macros/s/AKfycbx...ABC123/exec). Vui lòng vào Apps Script ➔ Bấm nút "Sao chép" (Copy) để lấy toàn bộ đường link đầy đủ!');
  }

  const payload = {
    action: 'test',
    timestamp: new Date().toISOString()
  };

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    redirect: 'follow'
  });

  const text = await response.text();

  if (text.trim().startsWith('<') || text.includes('<!DOCTYPE html>') || text.includes('<html')) {
    if (text.includes('accounts.google.com') || text.includes('ServiceLogin')) {
      throw new Error('Google Apps Script chưa mở quyền công khai! Vui lòng vào Apps Script ➔ Triển khai lại ➔ Đặt "Ai có quyền truy cập" thành "Bất kỳ ai" (Anyone).');
    }
    throw new Error('Google Apps Script trả về lỗi HTML thay vì JSON. Đường link có thể bị sai hoặc script chưa được Triển khai (Deploy) đúng cách.');
  }

  try {
    const data = JSON.parse(text);
    if (data && data.success) {
      return data;
    }
    throw new Error(data?.message || data?.error || 'Phản hồi không hợp lệ từ Google Script');
  } catch (err) {
    if (err.message.includes('Google Apps Script') || err.message.includes('chưa mở quyền')) {
      throw err;
    }
    throw new Error('Phản hồi từ Google Apps Script không phải định dạng JSON: ' + text.slice(0, 100));
  }
}

/**
 * Lấy toàn bộ phiếu khảo sát từ Google Sheet về máy chủ Vercel / Local
 */
async function fetchAllSurveysFromSheet(customUrl = null) {
  const webhookUrl = (customUrl || getWebhookUrl() || '').trim();
  if (!webhookUrl) {
    return { success: false, reason: 'Chưa cấu hình Google Sheet Webhook URL', surveys: [] };
  }

  // Kiểm tra tính hợp lệ của URL
  if (webhookUrl.includes('...')) {
    return {
      success: false,
      reason: 'Đường link Webhook bị thiếu (chứa dấu ba chấm "..."). Vui lòng bấm nút "Sao chép" (Copy) trong Google Apps Script để lấy đường link đầy đủ.',
      surveys: []
    };
  }

  if (webhookUrl.includes('/edit')) {
    return {
      success: false,
      reason: 'URL bạn dán là link trang soạn thảo code (/edit). Vui lòng vào Google Sheet ➔ Tiện ích mở rộng ➔ Apps Script ➔ bấm "Triển khai" (Deploy) ➔ lấy "URL ứng dụng web" (kết thúc bằng /exec).',
      surveys: []
    };
  }

  if (webhookUrl.includes('docs.google.com/spreadsheets')) {
    return {
      success: false,
      reason: 'URL bạn dán là link xem bảng tính Google Sheets, không phải Webhook Apps Script. Vui lòng vào menu Tiện ích mở rộng ➔ Apps Script ➔ Triển khai ứng dụng web để lấy link dạng https://script.google.com/macros/s/.../exec.',
      surveys: []
    };
  }

  // Ưu tiên dùng POST trước vì Google Apps Script xử lý POST chuẩn JSON 100% không bị redirect lỗi HTML
  try {
    let data = null;
    let postText = '';

    try {
      const postResp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_all', timestamp: Date.now() }),
        redirect: 'follow'
      });
      postText = await postResp.text();
      data = JSON.parse(postText);
    } catch (_) {
      // Nếu POST không thành công, thử fallback sang GET
      try {
        const url = webhookUrl + (webhookUrl.includes('?') ? '&' : '?') + 'action=get_all&_t=' + Date.now();
        const getResp = await fetch(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          redirect: 'follow'
        });
        const getText = await getResp.text();
        data = JSON.parse(getText);
      } catch (getErr) {
        // Cả POST và GET đều không parse được JSON -> Phân tích xem có phải trang HTML lỗi của Google không
        const sampleText = postText || '';
        if (sampleText.trim().startsWith('<') || sampleText.includes('<!DOCTYPE html>') || sampleText.includes('<html')) {
          if (sampleText.includes('accounts.google.com') || sampleText.includes('ServiceLogin')) {
            return {
              success: false,
              reason: 'Google Apps Script chưa mở quyền truy cập công khai! Vui lòng vào Apps Script ➔ Triển khai lại ➔ Đặt "Ai có quyền truy cập" thành "Bất kỳ ai" (Anyone).',
              surveys: []
            };
          }
          return {
            success: false,
            reason: 'Google Apps Script trả về lỗi HTML thay vì JSON. Vui lòng mở lại file GOOGLE_SHEET_APPS_SCRIPT.js, dán lại toàn bộ mã và Triển khai phiên bản mới.',
            surveys: []
          };
        }
        return { success: false, reason: 'Không thể phân tích dữ liệu trả về từ Google Sheet.', surveys: [] };
      }
    }

    if (data && data.success && Array.isArray(data.surveys)) {
      return { success: true, count: data.surveys.length, surveys: data.surveys, sheetName: data.sheetName };
    }
    return { success: false, reason: data?.message || data?.error || 'Phản hồi không hợp lệ từ Google Sheet', surveys: [] };
  } catch (err) {
    console.warn('[GoogleSheetSync] Lỗi đọc dữ liệu từ Google Sheet:', err.message);
    return { success: false, error: err.message, surveys: [] };
  }
}

/**
 * Xóa toàn bộ phiếu trên Google Sheet khi Admin reset đợt khảo sát
 */
async function clearAllSurveysOnSheet() {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'clear_all' }),
      redirect: 'follow'
    });
  } catch (err) {
    console.warn('[GoogleSheetSync] Lỗi xóa phiếu trên Google Sheet:', err.message);
  }
}

module.exports = {
  getWebhookUrl,
  setWebhookUrl,
  formatSurveyForSheet,
  syncSurveyAsync,
  syncAllSurveys,
  testWebhook,
  fetchAllSurveysFromSheet,
  clearAllSurveysOnSheet
};

