@echo off
title Mo Cong 3000 Cho Dien Thoai Quet QR
color 0A

:: Kiem tra quyen Administrator
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ======================================================================
    echo   [DANG YEU CAU QUYEN ADMINISTRATOR]
    echo   Vui long bam "YES" tren bang thong bao Windows hien len...
    echo ======================================================================
    powershell -NoProfile -Command "Start-Process cmd -ArgumentList '/c netsh advfirewall firewall delete rule name=\"KhaoSatHaiLongNV_Port3000\" & netsh advfirewall firewall add rule name=\"KhaoSatHaiLongNV_Port3000\" dir=in action=allow protocol=TCP localport=3000 profile=any & powershell -Command \"Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private\" & echo. & echo ============================================================ & echo   [THANH CONG] DA MO CONG 3000 VA CHUYEN MANG PRIVATE XONG! & echo   Dien thoai cung Wi-Fi da co the quet ma QR ngay bay gio! & echo ============================================================ & pause' -Verb RunAs"
    exit /b
)

:: Neu nguoi dung da chu dong chuot phai chon "Run as administrator":
echo ======================================================================
echo   DANG MO CONG 3000 TREN TUONG LUA WINDOWS...
echo ======================================================================
netsh advfirewall firewall delete rule name="KhaoSatHaiLongNV_Port3000" >nul 2>&1
netsh advfirewall firewall add rule name="KhaoSatHaiLongNV_Port3000" dir=in action=allow protocol=TCP localport=3000 profile=any
powershell -NoProfile -Command "Get-NetConnectionProfile | Set-NetConnectionProfile -NetworkCategory Private"

echo.
echo ======================================================================
echo   [THANH CONG] DA MO CONG 3000 VA CHUYEN MANG PRIVATE XONG!
echo   Dien thoai cung Wi-Fi da co the quet ma QR ngay bay gio!
echo ======================================================================
echo.
pause
