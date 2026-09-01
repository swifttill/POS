import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const forbiddenDirs = new Set(['.git','node_modules','.next','dist','coverage']);
const forbiddenFiles = [/^\.env$/, /\.log$/i, /\.zip$/i];
const required = [
  'docs/FINAL_RELEASE_PARENT.txt','docs/DEPLOYMENT.md','docs/BACKUP_RESTORE.md',
  'docs/PRODUCTION_CHECKLIST.md','docs/FINAL_RELEASE_CERTIFICATION.md',
  'prisma/schema.prisma','services/windows-print-service/README.md'
];
for (const p of required) statSync(join(root,p));
function walk(dir){
  for(const name of readdirSync(dir)){
    const full=join(dir,name); const rel=relative(root,full).replaceAll('\\','/');
    const st=statSync(full);
    if(st.isDirectory()) { if(forbiddenDirs.has(name)) throw new Error(`forbidden directory: ${rel}`); walk(full); }
    else if(forbiddenFiles.some(r=>r.test(name))) throw new Error(`forbidden release file: ${rel}`);
  }
}
walk(root);
const parent=readFileSync(join(root,'docs/FINAL_RELEASE_PARENT.txt'),'utf8');
if(!parent.includes('cc9d530ab1d01c79e9d8f408e178175038451350d621e62c1743912743675652')) throw new Error('parent SHA mismatch');
const checklist=readFileSync(join(root,'docs/PRODUCTION_CHECKLIST.md'),'utf8');
if(!checklist.includes('Go-live is blocked')) throw new Error('production gate missing');
console.log('Final release source/package contract: PASS');
