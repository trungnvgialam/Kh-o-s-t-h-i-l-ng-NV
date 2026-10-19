@echo off
chcp 65001 >nul
title HỆ THỐNG KHẢO SÁT HÀI LÒNG NHÂN VIÊN Y TẾ (500 NV)
color 0A

echo ======================================================================
echo   🏥 HỆ THỐNG KHẢO SÁT HÀI LÒNG NHÂN VIÊN Y TẾ (QUY MÔ 500 NV)
echo   🔒 ĐANG KIỂM TRA MÔI TRƯỜNG & KHỞI CHẠY MÁY CHỦ...
echo ======================================================================
echo.

:: 1. Kiểm tra Node.js đã cài chưa
where node >nul 2>&1
if %errorLevel% neq 0 (
    color 0C
    echo [LỖI] Máy tính chưa cài đặt Node.js!
    echo Vui lòng tải và cài đặt Node.js từ https://nodejs.org trước khi chạy.
    echo.
    pause
    exit /b
)

:: 2. Tự động mở tường lửa Windows nếu chưa mở
net session >nul 2>&1
if %errorLevel% equ 0 (
    netsh advfirewall firewall delete rule name="KhaoSatHaiLongNV_Port3000" >nul 2>&1
    netsh advfirewall firewall add rule name="KhaoSatHaiLongNV_Port3000" dir=in action=allow protocol=TCP localport=3000 profile=any >nul 2>&1
    echo   [OK] Đã kiểm tra và mở cổng tường lửa 3000 thành công!
) else (
    echo   [GHI CHÚ] Nếu điện thoại không kết nối được, hãy nhấp chuột phải
    echo             vào file 'Mo_Cong_Tuong_Lua_3000.bat' chọn 'Run as administrator'.
)

echo.
echo ======================================================================
echo   🚀 ĐANG KHỞI CHẠY MÁY CHỦ KHẢO SÁT TẠI CỔNG 3000...
echo ======================================================================

:: 3. Tự động mở trình duyệt vào trang quản trị sau 2 giây
start "" powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://localhost:3000/login.html'"

:: 4. Khởi động máy chủ Node.js
node server.js

echo.
echo ======================================================================
echo   ⚠️ Máy chủ đã dừng lại. Nhấn phím bất kỳ để thoát.
echo ======================================================================
pause >nul
