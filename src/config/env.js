import dotenv from "dotenv";
import { z } from "zod";

// Load environment variables from .env file if present
dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
  API_KEY: z.string().min(1, "API_KEY is required and cannot be empty"),
  ALLOWED_ORIGINS: z.string().default("*"),
  SMTP_HOST: z.string().min(1, "SMTP_HOST is required and cannot be empty"),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z
    .union([z.boolean(), z.string()])
    .transform((val) => val === true || val === "true" || val === "1")
    .default(false),
  SMTP_USER: z.string().min(1, "SMTP_USER is required and cannot be empty"),
  SMTP_PASS: z.string().min(1, "SMTP_PASS is required and cannot be empty"),
  MAIL_FROM: z.string().min(1, "MAIL_FROM is required and cannot be empty"),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missingOrInvalid = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );

    console.error(
      "[Config Error] Startup aborted due to invalid environment configuration:\n - " +
        missingOrInvalid.join("\n - "),
    );

    throw new Error("Invalid environment configuration");
  }

  return result.data;
}

export const env = loadConfig();
