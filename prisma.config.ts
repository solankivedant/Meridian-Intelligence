import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma loads this file for *every* CLI command, including ones that never
 * open a connection.
 *
 * `env("DATABASE_URL")` throws the moment the variable is missing, which made
 * `prisma generate` - a command that only reads the schema and writes a client
 * - impossible to run without a database. That is fine locally, where `.env`
 * always has one, and fatal on a build machine: the `postinstall` hook runs
 * during `npm install`, before any of the build's own environment is
 * necessarily in place, and the whole deployment failed at the install step
 * with a config-parse error rather than anything about the database.
 *
 * Reading `process.env` directly keeps generation independent of the
 * connection string. Commands that genuinely need a database - `migrate`,
 * `studio`, `db push` - still get the URL when it is set, and fail with a
 * connection error rather than a config error when it is not, which is the
 * message that actually points at the problem.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
