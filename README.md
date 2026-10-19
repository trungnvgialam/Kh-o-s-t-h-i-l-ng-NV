# HỆ THỐNG KHẢO SÁT SỰ HÀI LÒNG NHÂN VIÊN Y TẾ (500 NV)
> **Căn cứ:** Bộ tiêu chí chất lượng bệnh viện Việt Nam - Bộ Y tế (Quyết định số 6858/QĐ-BYT).

Hệ thống ứng dụng web chuyên biệt phục vụ khảo sát ẩn danh sự hài lòng của 500 cán bộ, nhân viên y tế tại các cơ sở khám chữa bệnh, tích hợp Dashboard phân tích tự động, biểu đồ Radar/Cột, ma trận ưu tiên cải tiến và xuất báo cáo Excel chuẩn mực.

---

## 🚀 ĐƯỜNG DẪN TRUY CẬP NHANH

* **Phiếu khảo sát nhân viên:** [http://localhost:3000](http://localhost:3000)
* **Cổng đăng nhập Quản trị:** [http://localhost:3000/login.html](http://localhost:3000/login.html)
  * *Tài khoản mặc định:* `admin` / `Admin@BV2026` (hoặc `admin123`)
* **Dashboard Báo cáo & Thống kê:** [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

---

## 📖 TÀI LIỆU HƯỚNG DẪN SỬ DỤNG CHI TIẾT
Toàn bộ quy trình vận hành, giải thích công thức tính toán chỉ số (CSI, eNPS), hướng dẫn khai thác biểu đồ, phân tích khối khoa phòng và xử lý sự cố đã được tổng hợp chi tiết tại:
👉 **[Sổ tay Hướng Dẫn Sử Dụng (HUONG_DAN_SU_DUNG.md)](file:///h:/ch%C6%B0%C6%A1ng%20tr%C3%ACnh%20demo/Kh%E1%BA%A3o%20s%C3%A1t%20h%C3%A0i%20l%C3%B2ng%20NV/HUONG_DAN_SU_DUNG.md)**

---

## 🛠️ CÔNG NGHỆ & TÍNH NĂNG NỔI BẬT
- **Node.js & Express:** Máy chủ backend nhẹ, hiệu năng cao, cơ chế hàng đợi bất đồng bộ (Sequential Async Queue) chống xung đột ghi đồng thời khi hàng trăm người nộp bài cùng lúc.
- **Bảo mật phân quyền:** Cổng xác thực Admin riêng biệt bằng mã hóa Token 32-byte, bảo vệ toàn diện các API và tệp báo cáo.
- **Tự động lưu nháp (Auto-Save Draft):** Lưu tạm trong LocalStorage của nhân viên, không lo mất bài khi bị gián đoạn ca trực.
- **Báo cáo Excel đa tầng (XLSX):** Xuất trọn vẹn 4 sheet định dạng sẵn độ rộng cột chuẩn chỉ (*Báo cáo Tổng hợp, Chi tiết 23 Tiêu chí, Raw Data 500 bản ghi, Ý kiến Hiến kế*).
- **Mã QR linh hoạt:** Tự động phát hiện IP mạng nội bộ và tạo mã QR để in poster dán tại các khoa phòng.
