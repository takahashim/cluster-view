import { assertEquals } from "@std/assert";
import { joinChunks, splitIntoChunks } from "./chunk.ts";

Deno.test("splitIntoChunks", async (t) => {
  await t.step("returns single chunk for empty string", () => {
    const result = splitIntoChunks("", 100);
    assertEquals(result.length, 1);
    assertEquals(result[0], "");
  });

  await t.step("returns single chunk for small string", () => {
    const result = splitIntoChunks("hello", 100);
    assertEquals(result.length, 1);
    assertEquals(result[0], "hello");
  });

  await t.step("returns single chunk when string equals chunk size", () => {
    const data = "a".repeat(100);
    const result = splitIntoChunks(data, 100);
    assertEquals(result.length, 1);
    assertEquals(result[0], data);
  });

  await t.step("splits into multiple chunks for large string", () => {
    const data = "a".repeat(100);
    const result = splitIntoChunks(data, 30);
    assertEquals(result.length, 4); // 30 + 30 + 30 + 10
    assertEquals(result[0].length, 30);
    assertEquals(result[1].length, 30);
    assertEquals(result[2].length, 30);
    assertEquals(result[3].length, 10);
  });

  await t.step("preserves content after splitting", () => {
    const data = "abcdefghij";
    const result = splitIntoChunks(data, 3);
    assertEquals(result, ["abc", "def", "ghi", "j"]);
  });

  await t.step("handles unicode characters", () => {
    const data = "あいうえお";
    const result = splitIntoChunks(data, 2);
    assertEquals(result, ["あい", "うえ", "お"]);
  });
});

Deno.test("joinChunks", async (t) => {
  await t.step("joins empty array", () => {
    const result = joinChunks([]);
    assertEquals(result, "");
  });

  await t.step("joins single chunk", () => {
    const result = joinChunks(["hello"]);
    assertEquals(result, "hello");
  });

  await t.step("joins multiple chunks", () => {
    const result = joinChunks(["abc", "def", "ghi"]);
    assertEquals(result, "abcdefghi");
  });

  await t.step("joins chunks with empty strings", () => {
    const result = joinChunks(["a", "", "b"]);
    assertEquals(result, "ab");
  });
});

Deno.test("splitIntoChunks and joinChunks roundtrip", async (t) => {
  await t.step("preserves original string", () => {
    const original = "The quick brown fox jumps over the lazy dog.";
    const chunks = splitIntoChunks(original, 10);
    const result = joinChunks(chunks);
    assertEquals(result, original);
  });

  await t.step("preserves JSON string", () => {
    const obj = { name: "test", values: [1, 2, 3], nested: { a: "b" } };
    const original = JSON.stringify(obj);
    const chunks = splitIntoChunks(original, 15);
    const result = joinChunks(chunks);
    assertEquals(result, original);
    assertEquals(JSON.parse(result), obj);
  });

  await t.step("preserves large data", () => {
    const original = "x".repeat(100000);
    const chunks = splitIntoChunks(original, 30000);
    const result = joinChunks(chunks);
    assertEquals(result, original);
    assertEquals(result.length, 100000);
  });
});
