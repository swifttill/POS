import { cookies } from "next/headers"; import { revokeCurrentSession,SESSION_COOKIE } from "../../../../lib/auth"; import { json } from "../../../../lib/json";
export async function POST(){await revokeCurrentSession();(await cookies()).delete(SESSION_COOKIE);return json({ok:true})}
