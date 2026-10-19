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

function doGet(e) {
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

    // 2. Đồng bộ hàng loạt toàn bộ danh sách phiếu
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

    // 3. Ghi 1 phiếu mới tự động nộp thời gian thực
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
