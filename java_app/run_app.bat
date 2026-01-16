@echo off
echo Compiling Java Application...
title Fraud Platform - Java App

:: Ensure we are in the correct directory (java_app)
cd /d "%~dp0"

if not exist "lib\sqlite-jdbc.jar" (
    echo Error: sqlite-jdbc.jar not found in lib folder.
    echo Please run download_lib.ps1 first.
    pause
    exit /b
)

:: Compile
javac -d bin -cp "lib/sqlite-jdbc.jar" src/*.java
if %errorlevel% neq 0 (
    echo Compilation Failed!
    pause
    exit /b
)

echo Running Application...
:: Run
java -cp "bin;lib/sqlite-jdbc.jar" src.Main

pause
