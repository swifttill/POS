import { json } from "./json";
export function apiError(error:unknown){const e=error as {status?:number;message?:string};const status=e?.status&&[400,401,403,404,409,422].includes(e.status)?e.status:500;return json({ok:false,error:status===500?"INTERNAL_ERROR":e.message??"REQUEST_FAILED"},{status})}
