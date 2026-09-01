import { requirePermission } from "../../../lib/auth"; import { db } from "../../../lib/db"; import { apiError } from "../../../lib/api-error"; import { json } from "../../../lib/json";
export async function GET(){try{await requirePermission("pos.access");const company=await db.company.findFirst();return json({ok:true,company})}catch(e){return apiError(e)}}
