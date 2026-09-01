import { db } from "../../../../lib/db"; import { json } from "../../../../lib/json";
export async function GET(){const users=await db.user.findMany({where:{active:true},select:{id:true,name:true},orderBy:{name:"asc"},take:200});return json({ok:true,users})}
