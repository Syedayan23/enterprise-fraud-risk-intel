$domain = "Enterprise-Risk-Analytics"
$entry = "127.0.0.1       $domain"
$hostsInfo = "$env:windir\system32\drivers\etc\hosts"

if (!([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "Requesting Administrator privileges to update hosts file..." -ForegroundColor Yellow
    Start-Process powershell.exe -Verb RunAs -ArgumentList "-File", "$PSCommandPath"
    exit
}

try {
    Add-Content -Path $hostsInfo -Value $entry
    Write-Host "Success! Added '$domain' to hosts file." -ForegroundColor Green
    Write-Host "You can now access: http://$domain:3000/Dashboard" -ForegroundColor Cyan
    Read-Host -Prompt "Press Enter to exit"
} catch {
    Write-Error "Failed to update hosts file. Please try running as Administrator manually."
    Read-Host -Prompt "Press Enter to exit"
}
