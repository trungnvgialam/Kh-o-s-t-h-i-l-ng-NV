@echo off
chcp 65001 >nul
title Mở Cổng 3000 Khảo Sát Y Tế
color 0A

:: Kiểm tra quyền Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ======================================================================
    echo   [CẦN QUYỀN ADMINISTRATOR ĐỂ MỞ TƯỜNG LỬA]
    echo.
    echo   Đang tự động yêu cầu quyền Administrator từ Windows...
    echo   Vui lòng nhấn [YES] khi bảng thông báo Windows hiện lên.
    echo ======================================================================
    powershell -NoProfile -Command "Start-Process cmd -ArgumentList '/c netsh advfirewall firewall add rule name=\"\"KhaoSatHaiLongNV_Port3000\"\" dir=in action=allow protocol=TCP localport=3000 profile=any & echo. & echo ============================================================ & echo   [THANH CONG] DA MO CONG 3000 TRONG TUONG LUA WINDOWS! & echo   Dien thoai da co the quet ma QR truy cap ngay bay gio! & echo ============================================================ & echo. & pause' -Verb RunAs"
    exit /b
)

:: Nếu người dùng chuột phải chọn "Run as administrator"
echo ======================================================================
echo   🏥 HỆ THỐNG KHẢO SÁT HÀI LÒNG NHÂN VIÊN Y TẾ (500 NV)
echo   🔒 ĐANG MỞ CỔNG 3000 TRÊN TƯỜNG LỬA WINDOWS...
echo ======================================================================
echo.

netsh advfirewall firewall delete rule name="KhaoSatHaiLongNV_Port3000" >nul 2>&1
netsh advfirewall firewall add rule name="KhaoSatHaiLongNV_Port3000" dir=in action=allow protocol=TCP localport=3000 profile=any

echo.
echo ======================================================================
echo   ✅ [THÀNH CÔNG] ĐÃ MỞ CỔNG 3000 TRONG TƯỜNG LỬA WINDOWS!
echo ======================================================================
echo   - Tường lửa đã cho phép điện thoại kết nối vào cổng 3000.
echo   - Bây giờ bạn có thể dùng camera điện thoại hoặc Zalo quét mã QR.
echo   - Trang web khảo sát sẽ mở ra ngay lập tức trên điện thoại!
echo ======================================================================
echo.
pause
