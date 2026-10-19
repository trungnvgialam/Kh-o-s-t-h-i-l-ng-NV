/**
 * SCRIPT RESET MẬT KHẨU ADMIN VỀ MẶC ĐỊNH
 */
const settingsManager = require('../settingsManager');

try {
  const defaultPass = settingsManager.resetAdminPassword();
  console.log('\x1b[32m%s\x1b[0m', '   ==================================================================');
  console.log('\x1b[32m%s\x1b[0m', '   ✅ [THÀNH CÔNG] ĐÃ KHÔI PHỤC MẬT KHẨU ADMIN VỀ MẶC ĐỊNH BAN ĐẦU!');
  console.log('\x1b[32m%s\x1b[0m', '   ==================================================================');
  console.log('');
  console.log('   👤 Tên đăng nhập: \x1b[33madmin\x1b[0m');
  console.log('   🔒 Mật khẩu mới:  \x1b[33m' + defaultPass + '\x1b[0m');
  console.log('');
  console.log('   💡 Bây giờ bạn có thể đăng nhập vào hệ thống tại:');
  console.log('      http://localhost:3000/login.html');
  console.log('   Sau khi đăng nhập, bạn có thể bấm nút "🔑 Đổi Mật Khẩu" để đổi mật khẩu.');
  console.log('');
} catch (err) {
  console.error('\x1b[31m%s\x1b[0m', '   ❌ Lỗi khi khôi phục mật khẩu: ' + err.message);
  process.exit(1);
}
