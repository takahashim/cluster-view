/**
 * Admin authentication utilities
 */

import { getEnv } from "./env.ts";

const ADMIN_EMAILS_KEY = "ADMIN_EMAILS";

/**
 * Get list of admin email addresses from environment variable
 * ADMIN_EMAILS should be a comma-separated list of email addresses
 */
export function getAdminEmails(): string[] {
  const emails = getEnv(ADMIN_EMAILS_KEY);
  if (!emails) return [];
  return emails.split(",").map((e) => e.trim().toLowerCase()).filter((e) =>
    e.length > 0
  );
}

/**
 * Check if a user email is an admin
 * Comparison is case-insensitive
 */
export function isAdmin(userEmail: string | undefined): boolean {
  if (!userEmail) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(userEmail.toLowerCase());
}
