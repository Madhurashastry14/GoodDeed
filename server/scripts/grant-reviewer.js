#!/usr/bin/env node
/**
 * Trusted, out-of-band provisioning for platform reviewers.
 *
 * Usage (run with database credentials, never exposed through the HTTP API):
 *   node scripts/grant-reviewer.js <user-email-or-uuid>
 *   node scripts/grant-reviewer.js <user-email-or-uuid> --revoke
 *   node scripts/grant-reviewer.js <user-email-or-uuid> --granted-by <email-or-uuid>
 *   node scripts/grant-reviewer.js --list
 */
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const pool = require("../src/config/db");
const reviewerService = require("../src/services/reviewerService");

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function resolveUser(identifier) {
  const column = UUID_REGEX.test(identifier) ? "id" : "email";
  const value = column === "email" ? identifier.trim().toLowerCase() : identifier;

  const result = await pool.query(
    `SELECT id, name, email FROM users WHERE ${column} = $1`,
    [value],
  );

  if (result.rows.length === 0) {
    throw new Error(`No user found for ${identifier}`);
  }

  return result.rows[0];
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--list")) {
    const reviewers = await reviewerService.listReviewers();

    if (reviewers.length === 0) {
      console.log("No platform reviewers are provisioned.");
    } else {
      for (const reviewer of reviewers) {
        console.log(
          `${reviewer.user_id}  ${reviewer.email}  (${reviewer.name}) granted ${reviewer.granted_at.toISOString()}`,
        );
      }
    }

    return;
  }

  const identifier = args.find((arg) => !arg.startsWith("--"));
  const grantedByIdentifier = (() => {
    const index = args.indexOf("--granted-by");
    return index === -1 ? null : args[index + 1];
  })();

  if (!identifier) {
    throw new Error(
      "Usage: node scripts/grant-reviewer.js <email-or-uuid> [--revoke] [--granted-by <email-or-uuid>] | --list",
    );
  }

  const user = await resolveUser(identifier);

  if (args.includes("--revoke")) {
    const removed = await reviewerService.revokeReviewer(user.id);
    console.log(
      removed
        ? `Revoked platform reviewer access from ${user.email}`
        : `${user.email} was not a platform reviewer`,
    );
    return;
  }

  let grantedBy = null;

  if (grantedByIdentifier) {
    const granter = await resolveUser(grantedByIdentifier);
    grantedBy = granter.id;
  }

  const reviewer = await reviewerService.grantReviewer(user.id, grantedBy);
  console.log(
    `Granted platform reviewer access to ${user.email} (${reviewer.user_id})`,
  );
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
