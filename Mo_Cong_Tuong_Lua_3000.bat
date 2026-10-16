@echo off
chcp 65001 >nul
title Cấu hình Tường lửa Windows - Mở cổng 3000 Khảo sát Y tế
color 0A

echo ======================================================================
echo   🏥 HỆ THỐNG KHẢO SÁT SỰ HÀI LÒNG NHÂN VIÊN Y TẾ (500 NV)
echo   🔒 TIỆN ÍCH TỰ ĐỘNG MỞ CỔNG TƯỜNG LỬA (PORT 3000) CHO ĐIỆN THOẠI
echo ======================================================================
echo.
echo Đang kiểm tra quyền Quản trị viên (Administrator)...

net session >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo [CẢNH BÁO] Bạn chưa chạy tệp này với quyền Administrator!
    echo.
    echo HƯỚNG DẪN:
    echo 1. Nhấp CHUỘT PHẢI vào tệp "Mo_Cong_Tuong_Lua_3000.bat"
    echo 2. Chọn dòng "Run as administrator" (Chạy dưới quyền Quản trị viên)
    echo.
    echo ======================================================================
    pause
    exit /b 1
)

echo [OK] Đã xác nhận quyền Administrator.
echo Đang cấu hình quy tắc cho phép điện thoại truy cập qua Wi-Fi...
echo.

:: Xóa quy tắc cũ nếu có
netsh advfirewall firewall delete rule name="KhaoSatHaiLongNV_Port3000" >nul 2>&1

:: Thêm quy tắc Inbound mới cho cổng 3000
netsh advfirewall firewall add rule name="KhaoSatHaiLongNV_Port3000" dir=in action=allow protocol=TCP localport=3000 profile=any description="Cho phep dien thoai quet ma QR truy cap he thong khao sat 500 NV"

if %errorLevel% equ 0 (
    color 0A
    echo.
    echo ======================================================================
    echo   ✅ THÀNH CÔNG RỰC RỠ!
    echo   Đã mở cổng 3000 trong Windows Defender Firewall.
    echo.
    echo   BÂY GIỜ:
    echo   1. Đảm bảo điện thoại kết nối cùng mạng Wi-Fi với máy tính này.
    echo   2. Dùng camera điện thoại hoặc Zalo quét lại mã QR trên màn hình.
    echo   3. Trang khảo sát sẽ tải ngay tức thì!
    echo ======================================================================
) else (
    color 0C
    echo.
    echo [LỖI] Không thể thêm quy tắc vào tường lửa. Mã lỗi: %errorLevel%
)

echo.
pause
