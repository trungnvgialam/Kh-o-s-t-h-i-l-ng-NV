@echo off
chcp 65001 >nul
title KHOI PHUC MAT KHAU QUAN TRI VIEN
color 0A

echo ======================================================================
echo   HE THONG KHAO SAT HAI LONG NHAN VIEN Y TE
echo   CONG CU KHOI PHUC MAT KHAU QUAN TRI (ADMIN PASSWORD RESET)
echo ======================================================================
echo.

node scripts/resetPassword.js

echo.
pause
