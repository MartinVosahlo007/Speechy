@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"

if not exist "package.json" (
  echo Chyba: spustte uklid.bat z korene projektu Speechy.
  exit /b 1
)

set "CLEAN_TMP=0"
if /I "%~1"=="tmp" set "CLEAN_TMP=1"

echo.
echo Uklid Speechy - bezpecne mazani vygenerovanych souboru
echo (modely, hlasy a kod se nemazi)
echo.

if exist "desktop-dist\win-unpacked\Speechy.exe" (
  echo Ukoncuji bezici desktop Speechy ^(blokuje desktop-dist^) ...
  powershell -NoProfile -Command "Get-Process -Name Speechy -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '*\desktop-dist\win-unpacked\*' } | ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }"
  timeout /t 2 /nobreak >nul
)

call :remove_dir "desktop-dist"
call :remove_dir ".next"
call :remove_file "tsconfig.tsbuildinfo"

call :remove_file "dev.log"
call :remove_file "server.log"
call :remove_file "dev-up.err"
call :remove_file "dev-up.out"
call :remove_file "dev.out.log"
call :remove_file "backend-live.stderr.log"
call :remove_file "backend-live.stdout.log"
call :remove_file "frontend-live.stderr.log"
call :remove_file "frontend-live.stdout.log"

echo Mazani __pycache__ ...
set "PYCACHE_COUNT=0"
for /d /r "tts-server" %%D in (__pycache__) do (
  if exist "%%D" (
    rd /s /q "%%D" 2>nul
    if not errorlevel 1 (
      set /a PYCACHE_COUNT+=1
      echo   smazano: %%D
    )
  )
)
if !PYCACHE_COUNT! equ 0 (
  echo   zadne __pycache__ nenalezeno
)

if "!CLEAN_TMP!"=="1" (
  echo.
  echo Volitelny uklid: tts-server\tmp-jobs
  if exist "tts-server\tmp-jobs" (
    for /f "delims=" %%F in ('dir /b "tts-server\tmp-jobs" 2^>nul') do (
      if exist "tts-server\tmp-jobs\%%F\" (
        rd /s /q "tts-server\tmp-jobs\%%F" 2>nul
      ) else (
        del /q "tts-server\tmp-jobs\%%F" 2>nul
      )
      echo   smazano: tmp-jobs\%%F
    )
  ) else (
    echo   tmp-jobs neexistuje
  )
) else (
  echo.
  echo tmp-jobs: preskoceno ^(pro vycisteni spustte: uklid.bat tmp^)
)

echo.
echo Hotovo. Pro spusteni aplikace pouzijte spustit-aplikaci.bat
echo.
exit /b 0

:remove_dir
if exist "%~1\" (
  rd /s /q "%~1" 2>nul
  if exist "%~1\" (
    echo   CHYBA: nelze smazat %~1
  ) else (
    echo   smazano: %~1\
  )
) else (
  echo   preskoceno: %~1 ^(neexistuje^)
)
exit /b 0

:remove_file
if exist "%~1" (
  del /q "%~1" 2>nul
  if exist "%~1" (
    echo   CHYBA: nelze smazat %~1
  ) else (
    echo   smazano: %~1
  )
) else (
  echo   preskoceno: %~1 ^(neexistuje^)
)
exit /b 0
