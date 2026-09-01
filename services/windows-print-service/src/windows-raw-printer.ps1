param([Parameter(Mandatory=$true)][string]$PrinterName,[Parameter(Mandatory=$true)][string]$FilePath)
# SwiftTill Windows RAW spooler bridge. Sends already-rendered ESC/POS bytes to an installed Windows USB printer.
$source=@'
using System;
using System.IO;
using System.Runtime.InteropServices;
public static class SwiftTillRawPrinter {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public class DOCINFO { public string pDocName="SwiftTill"; public string pOutputFile=null; public string pDataType="RAW"; }
 [DllImport("winspool.drv", SetLastError=true, CharSet=CharSet.Unicode)] static extern bool OpenPrinter(string pPrinterName,out IntPtr phPrinter,IntPtr pDefault);
 [DllImport("winspool.drv", SetLastError=true)] static extern bool ClosePrinter(IntPtr hPrinter);
 [DllImport("winspool.drv", SetLastError=true, CharSet=CharSet.Unicode)] static extern int StartDocPrinter(IntPtr hPrinter,int Level,[In] DOCINFO pDocInfo);
 [DllImport("winspool.drv", SetLastError=true)] static extern bool EndDocPrinter(IntPtr hPrinter);
 [DllImport("winspool.drv", SetLastError=true)] static extern bool StartPagePrinter(IntPtr hPrinter);
 [DllImport("winspool.drv", SetLastError=true)] static extern bool EndPagePrinter(IntPtr hPrinter);
 [DllImport("winspool.drv", SetLastError=true)] static extern bool WritePrinter(IntPtr hPrinter,IntPtr pBytes,int dwCount,out int dwWritten);
 public static void Send(string printer, byte[] data) { IntPtr h; if(!OpenPrinter(printer,out h,IntPtr.Zero)) throw new System.ComponentModel.Win32Exception(); try { var d=new DOCINFO(); if(StartDocPrinter(h,1,d)==0) throw new System.ComponentModel.Win32Exception(); try { if(!StartPagePrinter(h)) throw new System.ComponentModel.Win32Exception(); IntPtr p=Marshal.AllocCoTaskMem(data.Length); try { Marshal.Copy(data,0,p,data.Length); int written; if(!WritePrinter(h,p,data.Length,out written)||written!=data.Length) throw new IOException("RAW spool incomplete"); } finally { Marshal.FreeCoTaskMem(p); EndPagePrinter(h); } } finally { EndDocPrinter(h); } } finally { ClosePrinter(h); } }
}
'@
Add-Type -TypeDefinition $source -Language CSharp
[SwiftTillRawPrinter]::Send($PrinterName,[IO.File]::ReadAllBytes($FilePath))
