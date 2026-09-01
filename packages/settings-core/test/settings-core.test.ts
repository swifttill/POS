import test from "node:test";
import assert from "node:assert/strict";
import { validateCompanySettings } from "../src/index.ts";

test("valid company settings pass", () => assert.deepEqual(validateCompanySettings({name:"SwiftTill Demo",currencyCode:"PKR",timezone:"Asia/Karachi",taxEnabled:true,taxLabel:"GST",taxRateBps:1800}), []));
test("invalid financial/regional settings fail", () => assert.ok(validateCompanySettings({name:"",currencyCode:"Rs",timezone:"local",taxEnabled:true,taxLabel:"",taxRateBps:11000}).length >= 4));
