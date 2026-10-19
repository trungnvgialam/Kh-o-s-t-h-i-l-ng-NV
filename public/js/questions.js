/**
 * BỘ CÂU HỎI KHẢO SÁT SỰ HÀI LÒNG NHÂN VIÊN Y TẾ
 * Xây dựng dựa trên Hướng dẫn và Bộ tiêu chí chất lượng bệnh viện của Bộ Y tế Việt Nam
 */

const SURVEY_CONFIG = {
  title: "Khảo Sát Sự Hài Lòng Nhân Viên Y Tế",
  targetRespondents: 350,
  organization: "Cơ Sở Y Tế / Bệnh Viện",
  description: "Khảo sát này được thực hiện nhằm ghi nhận ý kiến khách quan của toàn thể cán bộ, nhân viên y tế về môi trường làm việc, chế độ đãi ngộ, quan hệ đồng nghiệp và công tác quản lý. Kết quả là căn cứ quan trọng để Ban Giám đốc hoạch định chính sách cải tiến, nâng cao đời sống và sự gắn kết của nhân viên.",
  confidentialityNote: "Khảo sát hoàn toàn ẨN DANH. Mọi thông tin phản hồi chỉ sử dụng cho mục đích phân tích thống kê tổng hợp và nâng cao chất lượng bệnh viện.",
  
  demographics: [
    {
      id: "department",
      label: "Khối / Đơn vị công tác",
      type: "select",
      required: true,
      options: [
        { value: "noi", label: "Khối Lâm sàng Nội (Nội tổng hợp, Tim mạch, Hô hấp, Tiêu hóa, Nhi...)" },
        { value: "ngoai", label: "Khối Lâm sàng Ngoại (Ngoại tổng hợp, Phẫu thuật - GMHS, Sản, Chấn thương...)" },
        { value: "capcuu", label: "Khối Khám bệnh & Cấp cứu (Khoa Khám bệnh, Cấp cứu 115, Hồi sức tích cực - ICU)" },
        { value: "canlamsang", label: "Khối Cận lâm sàng (Xét nghiệm, CĐHA, Thăm dò chức năng, Dược, GPB)" },
        { value: "hanhchinh", label: "Khối Phòng ban chức năng (Kế hoạch tổng hợp, TCCB, Tài chính kế toán, QLCL, HCTQ)" }
      ]
    },
    {
      id: "role",
      label: "Vị trí chức danh chuyên môn",
      type: "select",
      required: true,
      options: [
        { value: "bacsi", label: "Bác sĩ / Bác sĩ chuyên khoa" },
        { value: "dieuduong", label: "Điều dưỡng / Hộ sinh" },
        { value: "kythuatvien", label: "Kỹ thuật viên y tế" },
        { value: "duocsi", label: "Dược sĩ" },
        { value: "quanly_hanhchinh", label: "Cán bộ quản lý / Nhân viên hành chính" },
        { value: "hotro", label: "Hộ lý / Y công / Nhân viên hỗ trợ" }
      ]
    },
    {
      id: "experience",
      label: "Thâm niên công tác tại bệnh viện",
      type: "select",
      required: true,
      options: [
        { value: "duoi2", label: "Dưới 2 năm" },
        { value: "tu2den5", label: "Từ 2 đến 5 năm" },
        { value: "tu5den10", label: "Từ 5 đến 10 năm" },
        { value: "tren10", label: "Trên 10 năm" }
      ]
    },
    {
      id: "gender",
      label: "Giới tính",
      type: "radio",
      required: true,
      options: [
        { value: "nam", label: "Nam" },
        { value: "nu", label: "Nữ" },
        { value: "khac", label: "Không muốn nêu" }
      ]
    },
    {
      id: "degree",
      label: "Trình độ đào tạo cao nhất",
      type: "select",
      required: true,
      options: [
        { value: "trungcap_caodang", label: "Trung cấp / Cao đẳng" },
        { value: "daihoc", label: "Đại học" },
        { value: "saudaihoc", label: "Sau đại học (ThS, CKI, CKII, TS)" }
      ]
    }
  ],

  likertScale: [
    { value: 1, label: "Rất không hài lòng", shortLabel: "Rất KHL", color: "#ef4444", emoji: "😡" },
    { value: 2, label: "Không hài lòng", shortLabel: "Không HL", color: "#f97316", emoji: "🙁" },
    { value: 3, label: "Bình thường / Trung lập", shortLabel: "Bình thường", color: "#eab308", emoji: "😐" },
    { value: 4, label: "Hài lòng", shortLabel: "Hài lòng", color: "#10b981", emoji: "🙂" },
    { value: 5, label: "Rất hài lòng", shortLabel: "Rất HL", color: "#06b6d4", emoji: "😍" }
  ],

  groups: [
    {
      id: "groupA",
      code: "A",
      name: "Môi trường làm việc & Cơ sở vật chất",
      desc: "Đánh giá điều kiện vật chất, an toàn lao động và công cụ hỗ trợ công tác chuyên môn",
      icon: "🏥",
      questions: [
        { id: "a1", text: "Điều kiện vi khí hậu, ánh sáng, nhiệt độ, thông gió và vệ sinh tại nơi làm việc" },
        { id: "a2", text: "Trang thiết bị y tế, máy móc và vật tư tiêu hao phục vụ công tác khám chữa bệnh" },
        { id: "a3", text: "Phương tiện bảo hộ lao động, phòng chống lây nhiễm và các biện pháp bảo đảm an toàn" },
        { id: "a4", text: "Khu vực nghỉ ngơi, phòng trực đêm, nhà ăn và các tiện ích sinh hoạt của nhân viên" },
        { id: "a5", text: "Hệ thống công nghệ thông tin và phần mềm quản lý bệnh viện (HIS/EMR/LIS) vận hành hỗ trợ tốt" }
      ]
    },
    {
      id: "groupB",
      code: "B",
      name: "Lãnh đạo, Quản lý & Văn hóa ứng xử",
      desc: "Đánh giá năng lực điều hành, sự thấu hiểu và tính công bằng của lãnh đạo các cấp",
      icon: "👔",
      questions: [
        { id: "b1", text: "Sự lắng nghe, tiếp thu ý kiến và tôn trọng nhân viên của Lãnh đạo Khoa và Ban Giám đốc" },
        { id: "b2", text: "Tính công bằng, khách quan và minh bạch trong phân công nhiệm vụ và đánh giá thi đua" },
        { id: "b3", text: "Sự động viên, khen thưởng và hỗ trợ kịp thời khi nhân viên gặp khó khăn hoặc áp lực nghề nghiệp" },
        { id: "b4", text: "Tầm nhìn định hướng phát triển rõ ràng của bệnh viện và xây dựng môi trường làm việc cởi mở" },
        { id: "b5", text: "Văn hóa quản lý an toàn, tinh thần xây dựng và không đổ lỗi khi xử lý sự cố y khoa" }
      ]
    },
    {
      id: "groupC",
      code: "C",
      name: "Tiền lương, Thu nhập & Chế độ đãi ngộ",
      desc: "Đánh giá sự thỏa đáng của thu nhập, phụ cấp và các chính sách phúc lợi nhân viên",
      icon: "💰",
      questions: [
        { id: "c1", text: "Tổng thu nhập (lương, thưởng, thu nhập tăng thêm) tương xứng với khối lượng và áp lực công việc" },
        { id: "c2", text: "Chế độ phụ cấp đặc thù ngành y (trực đêm, phẫu thuật, thủ thuật, độc hại) chi trả kịp thời, thỏa đáng" },
        { id: "c3", text: "Chính sách phúc lợi chăm lo cho nhân viên (khám sức khỏe định kỳ, bảo hiểm bổ sung, du lịch, hiếu hỉ)" },
        { id: "c4", text: "Bố trí ca trực, thời gian làm việc và chế độ nghỉ bù đảm bảo sức khỏe và tái tạo sức lao động" },
        { id: "c5", text: "Sự yên tâm và ổn định về tài chính của bản thân và gia đình khi gắn bó làm việc tại bệnh viện" }
      ]
    },
    {
      id: "groupD",
      code: "D",
      name: "Quan hệ đồng nghiệp & Tinh thần đoàn kết",
      desc: "Đánh giá sự phối hợp chuyên môn, tinh thần hỗ trợ và sự gắn kết giữa các thành viên",
      icon: "🤝",
      questions: [
        { id: "d1", text: "Sự hợp tác, tinh thần tương trợ và thân thiện giữa các đồng nghiệp trong cùng khoa/phòng" },
        { id: "d2", text: "Mối liên hệ phối hợp nhịp nhàng, hiệu quả và hỗ trợ chuyên môn giữa các khoa/phòng khác nhau" },
        { id: "d3", text: "Tinh thần chia sẻ kinh nghiệm chuyên môn, hướng dẫn tận tình của thế hệ đi trước cho nhân viên trẻ" },
        { id: "d4", text: "Không khí làm việc văn minh, tôn trọng lẫn nhau, không có sự phân biệt đối xử hay bè phái" }
      ]
    },
    {
      id: "groupE",
      code: "E",
      name: "Đào tạo, Phát triển nghề nghiệp & Thăng tiến",
      desc: "Đánh giá cơ hội học tập nâng cao tay nghề, phát huy năng lực và lộ trình thăng tiến",
      icon: "🎓",
      questions: [
        { id: "e1", text: "Bệnh viện tạo điều kiện thuận lợi tham gia đào tạo liên tục (CME), học chuyên khoa và nâng cao tay nghề" },
        { id: "e2", text: "Cơ hội tiếp cận kỹ thuật mới, kỹ thuật chuyên sâu và được tạo điều kiện phát huy sở trường chuyên môn" },
        { id: "e3", text: "Quy trình quy hoạch cán bộ, bổ nhiệm vị trí quản lý và lộ trình thăng tiến công bằng, minh bạch" },
        { id: "e4", text: "Bệnh viện khuyến khích, hỗ trợ kinh phí và thời gian cho hoạt động nghiên cứu khoa học, cải tiến chất lượng" }
      ]
    }
  ],

  overallQuestions: [
    {
      id: "overall_score",
      label: "Đánh giá mức độ hài lòng chung đối với Bệnh viện hiện nay",
      desc: "Chấm điểm trên thang điểm từ 1 (Rất thất vọng) đến 10 (Tuyệt đối hài lòng)",
      type: "scale10",
      min: 1,
      max: 10,
      minLabel: "1 - Rất thất vọng",
      maxLabel: "10 - Tuyệt đối hài lòng",
      required: true
    },
    {
      id: "commitment",
      label: "Bạn có dự định tiếp tục gắn bó làm việc tại bệnh viện trong 3 - 5 năm tới?",
      type: "radio",
      required: true,
      options: [
        { value: "chac_chan", label: "Chắc chắn sẽ tiếp tục gắn bó lâu dài", icon: "🌟" },
        { value: "co_the", label: "Có thể sẽ gắn bó nếu điều kiện tiếp tục cải thiện", icon: "🌱" },
        { value: "phan_van", label: "Đang phân vân, chưa có định hướng rõ ràng", icon: "⚖️" },
        { value: "du_dinh_chuyen", label: "Đang tìm kiếm cơ hội hoặc có dự định chuyển nơi khác", icon: "🚪" }
      ]
    },
    {
      id: "enps",
      label: "Mức độ sẵn lòng giới thiệu Bệnh viện là nơi làm việc tốt cho đồng nghiệp / người thân trong ngành y",
      desc: "Chấm điểm từ 0 (Hoàn toàn không muốn giới thiệu) đến 10 (Chắc chắn sẽ nhiệt tình giới thiệu)",
      type: "scale10",
      min: 0,
      max: 10,
      minLabel: "0 - Hoàn toàn không",
      maxLabel: "10 - Rất nhiệt tình",
      required: true
    },
    {
      id: "suggestions",
      label: "Ý kiến đóng góp, tâm tư hoặc đề xuất giải pháp cụ thể gửi tới Ban Giám đốc",
      placeholder: "Ví dụ: Kiến nghị về trang thiết bị tại khoa, cải tiến chế độ phụ cấp trực gác, cải thiện nhà ăn/phòng nghỉ, nâng cấp phần mềm HIS...",
      type: "textarea",
      required: false
    }
  ]
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SURVEY_CONFIG;
}
if (typeof window !== 'undefined') {
  window.SURVEY_CONFIG = SURVEY_CONFIG;
}
