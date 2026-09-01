import { db } from "../../../lib/db"; import { json } from "../../../lib/json";
export async function GET(){try{await db.$queryRaw`SELECT 1`;return json({ok:true,database:"connected",service:"swifttill"})}catch{return json({ok:false,database:"unavailable",service:"swifttill"},{status:503})}}
