@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   云助手真实后端 (一路狂飙 三倍/抢红包)
echo   访问地址: http://localhost:8000
echo   启动前端请另开终端: cd yun-assistant-clone ^&^& npm run dev
echo ============================================
python app.py
pause
