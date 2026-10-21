/**
 * =========================================================================
 * 🏥 GOOGLE APPS SCRIPT: TỰ ĐỘNG ĐỒNG BỘ KHẢO SÁT HÀI LÒNG NHÂN VIÊN Y TẾ
 * Chuẩn hóa 23 Tiêu chí Chất lượng Bệnh viện - Quyết định 6858/QĐ-BYT
 * =========================================================================
 * 
 * HƯỚNG DẪN 3 BƯỚC CÀI ĐẶT TRONG 1 PHÚT:
 * 1. Mở trang Google Sheets mới (sheet.new) trên trình duyệt của bạn.
 * 2. Trên thanh menu, chọn: "Tiện ích mở rộng" (Extensions) ➔ "Apps Script".
 * 3. Xóa hết mã cũ trong khung soạn thảo, DÁN TOÀN BỘ ĐOẠN MÃ NÀY VÀO ➔ Bấm "Lưu" (biểu tượng đĩa mềm).
 * 4. Bấm nút màu xanh "Triển khai" (Deploy) ở góc trên bên phải ➔ Chọn "Tùy chọn triển khai mới" (New deployment).
 *    - Chọn loại: "Ứng dụng web" (Web app).
 *    - Người có quyền truy cập: Chọn "Bất kỳ ai" (Anyone).
 *    - Bấm "Triển khai" (Deploy) ➔ Cấp quyền khi được hỏi ➔ Sao chép "URL ứng dụng web" (Web App URL).
 * 5. Dán link này vào phần "Đồng bộ Google Sheets" trên trang Quản trị của bạn!
 */

// Danh sách 34 tiêu đề cột chuẩn Bộ Y tế
var HEADERS = [
  "Mã Phiếu",
  "Thời Gian Nộp",
  "Khối Công Tác",
  "Chức Danh",
  "Thâm Niên",
  "Giới Tính",
  "Trình Độ",
  
  // Nhóm A (A1 - A5)
  "A1. Môi trường vi khí hậu & vệ sinh",
  "A2. Trang thiết bị y tế & vật tư",
  "A3. Bảo hộ & An toàn lao động",
  "A4. Tiện ích nghỉ ngơi & nhà ăn",
  "A5. Phần mềm HIS/EMR/LIS",
  
  // Nhóm B (B1 - B5)
  "B1. Lãnh đạo lắng nghe & tôn trọng",
  "B2. Công bằng & minh bạch nhiệm vụ",
  "B3. Động viên & hỗ trợ áp lực",
  "B4. Tầm nhìn & môi trường cởi mở",
  "B5. Văn hóa an toàn & không đổ lỗi",
  
  // Nhóm C (C1 - C5)
  "C1. Thu nhập tương xứng công sức",
  "C2. Phụ cấp trực & thủ thuật",
  "C3. Chính sách phúc lợi & khám SK",
  "C4. Ca trực & nghỉ bù tái tạo sức",
  "C5. Yên tâm tài chính gắn bó",
  
  // Nhóm D (D1 - D4)
  "D1. Tương trợ nội bộ khoa phòng",
  "D2. Phối hợp nhịp nhàng liên khoa",
  "D3. Thế hệ trước hướng dẫn trẻ",
  "D4. Không khí văn minh, không bè phái",
  
  // Nhóm E (E1 - E4)
  "E1. Đào tạo liên tục (CME, CKI, CKII)",
  "E2. Tiếp cận kỹ thuật y khoa mới",
  "E3. Quy hoạch & thăng tiến công bằng",
  "E4. Khuyến khích nghiên cứu khoa học",
  
  // Đánh giá chung
  "Điểm Hài Lòng Chung (1-10)",
  "Ý Định Gắn Bó",
  "Điểm eNPS (0-10)",
  "Ý Kiến Đóng Góp / Hiến Kế"
];

// Bảng ánh xạ ngược từ Tiếng Việt sang mã code chuẩn cho hệ thống Vercel / Dashboard
var REVERSE_MAP = {
  // Khoa / Khối
  "Khối Lâm sàng Nội": "noi",
  "Khối Lâm sàng Ngoại": "ngoai",
  "Khối Khám bệnh & Cấp cứu": "capcuu",
  "Khối Cận lâm sàng & Dược": "canlamsang",
  "Khối Phòng ban chức năng": "hanhchinh",
  
  // Chức danh
  "Bác sĩ / Bác sĩ CKI-CKII": "bacsi",
  "Điều dưỡng / Hộ sinh": "dieuduong",
  "Kỹ thuật viên y tế": "kythuatvien",
  "Dược sĩ": "duocsi",
  "Cán bộ QL / Hành chính": "quanly_hanhchinh",
  "Hộ lý / Y công / Hỗ trợ": "hotro",
  
  // Thâm niên
  "Dưới 2 năm": "duoi2",
  "Từ 2 đến 5 năm": "tu2den5",
  "Từ 5 đến 10 năm": "tu5den10",
  "Trên 10 năm": "tren10",
  
  // Giới tính
  "Nam": "nam",
  "Nữ": "nu",
  "Không nêu": "khac",
  
  // Trình độ
  "Trung cấp / Cao đẳng": "trungcap_caodang",
  "Đại học": "daihoc",
  "Sau đại học (ThS, CKI, CKII, TS)": "saudaihoc",
  
  // Gắn bó
  "Chắc chắn gắn bó lâu dài": "chac_chan",
  "Có thể gắn bó": "co_the",
  "Đang phân vân": "phan_van",
  "Dự định chuyển nơi khác": "du_dinh_chuyen"
};

// Chuẩn hóa tên Khối công tác linh hoạt (chống lỗi khác biệt dấu câu, viết tắt)
function normalizeDept(val) {
  if (!val) return 'other';
  var s = String(val).toLowerCase().trim();
  if (REVERSE_MAP[val]) return REVERSE_MAP[val];
  if (s.includes('nội') || s === 'noi') return 'noi';
  if (s.includes('ngoại') || s === 'ngoai') return 'ngoai';
  if (s.includes('cấp cứu') || s.includes('khám bệnh') || s === 'capcuu') return 'capcuu';
  if (s.includes('cận lâm sàng') || s.includes('dược') || s === 'canlamsang') return 'canlamsang';
  if (s.includes('phòng ban') || s.includes('hành chính') || s.includes('chức năng') || s === 'hanhchinh') return 'hanhchinh';
  return 'other';
}

// Chuẩn hóa Chức danh linh hoạt
function normalizeRole(val) {
  if (!val) return 'other';
  var s = String(val).toLowerCase().trim();
  if (REVERSE_MAP[val]) return REVERSE_MAP[val];
  if (s.includes('bác sĩ') || s.includes('bac si') || s === 'bacsi') return 'bacsi';
  if (s.includes('điều dưỡng') || s.includes('hộ sinh') || s === 'dieuduong') return 'dieuduong';
  if (s.includes('kỹ thuật viên') || s === 'kythuatvien') return 'kythuatvien';
  if (s.includes('dược') || s === 'duocsi') return 'duocsi';
  if (s.includes('quản lý') || s.includes('hành chính') || s === 'quanly_hanhchinh') return 'quanly_hanhchinh';
  if (s.includes('hộ lý') || s.includes('y công') || s.includes('hỗ trợ') || s === 'hotro') return 'hotro';
  return 'other';
}

function normalizeExp(val) {
  if (!val) return 'other';
  var s = String(val).toLowerCase().trim();
  if (REVERSE_MAP[val]) return REVERSE_MAP[val];
  if (s.includes('dưới 2') || s.includes('< 2') || s === 'duoi2') return 'duoi2';
  if (s.includes('2 đến 5') || s.includes('2-5') || s === 'tu2den5') return 'tu2den5';
  if (s.includes('5 đến 10') || s.includes('5-10') || s === 'tu5den10') return 'tu5den10';
  if (s.includes('trên 10') || s.includes('> 10') || s === 'tren10') return 'tren10';
  return 'other';
}

function normalizeGender(val) {
  if (!val) return 'khac';
  var s = String(val).toLowerCase().trim();
  if (REVERSE_MAP[val]) return REVERSE_MAP[val];
  if (s.startsWith('nam') || s === 'm') return 'nam';
  if (s.startsWith('nữ') || s.startsWith('nu') || s === 'f') return 'nu';
  return 'khac';
}

function normalizeDegree(val) {
  if (!val) return 'other';
  var s = String(val).toLowerCase().trim();
  if (REVERSE_MAP[val]) return REVERSE_MAP[val];
  if (s.includes('trung cấp') || s.includes('cao đẳng') || s === 'trungcap_caodang') return 'trungcap_caodang';
  if (s.includes('đại học') || s.includes('dai hoc') || s === 'daihoc') return 'daihoc';
  if (s.includes('sau đại học') || s.includes('ths') || s.includes('cki') || s.includes('ckii') || s.includes('ts') || s === 'saudaihoc') return 'saudaihoc';
  return 'other';
}

function normalizeCommitment(val) {
  if (!val) return 'chac_chan';
  var s = String(val).toLowerCase().trim();
  if (REVERSE_MAP[val]) return REVERSE_MAP[val];
  if (s.includes('lâu dài') || s.includes('chắc chắn') || s === 'chac_chan') return 'chac_chan';
  if (s.includes('có thể') || s === 'co_the') return 'co_the';
  if (s.includes('phân vân') || s === 'phan_van') return 'phan_van';
  if (s.includes('chuyển') || s.includes('nghỉ') || s === 'du_dinh_chuyen') return 'du_dinh_chuyen';
  return 'chac_chan';
}

// Trích xuất điểm số từ chuỗi text (Ví dụ: "5 - Rất hài lòng" ➔ 5)
function parseScore(val, def) {
  if (val === null || val === undefined || val === '') return def;
  var n = Number(val);
  if (!isNaN(n) && n >= 0 && n <= 10) return Math.round(n);
  var m = String(val).match(/\d+/);
  if (m) {
    var p = Number(m[0]);
    if (!isNaN(p) && p >= 0 && p <= 10) return p;
  }
  return def;
}

// Tự động tìm trang tính (Sheet/Tab) chứa dữ liệu thực tế trong File Google Sheets
function getDataSheet(ss) {
  var sheets = ss.getSheets();
  if (!sheets || sheets.length === 0) return ss.getActiveSheet();
  if (sheets.length === 1) return sheets[0];

  // 1. Tìm sheet có nhiều hơn 1 dòng dữ liệu (ưu tiên sheet có nhiều bản ghi nhất)
  var bestSheet = null;
  var maxRows = 0;
  for (var i = 0; i < sheets.length; i++) {
    var r = sheets[i].getLastRow();
    if (r > maxRows) {
      maxRows = r;
      bestSheet = sheets[i];
    }
  }
  if (bestSheet && maxRows > 1) {
    return bestSheet;
  }

  // 2. Tìm sheet có tên liên quan đến khảo sát hoặc phản hồi
  for (var j = 0; j < sheets.length; j++) {
    var name = sheets[j].getName().toLowerCase();
    if (name.includes('khảo sát') || name.includes('khao sat') || name.includes('form') || name.includes('câu trả lời') || name.includes('response')) {
      return sheets[j];
    }
  }

  return ss.getActiveSheet() || sheets[0];
}

// Chuẩn hóa mọi định dạng ngày tháng sang ISO 8601 quốc tế (Hỗ trợ định dạng Việt Nam DD/MM/YYYY)
function parseToIso(val) {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date().toISOString() : val.toISOString();
  var str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    var d = new Date(str);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  var match = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[,\s]+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
  if (match) {
    var day = parseInt(match[1], 10);
    var month = parseInt(match[2], 10) - 1;
    var year = parseInt(match[3], 10);
    var hour = parseInt(match[4] || 0, 10);
    var min = parseInt(match[5] || 0, 10);
    var sec = parseInt(match[6] || 0, 10);
    // Tính toán theo múi giờ Việt Nam (UTC+7)
    var d = new Date(Date.UTC(year, month, day, Math.max(0, hour - 7), min, sec));
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  var fallback = new Date(str);
  return isNaN(fallback.getTime()) ? new Date().toISOString() : fallback.toISOString();
}

// Hàm hỗ trợ đệm số 0 tương thích 100% mọi phiên bản JavaScript của Google Apps Script
function padZero(num, size) {
  var s = "0000" + num;
  return s.substr(s.length - size);
}

// Chuyển 1 dòng trong Google Sheet thành Object Survey chuẩn (Linh hoạt cho cả bảng có sẵn Mã phiếu hoặc bảng Google Form)
function rowArrayToSurvey(r, index, isCol0Timestamp) {
  if (!r || !Array.isArray(r)) return null;
  var hasContent = false;
  for (var k = 0; k < r.length; k++) {
    if (r[k] !== null && r[k] !== undefined && String(r[k]).trim() !== '') {
      hasContent = true;
      break;
    }
  }
  if (!hasContent) return null;

  var id = '';
  var subAt = '';
  var offset = 0;

  if (isCol0Timestamp) {
    id = 'NV-GS-' + padZero(index + 1, 4);
    subAt = parseToIso(r[0]);
    offset = -1; // Cột Khối công tác nằm ở index 1 thay vì index 2
  } else {
    var rawId = r[0] ? String(r[0]).trim() : '';
    if (!rawId || r[0] instanceof Date || /^\d{1,2}[\/\-]/.test(rawId)) {
      id = 'NV-GS-' + padZero(index + 1, 4);
      subAt = parseToIso(r[0] || r[1]);
    } else {
      id = rawId;
      subAt = parseToIso(r[1]);
    }
    offset = 0;
  }

  var getCol = function(stdIdx) {
    var actualIdx = stdIdx + offset;
    return (actualIdx >= 0 && actualIdx < r.length) ? r[actualIdx] : '';
  };

  var deptVal = getCol(2);
  var roleVal = getCol(3);
  var expVal = getCol(4);
  var genderVal = getCol(5);
  var degreeVal = getCol(6);

  var a1 = parseScore(getCol(7), 3);
  var a2 = parseScore(getCol(8), 3);
  var a3 = parseScore(getCol(9), 3);
  var a4 = parseScore(getCol(10), 3);
  var a5 = parseScore(getCol(11), 3);

  var b1 = parseScore(getCol(12), 3);
  var b2 = parseScore(getCol(13), 3);
  var b3 = parseScore(getCol(14), 3);
  var b4 = parseScore(getCol(15), 3);
  var b5 = parseScore(getCol(16), 3);

  var c1 = parseScore(getCol(17), 3);
  var c2 = parseScore(getCol(18), 3);
  var c3 = parseScore(getCol(19), 3);
  var c4 = parseScore(getCol(20), 3);
  var c5 = parseScore(getCol(21), 3);

  var d1 = parseScore(getCol(22), 3);
  var d2 = parseScore(getCol(23), 3);
  var d3 = parseScore(getCol(24), 3);
  var d4 = parseScore(getCol(25), 3);

  var e1 = parseScore(getCol(26), 3);
  var e2 = parseScore(getCol(27), 3);
  var e3 = parseScore(getCol(28), 3);
  var e4 = parseScore(getCol(29), 3);

  var overallScore = parseScore(getCol(30), 8);
  var commitVal = getCol(31);
  var enps = parseScore(getCol(32), 8);
  var suggestions = String(getCol(33) || '');

  return {
    id: id,
    submittedAt: subAt,
    demographics: {
      department: normalizeDept(deptVal),
      role: normalizeRole(roleVal),
      experience: normalizeExp(expVal),
      gender: normalizeGender(genderVal),
      degree: normalizeDegree(degreeVal)
    },
    answers: {
      a1: a1, a2: a2, a3: a3, a4: a4, a5: a5,
      b1: b1, b2: b2, b3: b3, b4: b4, b5: b5,
      c1: c1, c2: c2, c3: c3, c4: c4, c5: c5,
      d1: d1, d2: d2, d3: d3, d4: d4,
      e1: e1, e2: e2, e3: e3, e4: e4
    },
    overall: {
      score: overallScore,
      commitment: normalizeCommitment(commitVal),
      enps: enps,
      suggestions: suggestions
    }
  };
}

// Hàm đọc toàn bộ phiếu từ Google Sheet trả về cho Dashboard
function getAllSurveysFromSheet(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return [];
  }

  var lastCol = Math.max(sheet.getLastColumn(), 1);
  var allValues = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  if (!allValues || allValues.length <= 1) return [];

  var headerRow = allValues[0];
  var dataRows = allValues.slice(1);

  // Nhận diện xem Cột A (index 0) có phải là Mã Phiếu hay là Thời gian nộp (Google Form layout)
  var col0Header = String(headerRow[0] || '').toLowerCase();
  var isCol0Timestamp = false;
  if (col0Header.includes('thời gian') || col0Header.includes('timestamp') || col0Header.includes('dấu thời gian')) {
    isCol0Timestamp = true;
  } else if (!col0Header.includes('mã') && !col0Header.includes('id')) {
    if (dataRows[0] && (dataRows[0][0] instanceof Date || /^\d{1,2}[\/\-]/.test(String(dataRows[0][0])))) {
      isCol0Timestamp = true;
    }
  }

  var surveys = [];
  for (var i = 0; i < dataRows.length; i++) {
    try {
      var s = rowArrayToSurvey(dataRows[i], i, isCol0Timestamp);
      if (s && s.id) surveys.push(s);
    } catch (rowErr) {
      // Bỏ qua dòng bị lỗi để các dòng còn lại vẫn được tải đầy đủ về Dashboard
    }
  }
  return surveys;
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'status';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getDataSheet(ss);

    // Yêu cầu lấy toàn bộ dữ liệu phiếu về cho Dashboard
    if (action === 'get_all' || action === 'get_surveys') {
      var surveys = getAllSurveysFromSheet(sheet);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        count: surveys.length,
        sheetName: sheet.getName(),
        totalRows: sheet.getLastRow(),
        surveys: surveys
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      service: "Hệ thống Khảo sát Hài lòng Y tế (Chuẩn Bộ Y tế)",
      status: "Đang hoạt động hoàn hảo",
      sheetName: sheet.getName(),
      totalRows: sheet.getLastRow(),
      time: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString(),
      surveys: []
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = getDataSheet(ss);
    
    // Tự động khởi tạo dòng Tiêu đề nếu trang tính chưa có
    initSheetHeadersIfNeeded(sheet);

    var contents = e.postData.contents;
    var data = JSON.parse(contents);

    // 1. Kiểm tra kết nối (Test ping)
    if (data.action === 'test') {
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Kết nối thành công tới Google Sheet: " + ss.getName(),
        sheetName: sheet.getName(),
        totalRows: sheet.getLastRow()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Lấy toàn bộ phiếu về máy chủ
    if (data.action === 'get_all' || data.action === 'get_surveys') {
      var allSurveys = getAllSurveysFromSheet(sheet);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        count: allSurveys.length,
        sheetName: sheet.getName(),
        totalRows: sheet.getLastRow(),
        surveys: allSurveys
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Xóa toàn bộ phiếu (Khi Admin bấm Làm mới dữ liệu)
    if (data.action === 'clear_all') {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, HEADERS.length).clearContent();
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        message: "Đã xóa toàn bộ phiếu trên Google Sheet!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 4. Đồng bộ hàng loạt toàn bộ danh sách phiếu
    if (data.action === 'sync_all' && Array.isArray(data.surveys)) {
      var surveys = data.surveys;
      if (surveys.length === 0) {
        return ContentService.createTextOutput(JSON.stringify({
          success: true,
          message: "Không có phiếu nào cần đồng bộ."
        })).setMimeType(ContentService.MimeType.JSON);
      }

      // Xóa dữ liệu cũ dưới dòng tiêu đề để tránh trùng lặp
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, HEADERS.length).clearContent();
      }

      var rows = surveys.map(function(s) {
        return surveyToRowArray(s);
      });

      sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        count: rows.length,
        message: "Đã đồng bộ thành công " + rows.length + " phiếu vào Google Sheet!"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 5. Ghi 1 phiếu mới tự động nộp thời gian thực (Điền chính xác vào dòng trống đầu tiên tại Cột A)
    var survey = data.survey || data;
    var rowValues = surveyToRowArray(survey);
    var targetRow = findRowForSurvey(sheet, survey.id);
    sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
    formatRowAppearance(sheet, targetRow);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      id: survey.id,
      row: targetRow,
      message: "Đã lưu phiếu " + survey.id + " vào Google Sheet thành công tại dòng " + targetRow + "!"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Tìm dòng đích để ghi phiếu: ưu tiên cập nhật dòng có cùng mã ID, hoặc điền vào dòng trống đầu tiên của Cột A
function findRowForSurvey(sheet, surveyId) {
  var maxRows = sheet.getMaxRows();
  if (maxRows <= 1) {
    sheet.insertRowsAfter(maxRows, 50);
    return 2;
  }

  // Đọc toàn bộ Cột A (Mã Phiếu) để tìm chính xác dòng trống hoặc dòng có ID trùng
  var colA = sheet.getRange(1, 1, maxRows, 1).getValues();
  var firstEmpty = -1;
  var targetId = surveyId ? String(surveyId).trim().toUpperCase() : '';

  for (var r = 1; r < colA.length; r++) { // Bắt đầu từ dòng 2 (index 1)
    var val = colA[r][0];
    var strVal = (val !== null && val !== undefined) ? String(val).trim().toUpperCase() : '';

    if (targetId && strVal === targetId) {
      return r + 1; // Cập nhật đúng dòng đã có ID này (tránh nhân bản)
    }

    if (firstEmpty === -1 && strVal === '') {
      firstEmpty = r + 1;
    }
  }

  if (firstEmpty !== -1) {
    return firstEmpty;
  }

  // Nếu tất cả các dòng hiện có đều đã có dữ liệu, thêm 10 dòng mới
  sheet.insertRowsAfter(maxRows, 10);
  return maxRows + 1;
}

// Chuyển đối tượng khảo sát sang mảng 34 cột
function surveyToRowArray(s) {
  var a = s.answers || {};
  return [
    s.id || "",
    s.submittedAt || new Date().toLocaleString("vi-VN"),
    s.department || "",
    s.role || "",
    s.experience || "",
    s.gender || "",
    s.degree || "",
    
    s.a1 != null ? s.a1 : (a.a1 || 3),
    s.a2 != null ? s.a2 : (a.a2 || 3),
    s.a3 != null ? s.a3 : (a.a3 || 3),
    s.a4 != null ? s.a4 : (a.a4 || 3),
    s.a5 != null ? s.a5 : (a.a5 || 3),

    s.b1 != null ? s.b1 : (a.b1 || 3),
    s.b2 != null ? s.b2 : (a.b2 || 3),
    s.b3 != null ? s.b3 : (a.b3 || 3),
    s.b4 != null ? s.b4 : (a.b4 || 3),
    s.b5 != null ? s.b5 : (a.b5 || 3),

    s.c1 != null ? s.c1 : (a.c1 || 3),
    s.c2 != null ? s.c2 : (a.c2 || 3),
    s.c3 != null ? s.c3 : (a.c3 || 3),
    s.c4 != null ? s.c4 : (a.c4 || 3),
    s.c5 != null ? s.c5 : (a.c5 || 3),

    s.d1 != null ? s.d1 : (a.d1 || 3),
    s.d2 != null ? s.d2 : (a.d2 || 3),
    s.d3 != null ? s.d3 : (a.d3 || 3),
    s.d4 != null ? s.d4 : (a.d4 || 3),

    s.e1 != null ? s.e1 : (a.e1 || 3),
    s.e2 != null ? s.e2 : (a.e2 || 3),
    s.e3 != null ? s.e3 : (a.e3 || 3),
    s.e4 != null ? s.e4 : (a.e4 || 3),
    
    s.overallScore != null ? s.overallScore : ((s.overall && s.overall.score != null) ? s.overall.score : 8),
    s.commitment || (s.overall && s.overall.commitment) || "",
    s.enps != null ? s.enps : (s.overall && s.overall.enps != null ? s.overall.enps : 8),
    s.suggestions || (s.overall && s.overall.suggestions) || ""
  ];
}

// Tự động định dạng các cột số và căn giữa hàng dữ liệu (Tối ưu hóa gom 1 lần gọi duy nhất - Siêu tốc)
function formatRowAppearance(sheet, rowIndex) {
  try {
    var rowRange = sheet.getRange(rowIndex, 1, 1, HEADERS.length);
    rowRange.setVerticalAlignment("middle");
    
    var rowAlign = [];
    for (var i = 0; i < HEADERS.length; i++) {
      // Căn giữa: Cột 1 (Mã phiếu), Cột 2 (Thời gian), Cột 5 (Thâm niên), Cột 6 (Giới tính), Cột 8-30 (Likert), Cột 31 (Điểm chung), Cột 33 (eNPS)
      if (i === 0 || i === 1 || i === 4 || i === 5 || (i >= 7 && i <= 29) || i === 30 || i === 32) {
        rowAlign.push("center");
      } else {
        rowAlign.push("left");
      }
    }
    rowRange.setHorizontalAlignments([rowAlign]);
    sheet.setRowHeight(rowIndex, 26);
  } catch (_) {}
}

// Đặt kích thước độ rộng chuẩn cho 34 cột
function setStandardColumnWidths(sheet) {
  try {
    sheet.setColumnWidth(1, 100);  // Mã Phiếu
    sheet.setColumnWidth(2, 160);  // Thời Gian Nộp
    sheet.setColumnWidth(3, 190);  // Khối Công Tác
    sheet.setColumnWidth(4, 180);  // Chức Danh
    sheet.setColumnWidth(5, 120);  // Thâm Niên
    sheet.setColumnWidth(6, 90);   // Giới Tính
    sheet.setColumnWidth(7, 150);  // Trình Độ
    // Cột 8 đến 30 (23 tiêu chí Likert Bộ Y tế)
    for (var c = 8; c <= 30; c++) {
      sheet.setColumnWidth(c, 75);
    }
    sheet.setColumnWidth(31, 105); // Điểm Hài Lòng Chung (1-10)
    sheet.setColumnWidth(32, 180); // Ý Định Gắn Bó
    sheet.setColumnWidth(33, 95);  // Điểm eNPS (0-10)
    sheet.setColumnWidth(34, 320); // Ý Kiến Đóng Góp / Hiến Kế
  } catch (_) {}
}

// Cài đặt định dạng màu tự động (Heatmap trực quan hóa điểm hài lòng)
function setupConditionalFormattingIfNeeded(sheet) {
  try {
    var rules = sheet.getConditionalFormatRules();
    if (rules.length > 0) return;

    var criteriaRange = sheet.getRange(2, 8, 1000, 23); // Cột H đến AD (23 tiêu chí A1 -> E4)
    var newRules = [];

    // Điểm 5: Rất hài lòng - Xanh lá mạ (#dcfce7, chữ #15803d)
    newRules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberEqualTo(5)
      .setBackground("#dcfce7")
      .setFontColor("#15803d")
      .setRanges([criteriaRange])
      .build());

    // Điểm 4: Hài lòng - Xanh lục nhạt (#f0fdf4, chữ #166534)
    newRules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberEqualTo(4)
      .setBackground("#f0fdf4")
      .setFontColor("#166534")
      .setRanges([criteriaRange])
      .build());

    // Điểm 1-2: Không hài lòng / Cần cải thiện - Đỏ nhạt cảnh báo (#fee2e2, chữ #991b1b)
    newRules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberLessThanOrEqualTo(2)
      .setBackground("#fee2e2")
      .setFontColor("#991b1b")
      .setRanges([criteriaRange])
      .build());

    sheet.setConditionalFormatRules(newRules);
  } catch (_) {}
}

// Tự động trang trí hàng tiêu đề chuẩn chuyên nghiệp
function initSheetHeadersIfNeeded(sheet) {
  try {
    // Đảm bảo trang tính có tối thiểu 34 cột trước khi tạo tiêu đề
    var maxCols = sheet.getMaxColumns();
    if (maxCols < HEADERS.length) {
      sheet.insertColumnsAfter(maxCols, HEADERS.length - maxCols);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
      headerRange.setFontWeight("bold");
      headerRange.setBackground("#0f766e"); // Màu xanh y tế đặc trưng
      headerRange.setFontColor("#ffffff");
      headerRange.setHorizontalAlignment("center");
      headerRange.setVerticalAlignment("middle");
      headerRange.setWrap(true);
      sheet.setFrozenRows(1);
      sheet.setFrozenColumns(1); // Cố định cột Mã phiếu khi cuộn sang phải
      sheet.setRowHeight(1, 45);

      setStandardColumnWidths(sheet);
      setupConditionalFormattingIfNeeded(sheet);
    }
  } catch (_) {}
}
