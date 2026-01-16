$url = "https://repo1.maven.org/maven2/org/xerial/sqlite-jdbc/3.42.0.0/sqlite-jdbc-3.42.0.0.jar"
$output = "..\java_app\lib\sqlite-jdbc.jar"

$gsonUrl = "https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar"
$gsonOutput = "..\java_app\lib\gson-2.10.1.jar"

# Create lib directory if it doesn't exist
New-Item -ItemType Directory -Force -Path "..\java_app\lib"

Write-Host "Downloading SQLite JDBC Driver..."
Invoke-WebRequest -Uri $url -OutFile $output
Write-Host "Download Complete: $output"

Write-Host "Downloading Gson..."
Invoke-WebRequest -Uri $gsonUrl -OutFile $gsonOutput
Write-Host "Download Complete: $gsonOutput"
