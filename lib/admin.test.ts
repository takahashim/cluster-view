import { assertEquals } from "@std/assert";
import { getAdminEmails, isAdmin } from "./admin.ts";

const ADMIN_EMAILS_KEY = "ADMIN_EMAILS";

function withEnv(value: string | undefined, fn: () => void) {
  const original = Deno.env.get(ADMIN_EMAILS_KEY);
  if (value === undefined) {
    Deno.env.delete(ADMIN_EMAILS_KEY);
  } else {
    Deno.env.set(ADMIN_EMAILS_KEY, value);
  }
  try {
    fn();
  } finally {
    if (original === undefined) {
      Deno.env.delete(ADMIN_EMAILS_KEY);
    } else {
      Deno.env.set(ADMIN_EMAILS_KEY, original);
    }
  }
}

Deno.test("getAdminEmails", async (t) => {
  await t.step("returns empty array when env is not set", () => {
    withEnv(undefined, () => {
      assertEquals(getAdminEmails(), []);
    });
  });

  await t.step("returns empty array for empty string", () => {
    withEnv("", () => {
      assertEquals(getAdminEmails(), []);
    });
  });

  await t.step("returns single email", () => {
    withEnv("admin@example.com", () => {
      assertEquals(getAdminEmails(), ["admin@example.com"]);
    });
  });

  await t.step("returns multiple emails", () => {
    withEnv("admin1@example.com,admin2@example.com", () => {
      assertEquals(getAdminEmails(), [
        "admin1@example.com",
        "admin2@example.com",
      ]);
    });
  });

  await t.step("trims whitespace", () => {
    withEnv("  admin1@example.com , admin2@example.com  ", () => {
      assertEquals(getAdminEmails(), [
        "admin1@example.com",
        "admin2@example.com",
      ]);
    });
  });

  await t.step("converts to lowercase", () => {
    withEnv("Admin@Example.COM", () => {
      assertEquals(getAdminEmails(), ["admin@example.com"]);
    });
  });

  await t.step("filters empty entries", () => {
    withEnv("admin1@example.com,,admin2@example.com,", () => {
      assertEquals(getAdminEmails(), [
        "admin1@example.com",
        "admin2@example.com",
      ]);
    });
  });
});

Deno.test("isAdmin", async (t) => {
  await t.step("returns false for undefined email", () => {
    withEnv("admin@example.com", () => {
      assertEquals(isAdmin(undefined), false);
    });
  });

  await t.step("returns false when no admins configured", () => {
    withEnv(undefined, () => {
      assertEquals(isAdmin("user@example.com"), false);
    });
  });

  await t.step("returns true for admin email", () => {
    withEnv("admin@example.com", () => {
      assertEquals(isAdmin("admin@example.com"), true);
    });
  });

  await t.step("returns false for non-admin email", () => {
    withEnv("admin@example.com", () => {
      assertEquals(isAdmin("user@example.com"), false);
    });
  });

  await t.step("comparison is case-insensitive", () => {
    withEnv("admin@example.com", () => {
      assertEquals(isAdmin("ADMIN@EXAMPLE.COM"), true);
      assertEquals(isAdmin("Admin@Example.Com"), true);
    });
  });

  await t.step("works with multiple admins", () => {
    withEnv("admin1@example.com,admin2@example.com", () => {
      assertEquals(isAdmin("admin1@example.com"), true);
      assertEquals(isAdmin("admin2@example.com"), true);
      assertEquals(isAdmin("admin3@example.com"), false);
    });
  });
});
