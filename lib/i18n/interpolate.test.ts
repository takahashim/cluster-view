import { assertEquals } from "@std/assert";
import { interpolate } from "./interpolate.ts";

Deno.test("interpolate", async (t) => {
  await t.step("replaces single parameter", () => {
    const result = interpolate("{count}件", { count: 100 });
    assertEquals(result, "100件");
  });

  await t.step("replaces multiple parameters", () => {
    const result = interpolate("{min}〜{max}", { min: 1, max: 10 });
    assertEquals(result, "1〜10");
  });

  await t.step("handles string parameters", () => {
    const result = interpolate("Hello, {name}!", { name: "World" });
    assertEquals(result, "Hello, World!");
  });

  await t.step("preserves unmatched placeholders", () => {
    const result = interpolate("{a} and {b}", { a: "X" });
    assertEquals(result, "X and {b}");
  });

  await t.step("returns original string when no placeholders", () => {
    const result = interpolate("No placeholders here");
    assertEquals(result, "No placeholders here");
  });

  await t.step("handles empty params", () => {
    const result = interpolate("Hello!");
    assertEquals(result, "Hello!");
  });

  await t.step("handles number zero", () => {
    const result = interpolate("{count}件", { count: 0 });
    assertEquals(result, "0件");
  });

  await t.step("handles consecutive placeholders", () => {
    const result = interpolate("{a}{b}{c}", { a: "1", b: "2", c: "3" });
    assertEquals(result, "123");
  });

  await t.step("handles special regex characters in replacement", () => {
    const result = interpolate("{value}", { value: "$100" });
    assertEquals(result, "$100");
  });

  await t.step("handles Japanese text around placeholders", () => {
    const result = interpolate("合計{total}件のコメント", { total: 42 });
    assertEquals(result, "合計42件のコメント");
  });

  await t.step("handles multiple occurrences of same placeholder", () => {
    const result = interpolate("{x} + {x} = {y}", { x: 2, y: 4 });
    assertEquals(result, "2 + 2 = 4");
  });
});
