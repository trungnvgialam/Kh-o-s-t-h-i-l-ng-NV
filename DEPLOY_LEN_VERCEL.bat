@echo off
chcp 65001 >nul
title TRIỂN KHAI KHẢO SÁT LÊN VERCEL (MIỄN PHÍ VĨNH VIỄN)
color 0B

echo ======================================================================
echo   ☁️ TRIỂN KHAI HỆ THỐNG KHẢO SÁT Y TẾ LÊN ĐÁM MÂY VERCEL (ONLINE 24/7)
echo ======================================================================
echo.
echo   Lợi ích khi đưa lên Vercel:
echo   - Có đường link HTTPS bảo mật vĩnh viễn (Quét bằng 4G/5G/Wi-Fi bất kỳ).
echo   - Tắt máy tính ở cơ quan thì điện thoại của nhân viên vẫn làm bài bình thường.
echo   - Không bao giờ bị chặn mạng nội bộ.
echo.
echo ======================================================================
echo   Đang tiến hành kết nối Vercel...
echo   (Nếu là lần đầu chạy, trình duyệt sẽ mở để bạn đăng nhập tài khoản Vercel/Google)
echo ======================================================================
echo.

cmd /c npx -y vercel

echo.
echo ======================================================================
echo   🎉 HOÀN TẤT TRIỂN KHAI LÊN VERCEL!
echo ======================================================================
echo   - Sao chép đường link vừa nhận được (dạng: https://...vercel.app)
echo   - Bạn có thể in mã QR của link này để dán tại khoa phòng vĩnh viễn!
echo ======================================================================
echo.
pause
