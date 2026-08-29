import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.CS);
const cols = await sql`select column_name from information_schema.columns where table_name='Order' order by ordinal_position`;
console.log('Order columns:', cols.map(c => c.column_name).join(', '));
const hasNumber = cols.some(c => c.column_name === 'number');
console.log('has number:', hasNumber);
