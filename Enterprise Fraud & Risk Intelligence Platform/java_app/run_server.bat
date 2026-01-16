@echo off
if not exist "bin" mkdir bin
echo Compiling...
javac -cp "lib/*;src" -d bin src/DatabaseManager.java src/RiskApiServer.java
if %errorlevel% neq 0 exit /b %errorlevel%

echo Starting Server...
java -cp "lib/*;bin" src.RiskApiServer
