import test from "node:test";import assert from "node:assert/strict";import {REPORT_PRESETS,csvExport,runCustomReport,validateDefinition,type FactRow} from "../src/index.ts";
const facts:FactRow[]=[
{businessDate:"2026-09-01",hour:12,orderId:"o1",orderType:"DINE_IN",orderStatus:"CLOSED",item:"Burger",category:"Food",cashierUserId:"u1",waiterUserId:"u2",table:"T1",shiftId:"s1",tender:"CASH",quantity:2,guestCount:2,gross:2000n,discount:200n,tax:180n,net:1980n,refund:0n,voidAmount:0n,payment:1980n},
{businessDate:"2026-09-01",hour:13,orderId:"o2",orderType:"TAKEAWAY",orderStatus:"CLOSED",item:"Burger",category:"Food",cashierUserId:"u1",shiftId:"s1",tender:"CARD",quantity:1,guestCount:1,gross:1000n,discount:0n,tax:100n,net:1100n,refund:100n,voidAmount:0n,payment:1100n},
{businessDate:"2026-09-01",hour:13,orderId:"o3",orderType:"TAKEAWAY",orderStatus:"CLOSED",item:"Cola",category:"Drinks",cashierUserId:"u3",shiftId:"s1",tender:"ONLINE",quantity:3,guestCount:1,gross:600n,discount:0n,tax:60n,net:660n,refund:0n,voidAmount:50n,payment:660n}
];
test("item-wise preset exists",()=>assert.deepEqual(REPORT_PRESETS["Item-wise Sales (PMIX)"].dimensions,["CATEGORY","ITEM"]));
test("item-wise report aggregates quantity and sales",()=>{const r=runCustomReport(facts,{name:"Items",dimensions:["ITEM"],metrics:["QUANTITY","GROSS_SALES","DISCOUNTS","NET_SALES","AVERAGE_ITEM_PRICE"],filters:{}});const b=r.find(x=>x.key.ITEM==="Burger")!;assert.equal(b.metrics.QUANTITY,3n);assert.equal(b.metrics.NET_SALES,3080n)});
test("filters apply before aggregation",()=>{const r=runCustomReport(facts,{name:"Cash",dimensions:["ITEM"],metrics:["NET_SALES"],filters:{TENDER:["CASH"]}});assert.equal(r.length,1);assert.equal(r[0].metrics.NET_SALES,1980n)});
test("cashier report counts distinct orders",()=>{const r=runCustomReport(facts,{name:"Cashiers",dimensions:["CASHIER"],metrics:["ORDER_COUNT","NET_SALES"],filters:{}});assert.equal(r.find(x=>x.key.CASHIER==="u1")?.metrics.ORDER_COUNT,2n)});
test("tender metrics remain separated",()=>{const r=runCustomReport(facts,{name:"Tender",dimensions:["TENDER"],metrics:["CASH_PAYMENTS","CARD_PAYMENTS","ONLINE_PAYMENTS"],filters:{}});assert.equal(r.find(x=>x.key.TENDER==="CARD")?.metrics.CARD_PAYMENTS,1100n)});
test("sorting by metric works",()=>{const r=runCustomReport(facts,{name:"Top",dimensions:["ITEM"],metrics:["NET_SALES"],filters:{},sort:{field:"NET_SALES",direction:"DESC"}});assert.equal(r[0].key.ITEM,"Burger")});
test("definition rejects duplicate dimensions",()=>assert.throws(()=>validateDefinition({name:"Bad",dimensions:["ITEM","ITEM"],metrics:["NET_SALES"],filters:{}}),/DUPLICATE/));
test("definition caps dimensions",()=>assert.throws(()=>validateDefinition({name:"Bad",dimensions:["ITEM","CATEGORY","CASHIER","TENDER","SHIFT"],metrics:["NET_SALES"],filters:{}}),/DIMENSIONS_INVALID/));
test("csv escapes commas and quotes",()=>assert.equal(csvExport(["Item","Note"],[["Burger","a, \"b\""]]),'"Item","Note"\r\n"Burger","a, ""b"""'));
