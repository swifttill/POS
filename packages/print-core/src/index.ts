export type PaperWidth = 58 | 80;
export type PrintDocumentKind = "RECEIPT" | "REPORT" | "TEST_PAGE";
export type PrinterHealth = "READY" | "OFFLINE" | "ERROR" | "UNKNOWN";
export interface PrinterTarget { id:string; systemName:string; displayName:string; paperWidth:PaperWidth; active:boolean }
export interface PrintRequest { jobId:string; printer:PrinterTarget; kind:PrintDocumentKind; text:string; copies:number; cut:boolean; openDrawerAfter?:boolean }
export interface DispatchResult { jobId:string; sent:boolean; attempts:number; errorCode?:string }
export const ESC = 0x1b, GS = 0x1d;
const bytes=(...n:number[])=>Uint8Array.from(n);
export const INIT=bytes(ESC,0x40);
export const CUT=bytes(GS,0x56,0x00);
export const DRAWER_KICK=bytes(ESC,0x70,0x00,0x19,0xfa);
export function validateTarget(p:PrinterTarget):void { if(!p.id.trim()||!p.systemName.trim()||!p.displayName.trim()) throw new Error("PRINTER_IDENTITY_REQUIRED"); if(p.paperWidth!==58&&p.paperWidth!==80) throw new Error("PAPER_WIDTH_UNSUPPORTED"); if(!p.active) throw new Error("PRINTER_DISABLED"); }
export function validatePrintRequest(r:PrintRequest):void { validateTarget(r.printer); if(!r.jobId.trim()) throw new Error("PRINT_JOB_ID_REQUIRED"); if(!r.text.trim()) throw new Error("PRINT_CONTENT_REQUIRED"); if(!Number.isInteger(r.copies)||r.copies<1||r.copies>10) throw new Error("PRINT_COPIES_INVALID"); if(r.text.includes("\u0000")) throw new Error("PRINT_CONTENT_BINARY_NULL"); }
function concat(parts:Uint8Array[]):Uint8Array { const n=parts.reduce((x,p)=>x+p.length,0); const out=new Uint8Array(n); let o=0; for(const p of parts){out.set(p,o);o+=p.length} return out; }
export function encodeEscPosText(text:string,{cut=true,drawer=false}:{cut?:boolean;drawer?:boolean}={}):Uint8Array { if(text.includes("\u0000")) throw new Error("PRINT_CONTENT_BINARY_NULL"); const body=new TextEncoder().encode(text.replace(/\r\n/g,"\n")+"\n\n\n"); return concat([INIT,body,cut?CUT:new Uint8Array(),drawer?DRAWER_KICK:new Uint8Array()]); }
export function drawerPulse():Uint8Array { return DRAWER_KICK.slice(); }
export interface RawUsbTransport { sendRaw(systemPrinterName:string,payload:Uint8Array):Promise<void> }
export async function dispatchPrint(request:PrintRequest,transport:RawUsbTransport,maxAttempts=3):Promise<DispatchResult>{
 validatePrintRequest(request); if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>5) throw new Error("PRINT_RETRY_POLICY_INVALID");
 const payload=encodeEscPosText(request.text,{cut:request.cut,drawer:request.openDrawerAfter===true}); let last="PRINT_TRANSPORT_FAILED";
 for(let attempt=1;attempt<=maxAttempts;attempt++){ try { for(let c=0;c<request.copies;c++) await transport.sendRaw(request.printer.systemName,payload); return {jobId:request.jobId,sent:true,attempts:attempt}; } catch(e){ last=e instanceof Error&&e.message?e.message:"PRINT_TRANSPORT_FAILED"; } }
 return {jobId:request.jobId,sent:false,attempts:maxAttempts,errorCode:last};
}
export function assertLocalServiceRequest(host:string,token:string|undefined,expectedToken:string):void { const h=host.split(":")[0].toLowerCase(); if(h!=="127.0.0.1"&&h!=="localhost"&&h!=="::1") throw new Error("LOCALHOST_ONLY"); if(!expectedToken||token!==expectedToken) throw new Error("PRINT_SERVICE_UNAUTHORIZED"); }
export function normalizeWindowsPrinterList(rows:Array<{Name?:string;PrinterStatus?:number;WorkOffline?:boolean}>):Array<{systemName:string;health:PrinterHealth}>{ return rows.filter(x=>x.Name?.trim()).map(x=>({systemName:x.Name!.trim(),health:x.WorkOffline?"OFFLINE":x.PrinterStatus===3?"READY":x.PrinterStatus===7?"OFFLINE":"UNKNOWN"})); }
