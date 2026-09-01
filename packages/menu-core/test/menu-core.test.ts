import test from "node:test";
import assert from "node:assert/strict";
import { priceCatalogSelection, calculateDealDiscount, type MenuItem } from "../src/index.ts";

const burger: MenuItem = {
  id:"burger", name:"Classic Burger", basePrice:90000n, active:true, availableNow:true,
  variants:[{id:"large",name:"Large",price:110000n,active:true}],
  modifierGroups:[{id:"cheese",name:"Cheese",required:true,minSelections:1,maxSelections:1,allowDuplicates:false,active:true,
    options:[{id:"cheddar",name:"Cheddar",priceDelta:15000n,active:true},{id:"swiss",name:"Swiss",priceDelta:20000n,active:true}]}]
};

test("server resolves variant and modifier prices",()=>{
  assert.deepEqual(priceCatalogSelection(burger,2,"large",[{groupId:"cheese",optionIds:["cheddar"]}]),{unitBase:110000n,modifierDelta:15000n,unitPrice:125000n,lineGross:250000n});
});
test("required modifier cannot be bypassed",()=>assert.throws(()=>priceCatalogSelection(burger,1,"large",[]),/REQUIRED_MODIFIER_MISSING/));
test("foreign modifier group is rejected",()=>assert.throws(()=>priceCatalogSelection(burger,1,"large",[{groupId:"other",optionIds:["free"]}]),/REQUIRED_MODIFIER_MISSING|MODIFIER_GROUP_NOT_ALLOWED/));
test("unavailable menu item is rejected server-side",()=>assert.throws(()=>priceCatalogSelection({...burger,availableNow:false},1,"large",[{groupId:"cheese",optionIds:["cheddar"]}]),/ITEM_UNAVAILABLE/));
test("percent deal is a real discount amount, never a fake cart line",()=>{
  const amount=calculateDealDiscount({id:"lunch",active:true,type:"PERCENT",value:1000,eligibleItemIds:["burger"]},100000n,["burger"]);
  assert.equal(amount,10000n);
});
test("fixed deal cannot make eligible value negative",()=>{
  const amount=calculateDealDiscount({id:"promo",active:true,type:"FIXED",value:50000,eligibleItemIds:["burger"]},30000n,["burger"]);
  assert.equal(amount,30000n);
});
