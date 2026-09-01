Get-Printer | Select-Object Name,PrinterStatus,WorkOffline,DriverName,PortName | ConvertTo-Json -Compress
