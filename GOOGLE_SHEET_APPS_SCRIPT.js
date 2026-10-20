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

// Chuyển 1 dòng trong Google Sheet thành Object Survey chuẩn
function rowArrayToSurvey(r) {
  if (!r || !r[0]) return null;
  var deptVal = String(r[2] || "").trim();
  var roleVal = String(r[3] || "").trim();
  var expVal = String(r[4] || "").trim();
  var genderVal = String(r[5] || "").trim();
  var degreeVal = String(r[6] || "").trim();
  var commitVal = String(r[31] || "").trim();

  var subAt = r[1];
  if (subAt instanceof Date) {
    subAt = subAt.toISOString();
  } else {
    subAt = String(subAt || new Date().toISOString());
  }

  return {
    id: String(r[0]).trim(),
    submittedAt: subAt,
    demographics: {
      department: REVERSE_MAP[deptVal] || deptVal || "other",
      role: REVERSE_MAP[roleVal] || roleVal || "other",
      experience: REVERSE_MAP[expVal] || expVal || "other",
      gender: REVERSE_MAP[genderVal] || genderVal || "khac",
      degree: REVERSE_MAP[degreeVal] || degreeVal || "other"
    },
    answers: {
      a1: Number(r[7]) || 3, a2: Number(r[8]) || 3, a3: Number(r[9]) || 3, a4: Number(r[10]) || 3, a5: Number(r[11]) || 3,
      b1: Number(r[12]) || 3, b2: Number(r[13]) || 3, b3: Number(r[14]) || 3, b4: Number(r[15]) || 3, b5: Number(r[16]) || 3,
      c1: Number(r[17]) || 3, c2: Number(r[18]) || 3, c3: Number(r[19]) || 3, c4: Number(r[20]) || 3, c5: Number(r[21]) || 3,
      d1: Number(r[22]) || 3, d2: Number(r[23]) || 3, d3: Number(r[24]) || 3, d4: Number(r[25]) || 3,
      e1: Number(r[26]) || 3, e2: Number(r[27]) || 3, e3: Number(r[28]) || 3, e4: Number(r[29]) || 3
    },
    overall: {
      score: Number(r[30]) || 8,
      commitment: REVERSE_MAP[commitVal] || commitVal || "chac_chan",
      enps: Number(r[32]) || 8,
      suggestions: String(r[33] || "")
    }
  };
}

// Hàm đọc toàn bộ phiếu từ Google Sheet trả về cho Vercel
function getAllSurveysFromSheet(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return [];
  }
  var values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  var surveys = [];
  for (var i = 0; i < values.length; i++) {
    var s = rowArrayToSurvey(values[i]);
    if (s && s.id) surveys.push(s);
  }
  return surveys;
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'status';

  // Yêu cầu lấy toàn bộ dữ liệu phiếu về cho Vercel Dashboard
  if (action === 'get_all' || action === 'get_surveys') {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var surveys = getAllSurveysFromSheet(sheet);
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      count: surveys.length,
      surveys: surveys
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    service: "Hệ thống Khảo sát Hài lòng Y tế (500 NV)",
    status: "Đang hoạt động hoàn hảo",
    time: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Đợi tối đa 30 giây tránh xung đột khi nhiều phiếu nộp cùng lúc
  lock.tryLock(30000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
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
    if (data.action === 'get_all') {
      var allSurveys = getAllSurveysFromSheet(sheet);
      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        count: allSurveys.length,
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

    // 5. Ghi 1 phiếu mới tự động nộp thời gian thực
    var survey = data.survey || data;
    var rowValues = surveyToRowArray(survey);
    sheet.appendRow(rowValues);

    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      id: survey.id,
      message: "Đã lưu phiếu " + survey.id + " vào Google Sheet thành công!"
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

// Chuyển đối tượng khảo sát sang mảng 34 cột
function surveyToRowArray(s) {
  return [
    s.id || "",
    s.submittedAt || new Date().toLocaleString("vi-VN"),
    s.department || "",
    s.role || "",
    s.experience || "",
    s.gender || "",
    s.degree || "",
    
    s.a1 || 3, s.a2 || 3, s.a3 || 3, s.a4 || 3, s.a5 || 3,
    s.b1 || 3, s.b2 || 3, s.b3 || 3, s.b4 || 3, s.b5 || 3,
    s.c1 || 3, s.c2 || 3, s.c3 || 3, s.c4 || 3, s.c5 || 3,
    s.d1 || 3, s.d2 || 3, s.d3 || 3, s.d4 || 3,
    s.e1 || 3, s.e2 || 3, s.e3 || 3, s.e4 || 3,
    
    s.overallScore || 8,
    s.commitment || "",
    s.enps != null ? s.enps : 8,
    s.suggestions || ""
  ];
}

// Tự động trang trí hàng tiêu đề chuẩn chuyên nghiệp
function initSheetHeadersIfNeeded(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#0f766e"); // Màu xanh y tế đặc trưng
    headerRange.setFontColor("#ffffff");
    headerRange.setHorizontalAlignment("center");
    headerRange.setWrap(true);
    sheet.setFrozenRows(1);
    sheet.setRowHeight(1, 45);
  }
}
