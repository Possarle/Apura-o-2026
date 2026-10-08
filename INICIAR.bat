@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Instale Node.js 24 para iniciar o servidor.
 pause
 exit /b 1
)
echo Abra http://localhost:8080 no navegador.
echo Mantenha esta janela aberta para atualizar os dados.
node server.js
pause
