import { effectivePermissions } from "../../../../lib/auth"; import { json } from "../../../../lib/json";
export async function GET(){const {session,permissions}=await effectivePermissions();if(!session)return json({ok:false,error:"UNAUTHENTICATED"},{status:401});return json({ok:true,user:{id:session.user.id,name:session.user.name},permissions:[...permissions]})}
