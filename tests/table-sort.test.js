import test from "node:test";
import assert from "node:assert/strict";
import { getCellValue, compareValues } from "../app/components/table.js";

test("getCellValue parses numbers", () => {
  const cell = { textContent: "$12.50" };
  assert.equal(getCellValue(cell, "number"), 12.5);
});

test("compareValues sorts text with localeCompare", () => {
  assert.ok(compareValues("alpha", "beta", "text") < 0);
});

test("compareValues sorts numbers numerically", () => {
  assert.equal(compareValues(2, 10, "number"), -8);
});
