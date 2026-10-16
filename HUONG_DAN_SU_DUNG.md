# SỔ TAY HƯỚNG DẪN SỬ DỤNG
## HỆ THỐNG KHẢO SÁT SỰ HÀI LÒNG NHÂN VIÊN Y TẾ (QUY MÔ 500 NV)
*Chuẩn hóa theo Bộ tiêu chí chất lượng bệnh viện Việt Nam - Bộ Y tế (Quyết định số 6858/QĐ-BYT)*

---

## MỤC LỤC
1. [Giới thiệu Chung & Cơ sở Pháp lý](#1-giới-thiệu-chung--cơ-sở-pháp-lý)
2. [Cấu trúc Bộ Tiêu chí Đánh giá (23 Tiêu chí)](#2-cấu-trúc-bộ-tiêu-chí-đánh-giá-23-tiêu-chí)
3. [Kiến trúc & Đường dẫn Truy cập Hệ thống](#3-kiến-trúc--đường-dẫn-truy-cập-hệ-thống)
4. [Hướng dẫn Dành cho Nhân viên Y tế (Làm bài Khảo sát)](#4-hướng-dẫn-dành-cho-nhân-viên-y-tế-làm-bài-khảo-sát)
5. [Hướng dẫn Dành cho Quản trị viên (Ban Giám đốc & Phòng QLCL)](#5-hướng-dẫn-dành-cho-quản-trị-viên-ban-giám-đốc--phòng-qlcl)
   - [5.1 Đăng nhập Bảo mật](#51-đăng-nhập-bảo-mật)
   - [5.2 Đọc hiểu các Chỉ số KPI & Phương pháp Tính toán](#52-đọc-hiểu-các-chỉ-số-kpi--phương-pháp-tính-toán)
   - [5.3 Khai thác Biểu đồ & Ma trận Ưu tiên Cải tiến](#53-khai-thác-biểu-đồ--ma-trận-ưu-tiên-cải-tiến)
   - [5.4 Lọc Số liệu theo Từng Khối Khoa Phòng](#54-lọc-số-liệu-theo-từng-khối-khoa-phòng)
   - [5.5 Xuất Báo cáo Excel (.xlsx) Chuẩn Bộ Y tế](#55-xuất-báo-cáo-excel-xlsx-chuẩn-bộ-y-tế)
   - [5.6 Trình chiếu & In Mã QR Khảo sát](#56-trình-chiếu--in-mã-qr-khảo-sát)
   - [5.7 Tạo Dữ liệu Mô phỏng Demo & Làm Mới Dữ liệu Thật](#57-tạo-dữ-liệu-mô-phỏng-demo--làm-mới-dữ-liệu-thật)
   - [5.8 Đăng xuất An toàn](#58-đăng-xuất-an-toàn)
6. [Cơ chế Lưu trữ & An toàn Dữ liệu](#6-cơ-chế-lưu-trữ--an-toàn-dữ-liệu)
7. [Xử lý Sự cố Thường gặp (FAQ)](#7-xử-lý-sự-cố-thường-gặp-faq)

---

## 1. GIỚI THIỆU CHUNG & CƠ SỞ PHÁP LÝ

Hệ thống **Khảo sát Sự Hài Lòng Nhân Viên Y Tế** là nền tảng web ứng dụng chuyên biệt, được thiết kế cho các cơ sở y tế / bệnh viện nhằm:
- **Đánh giá khách quan, định kỳ và toàn diện** tâm tư, mức độ hài lòng của nhân viên y tế (Bác sĩ, Điều dưỡng, Kỹ thuật viên, Dược sĩ, Nhân viên hành chính, Hộ lý...).
- **Căn cứ pháp lý:** Xây dựng bám sát **Mẫu số 2 - Phiếu khảo sát sự hài lòng của nhân viên y tế** ban hành kèm theo Bộ tiêu chí chất lượng bệnh viện Việt Nam của Bộ Y tế (Quyết định số 6858/QĐ-BYT).
- **Cam kết bảo mật 100% ẨN DANH:** Hệ thống tuyệt đối không thu thập họ tên, số điện thoại hay tài khoản cá nhân. Cán bộ y tế hoàn toàn yên tâm phản ánh trung thực mọi vướng mắc, nguyện vọng.
- **Phân quyền chặt chẽ:** Chỉ có Quản trị viên (Ban Giám đốc, Phòng Quản lý chất lượng, Tổ chức cán bộ) sở hữu tài khoản bảo mật mới xem được kết quả tổng hợp và chi tiết các phản hồi.

---

## 2. CẤU TRÚC BỘ TIÊU CHÍ ĐÁNH GIÁ (23 TIÊU CHÍ)

Bộ câu hỏi khảo sát gồm **23 tiêu chí trọng điểm** thuộc **5 nhóm khía cạnh**, được đánh giá theo **Thang đo Likert 5 mức**:
- `1 - Rất không hài lòng` (😡)
- `2 - Không hài lòng` (🙁)
- `3 - Bình thường / Trung lập` (😐)
- `4 - Hài lòng` (🙂)
- `5 - Rất hài lòng` (😍)

### Chi tiết 5 nhóm tiêu chí Bộ Y tế:
1. **Nhóm A: Môi trường làm việc & Cơ sở vật chất (5 tiêu chí: A1 → A5)**
   - *A1:* Điều kiện vi khí hậu, ánh sáng, nhiệt độ, thông gió, vệ sinh tại nơi làm việc.
   - *A2:* Trang thiết bị y tế, máy móc và vật tư tiêu hao phục vụ khám chữa bệnh.
   - *A3:* Phương tiện bảo hộ lao động, phòng chống lây nhiễm và an toàn lao động.
   - *A4:* Khu vực nghỉ ngơi, phòng trực đêm, nhà ăn, tiện ích sinh hoạt của nhân viên.
   - *A5:* Hệ thống công nghệ thông tin và phần mềm quản lý bệnh viện (HIS/EMR/LIS).
2. **Nhóm B: Lãnh đạo, Quản lý & Văn hóa ứng xử (5 tiêu chí: B1 → B5)**
   - *B1:* Sự lắng nghe, tiếp thu ý kiến và tôn trọng nhân viên của Lãnh đạo Khoa & Ban Giám đốc.
   - *B2:* Tính công bằng, khách quan, minh bạch trong phân công nhiệm vụ và thi đua.
   - *B3:* Sự động viên, khen thưởng, hỗ trợ kịp thời khi nhân viên gặp áp lực nghề nghiệp.
   - *B4:* Tầm nhìn phát triển rõ ràng của bệnh viện và xây dựng môi trường cởi mở.
   - *B5:* Văn hóa quản lý an toàn, tinh thần xây dựng và không đổ lỗi khi xử lý sự cố y khoa.
3. **Nhóm C: Tiền lương, Thu nhập & Chế độ đãi ngộ (5 tiêu chí: C1 → C5)**
   - *C1:* Tổng thu nhập (lương, thưởng, thu nhập tăng thêm) tương xứng khối lượng công việc.
   - *C2:* Chế độ phụ cấp đặc thù ngành y (trực đêm, phẫu thuật, thủ thuật, độc hại) chi trả kịp thời, thỏa đáng.
   - *C3:* Chính sách phúc lợi (khám sức khỏe định kỳ, bảo hiểm bổ sung, du lịch, hiếu hỉ).
   - *C4:* Bố trí ca trực, thời gian làm việc và nghỉ bù tái tạo sức lao động.
   - *C5:* Sự yên tâm, ổn định tài chính khi gắn bó làm việc tại bệnh viện.
4. **Nhóm D: Quan hệ đồng nghiệp & Tinh thần đoàn kết (4 tiêu chí: D1 → D4)**
   - *D1:* Sự hợp tác, tinh thần tương trợ và thân thiện giữa các đồng nghiệp trong khoa/phòng.
   - *D2:* Mối liên hệ phối hợp nhịp nhàng, hiệu quả chuyên môn liên khoa/phòng.
   - *D3:* Tinh thần chia sẻ kinh nghiệm, hướng dẫn tận tình của thế hệ đi trước cho nhân viên trẻ.
   - *D4:* Không khí làm việc văn minh, không bè phái, không phân biệt đối xử.
5. **Nhóm E: Đào tạo, Phát triển nghề nghiệp & Thăng tiến (4 tiêu chí: E1 → E4)**
   - *E1:* Bệnh viện tạo điều kiện tham gia đào tạo liên tục (CME), học chuyên khoa nâng cao tay nghề.
   - *E2:* Cơ hội tiếp cận kỹ thuật mới, kỹ thuật cao và phát huy sở trường chuyên môn.
   - *E3:* Quy trình quy hoạch cán bộ, bổ nhiệm quản lý và lộ trình thăng tiến công bằng, minh bạch.
   - *E4:* Bệnh viện khuyến khích, hỗ trợ kinh phí/thời gian cho nghiên cứu khoa học, cải tiến chất lượng.

### Đánh giá tổng quát & Gắn kết:
- **Điểm hài lòng chung toàn viện:** Thang điểm 1 (Rất thất vọng) đến 10 (Tuyệt đối hài lòng).
- **Ý định gắn bó lâu dài:** 4 mức lựa chọn (*Chắc chắn gắn bó lâu dài, Có thể, Phân vân, Dự định chuyển nơi khác*).
- **Chỉ số eNPS:** Thang điểm 0 - 10 đo lường mức độ sẵn lòng giới thiệu bệnh viện là nơi làm việc tốt.
- **Ý kiến đóng góp / Hiến kế:** Ô nhập ý kiến tự do gửi trực tiếp tới Ban Giám đốc.

---

## 3. KIẾN TRÚC & ĐƯỜNG DẪN TRUY CẬP HỆ THỐNG

| Phân hệ | Đường dẫn truy cập | Đối tượng | Mô tả |
| :--- | :--- | :--- | :--- |
| **Giao diện Làm Khảo sát** | `http://localhost:3000` | Toàn thể nhân viên y tế | Giao diện phiếu khảo sát 4 bước tối ưu cho cả điện thoại & máy tính, tự động lưu nháp. |
| **Mạng Wi-Fi / Điện thoại** | `http://<IP_MÁY_CHỦ>:3000` *(Ví dụ: `http://192.168.1.40:3000`)* | Cán bộ quét QR qua điện thoại | Nhân viên dùng điện thoại kết nối cùng Wi-Fi bệnh viện để làm bài trực tiếp. |
| **Cổng Đăng Nhập Quản Trị** | `http://localhost:3000/login.html` | Lãnh đạo / Admin | Cổng xác thực tài khoản và mật khẩu trước khi vào Dashboard. |
| **Dashboard Báo Cáo Quản Trị** | `http://localhost:3000/admin.html` | Ban Giám đốc, Phòng QLCL | Phân tích số liệu, biểu đồ Radar/Cột, ma trận ưu tiên, tải Excel báo cáo. |

---

## 4. HƯỚNG DẪN DÀNH CHO NHÂN VIÊN Y TẾ (LÀM BÀI KHẢO SÁT)

```
[BƯỚC 1: Phân loại nhân khẩu học] ➔ [BƯỚC 2: Nhóm A & B] ➔ [BƯỚC 3: Nhóm C & D] ➔ [BƯỚC 4: Nhóm E & Đánh giá chung] ➔ [NỘP PHIẾU]
```

1. **Truy cập bài khảo sát:**
   - Dùng điện thoại quét mã QR được dán tại khoa/phòng hoặc mở đường dẫn [http://localhost:3000](http://localhost:3000).
2. **Bước 1 - Thông tin phân loại công tác:**
   - Chọn *Khối công tác* (Khối Nội, Khối Ngoại, Cấp cứu - HSTC, Cận lâm sàng, Hành chính).
   - Chọn *Vị trí chức danh* (Bác sĩ, Điều dưỡng/Hộ sinh, Kỹ thuật viên, Dược sĩ, Cán bộ quản lý/Hành chính, Hộ lý/Y công).
   - Chọn *Thâm niên công tác*, *Trình độ đào tạo*, *Giới tính*.
   - Bấm **"Tiếp tục →"**.
3. **Bước 2, 3, 4 - Chấm điểm các tiêu chí:**
   - Nhấn vào các mức điểm từ 1 đến 5 (có hiển thị biểu tượng cảm xúc và màu sắc trực quan tương ứng).
   - Hệ thống tự động đổi màu thẻ câu hỏi sang trạng thái **"Đã trả lời"** và cập nhật thanh tiến trình hoàn thành trên đầu trang.
   - Nếu bỏ sót câu hỏi, hệ thống sẽ **viền đỏ nhấp nháy thẻ câu hỏi bị thiếu** và tự động cuộn màn hình đến vị trí đó để bạn hoàn thiện.
4. **Nhập đánh giá chung và ý kiến hiến kế:**
   - Cho điểm từ 1 đến 10 cho mức độ hài lòng chung.
   - Chọn ý định gắn bó trong 3 - 5 năm tới.
   - Chấm điểm độ sẵn sàng giới thiệu bệnh viện (eNPS 0 - 10).
   - Nhập ý kiến đóng góp, tâm tư, kiến nghị (nếu có).
5. **Nộp phiếu:**
   - Bấm **"✓ Gửi Phiếu Khảo Sát"**.
   - Màn hình thông báo nộp thành công xuất hiện cùng **Mã xác nhận bảo mật (Ví dụ: `NV-0501`)**.
   - Bạn có thể bấm *In / Lưu Xác Nhận* hoặc yên tâm đóng trình duyệt.

> [!NOTE]
> **Tính năng Tự động Lưu nháp (Auto-Save):** Khi bạn đang làm khảo sát nhưng có ca trực cấp cứu hoặc bị ngắt kết nối mạng, toàn bộ câu trả lời đã tích sẽ được lưu tạm an toàn trong trình duyệt. Khi bạn mở lại trang web, bài làm sẽ tự động khôi phục nguyên vẹn.

---

## 5. HƯỚNG DẪN DÀNH CHO QUẢN TRỊ VIÊN (BAN GIÁM ĐỐC & PHÒNG QLCL)

### 5.1 Đăng nhập Bảo mật
1. Truy cập: [http://localhost:3000/login.html](http://localhost:3000/login.html)
2. Nhập thông tin đăng nhập mặc định:
   - **Tên đăng nhập:** `admin`
   - **Mật khẩu:** `admin123`
3. Đánh dấu tích vào *Ghi nhớ phiên đăng nhập (24 giờ)* nếu bạn đang làm việc trên máy tính cá nhân.
4. Bấm **"🔒 Đăng Nhập Quản Trị"**. Hệ thống sẽ kiểm tra và cấp Token mã hóa bảo mật, đưa bạn vào Dashboard phân tích.

---

### 5.2 Đọc hiểu các Chỉ số KPI & Phương pháp Tính toán

Ngay đầu Dashboard là 4 thẻ chỉ số KPI tổng thể:

1. **Tổng Số Phiếu Đã Nộp:** Số lượng cán bộ nhân viên đã hoàn thành phiếu trên tổng quy mô 500 nhân viên (kèm thanh tiến trình % mục tiêu).
2. **Chỉ Số Hài Lòng Chung (CSI - Customer/Staff Satisfaction Index):**
   $$\text{CSI} = \frac{\overline{X}_{\text{23 tiêu chí}}}{5} \times 100\%$$
   - $\ge 85\%$: **Xuất sắc** (Huy hiệu Xanh lam)
   - $75\% - 84.9\%$: **Khá / Tốt** (Huy hiệu Xanh lục)
   - $60\% - 74.9\%$: **Trung bình** (Huy hiệu Vàng cam)
   - $< 60\%$: **Cần cải thiện khẩn cấp** (Huy hiệu Đỏ)
3. **Điểm Hài Lòng Toàn Viện (Thang điểm 10):** Điểm trung bình đánh giá chung của toàn thể cán bộ đối với bệnh viện.
4. **Chỉ Số Gắn Kết & Trung Thành (eNPS - Employee Net Promoter Score):**
   $$\text{eNPS} = \% \text{Promoters (Điểm 9-10)} - \% \text{Detractors (Điểm 0-6)}$$
   - eNPS $> +30$: Bệnh viện có môi trường văn hóa gắn kết rất cao.
   - eNPS $> 0$: Tích cực, nhân viên có niềm tin vào tổ chức.
   - eNPS $< 0$: Cần xem xét lại các chính sách đãi ngộ và môi trường làm việc.

---

### 5.3 Khai thác Biểu đồ & Ma trận Ưu tiên Cải tiến

1. **Biểu đồ Radar (Mạng nhện) 5 Nhóm Tiêu chí:**
   - Giúp Ban Giám đốc nhận diện trực quan hình thái cân bằng của 5 trụ cột (Cơ sở vật chất, Lãnh đạo, Đãi ngộ, Đồng nghiệp, Phát triển nghề nghiệp).
   - Cột mốc nào bị lõm vào chính là mảng hoạt động cần đầu tư nguồn lực cải tiến.
2. **Biểu đồ Cột Chi Tiết 23 Tiêu chí:**
   - So sánh trực tiếp điểm số trung bình (1.0 đến 5.0) của từng tiêu chí cụ thể.
   - Hiển thị đường mức mục tiêu chuẩn (3.75 điểm / 75% CSI).
3. **Ma trận Ưu tiên Cải tiến (Action Priority Matrix):**
   - **Cột Trái - Top 5 Điểm Sáng (Thế mạnh):** Các tiêu chí đạt điểm cao nhất, cần tiếp tục phát huy và khen thưởng các bộ phận liên quan.
   - **Cột Phải - Top 5 Điểm Nghẽn (Cần ưu tiên khắc phục):** Các tiêu chí có điểm hài lòng thấp nhất, là căn cứ trực tiếp để lập Kế hoạch Cải tiến Chất lượng bệnh viện cho quý/năm tới.
4. **Tường Ý kiến Hiến kế (Staff Feedback Wall):**
   - Trích xuất những tâm tư, nguyện vọng chân thành nhất của Bác sĩ, Điều dưỡng gửi Ban Giám đốc.

---

### 5.4 Lọc Số liệu theo Từng Khối Khoa Phòng

Tại thanh công cụ lọc:
- Nhấn vào menu thả xuống **"🔍 Lọc dữ liệu theo Khối"**:
  - *Tất cả các Khối / Khoa phòng toàn viện*
  - *Khối Lâm sàng Nội*
  - *Khối Lâm sàng Ngoại*
  - *Khối Khám bệnh & Cấp cứu*
  - *Khối Cận lâm sàng & Dược*
  - *Khối Phòng ban chức năng*
- Toàn bộ 4 thẻ KPI, Biểu đồ Radar, Biểu đồ Cột, Ma trận Điểm sáng/Điểm nghẽn và Bảng danh sách phản hồi sẽ **tự động tính toán lại tức thì** theo khối được chọn.

---

### 5.5 Xuất Báo cáo Excel (.xlsx) Chuẩn Bộ Y tế

- Bấm nút **"📥 Xuất Excel (.xlsx)"** trên thanh điều hướng đầu trang.
- Hệ thống tạo tự động tệp Excel với tên: `Bao_Cao_Khao_Sat_Hai_Long_NVYT_YYYY-MM-DD.xlsx`.
- **Cấu trúc 4 Sheet chuyên nghiệp:**
  1. **Sheet 1 - Báo cáo Tổng hợp:** Bảng tóm tắt chỉ số CSI, eNPS, điểm trung bình 5 nhóm tiêu chí, danh sách Top 5 Điểm sáng & Top 5 Điểm nghẽn.
  2. **Sheet 2 - Chi tiết 23 Tiêu chí:** Thống kê chi tiết điểm trung bình, tỷ lệ CSI và số lượt bình chọn theo từng mức (1, 2, 3, 4, 5 sao) của từng tiêu chí.
  3. **Sheet 3 - Dữ liệu Toàn bộ Khảo sát (Raw Data):** Dữ liệu chi tiết của 500 nhân viên y tế (đã chuẩn hóa ẩn danh) phục vụ phân tích sâu bằng SPSS, R hoặc PowerBI.
  4. **Sheet 4 - Ý kiến Hiến kế:** Danh sách trọn vẹn mọi tâm tư, đề xuất của nhân viên kèm chức danh và khối công tác.

---

### 5.6 Trình chiếu & In Mã QR Khảo sát

- Bấm nút **"📱 Mã QR Khảo Sát"** trên thanh Menu.
- Hộp thoại popup mở ra hiển thị mã QR kèm đường dẫn mạng nội bộ của bệnh viện.
- Bấm nút **"🖨️ In Poster Mã QR"** để in trực tiếp bản poster hướng dẫn dán tại bảng tin khoa phòng, phòng giao ban, phòng trực.

---

### 5.7 Tạo Dữ liệu Mô phỏng Demo & Làm Mới Dữ liệu Thật

- **Nút "⚡ Tạo 500 Dữ Liệu Mẫu":** Tạo tự động bộ 500 phiếu khảo sát giả lập với phân bổ chuẩn xác theo cơ cấu nhân sự y tế (Điều dưỡng ~40%, Bác sĩ ~28%, KTV ~12%...). Giúp Ban Giám đốc chạy thử nghiệm báo cáo trước khi phát động khảo sát thật.
- **Nút "🗑️ Làm Mới":** Xóa sạch toàn bộ dữ liệu khảo sát trong cơ sở dữ liệu để bắt đầu đợt thu thập phiếu chính thức cho bệnh viện.

---

### 5.8 Đăng xuất An toàn

- Khi hoàn thành công việc hoặc rời khỏi máy tính làm việc, bấm nút **"🔒 Đăng Xuất"** ở góc phải trên cùng thanh Menu.
- Hệ thống sẽ hủy phiên làm việc và trở về màn hình đăng nhập bảo mật.

---

## 6. CƠ CHẾ LƯU TRỮ & AN TOÀN DỮ LIỆU

1. **Vị trí lưu trữ dữ liệu:**
   - 📂 `h:\chương trình demo\Khảo sát hài lòng NV\data\surveys.json` (Cơ sở dữ liệu chính).
   - 📂 `h:\chương trình demo\Khảo sát hài lòng NV\data\surveys.backup.json` (Bản sao lưu dự phòng tự động).
2. **Cơ chế chống xung đột khi 500 người nộp cùng lúc:**
   - Sử dụng **Bộ nhớ đệm In-Memory RAM** kết hợp **Hàng đợi ghi đĩa tuần tự (Sequential Async Queue)**.
   - Mỗi phiếu nộp được cấp mã ID độc nhất tuần tự (`maxIdCounter++`), loại bỏ hoàn toàn nguy cơ trùng mã hoặc ghi đè mất phiếu.
   - Quá trình ghi file đĩa sử dụng file tạm ngẫu nhiên và cơ chế retry trên Windows, chống lỗi khóa file `EBUSY`.
3. **Cách sao lưu định kỳ (Manual Backup):**
   - Chỉ cần sao chép tệp `surveys.json` trong thư mục `data/` lưu ra ổ cứng ngoài, Google Drive hoặc USB để lưu trữ lịch sử qua từng năm.

---

## 7. XỬ LÝ SỰ CỐ THƯỜNG GẶP (FAQ)

### Q1: Nhân viên quét mã QR trên điện thoại nhưng báo "Không thể kết nối máy chủ"?
- **Nguyên nhân:** Điện thoại chưa kết nối cùng mạng Wi-Fi với máy tính chạy hệ thống, hoặc tường lửa Windows (Windows Defender Firewall) đang chặn cổng 3000.
- **Cách xử lý:**
  1. Đảm bảo điện thoại và máy tính chạy server đang dùng chung một mạng Wi-Fi nội bộ bệnh viện.
  2. Mở *Windows Defender Firewall* ➔ Chọn *Allow an app or feature through Windows Defender Firewall* ➔ Cho phép `Node.js` kết nối mạng Private/Public.

### Q2: Quên mật khẩu quản trị viên hoặc muốn đổi mật khẩu mới?
- Mở tệp [server.js](file:///h:/ch%C6%B0%C6%A1ng%20tr%C3%ACnh%20demo/Kh%E1%BA%A3o%20s%C3%A1t%20h%C3%A0i%20l%C3%B2ng%20NV/server.js) bằng Notepad hoặc VS Code.
- Tìm dòng số 16:
  ```javascript
  const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
  ```
- Đổi `'admin123'` thành mật khẩu mong muốn của bạn (ví dụ: `'BvDktw@2026'`) và khởi động lại server.

### Q3: Muốn chạy hệ thống trên một cổng khác (ví dụ cổng 80 hoặc 8080)?
- Mở PowerShell trong thư mục dự án và chạy:
  ```powershell
  $env:PORT="8080"; node server.js
  ```
- Hệ thống sẽ tự động chuyển sang cổng mới mà bạn đã chỉ định.

---
*Tài liệu được biên soạn và cập nhật tự động phục vụ Hệ thống Khảo sát Hài lòng Nhân viên Y tế.*
