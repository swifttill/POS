import fs from 'node:fs';

const css=fs.readFileSync('apps/web/app/globals.css','utf8');
const pos=fs.readFileSync('apps/web/app/pos/page.tsx','utf8');
const root=fs.readFileSync('apps/web/app/page.tsx','utf8');
const menu=fs.readFileSync('apps/web/app/admin/menu/page.tsx','utf8');
const adminLayout=fs.readFileSync('apps/web/app/admin/layout.tsx','utf8');
const nav=fs.readFileSync('apps/web/app/admin/components/AdminNavigation.tsx','utf8');
const checks=[
 ['shared admin shell', adminLayout.includes('AdminNavigation') && css.includes('.adminAppShell')],
 ['admin primary action styled', css.includes('.primary-action')],
 ['ops header styled', css.includes('.ops-header')],
 ['printer workspace classes styled', css.includes('.ops-workspace') && css.includes('.ops-toolbar') && css.includes('.ops-list') && css.includes('.ops-detail')],
 ['payment foundational classes styled', css.includes('.adminPage') && css.includes('.pageHeader') && css.includes('.settingsCard')],
 ['advanced filters are actual CSS grid', css.includes('.report-filters.advanced{display:grid')],
 ['disabled pay has disabled visual/interaction state', css.includes('.payButton.disabled') && css.includes('pointer-events:none')],
 ['F2 new-order dirty guard', pos.includes('newOrderConfirmOpen') && pos.includes('isDirty') && pos.includes('requestNewOrder')],
 ['shortcuts ignore typing targets', pos.includes('target.tagName === "INPUT"') && pos.includes('target.isContentEditable')],
 ['F9 checkout shortcut guarded by cart', pos.includes('event.key === "F9" && cart.length > 0')],
 ['mobile/tablet POS clipping fix', css.includes('@media(max-width:1180px){.posShell{height:auto') && css.includes('.posWorkspace{height:auto}')],
 ['root routes to login instead of stale demo UI', root.includes('redirect("/login")')],
 ['menu is part of shared admin navigation', nav.includes('/admin/menu')],
 ['menu screen contains no previous sample product data', !menu.includes('Classic Smash Burger') && !menu.includes('Margherita Pizza') && menu.includes('No menu items loaded')],
 ['permission touch rows improved', css.includes('.permission-detail{min-height:48px')],
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'}: ${name}`); if(!ok) failed++;}
if(failed) process.exit(1);
console.log(`UI polish verification: PASS (${checks.length} checks)`);
