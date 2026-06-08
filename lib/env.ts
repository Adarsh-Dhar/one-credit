// lib/env.ts
//
// Environment variable validation using Zod

import { z } from 'zod';
import { DEFAULT_FINANCIALS } from './constants';

const envSchema = z.object({
  // MongoDB
  MONGODB_URI: z.string().url('Invalid MongoDB URI format'),

  // Google Gemini AI
  GOOGLE_API_KEY: z.string().min(1, 'GOOGLE_API_KEY is required'),

  // Fivetran
  FIVETRAN_API_KEY: z.string().optional(),
  FIVETRAN_AIRLINE_CONNECTOR_ID: z.string().optional(),
  FIVETRAN_BANK_CONNECTOR_ID: z.string().optional(),
  FIVETRAN_HOTEL_CONNECTOR_ID: z.string().optional(),
  FIVETRAN_REWARDS_CONNECTOR_ID: z.string().optional(),
  FIVETRAN_REWARDS_SYNC_INTERVAL_SECONDS: z.string().optional().transform(Number).pipe(z.number().int().positive().default(300)),

  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url('Invalid NEXTAUTH_URL format'),

  // Extension
  NEXT_PUBLIC_EXTENSION_ID: z.string().optional(),

  // MCP Server
  MCP_SERVER_PATH: z.string().optional(),

  // Seed endpoint protection
  SEED_SECRET: z.string().min(1, 'SEED_SECRET is required'),

  // Upstash Redis (for rate limiting)
  UPSTASH_REDIS_REST_URL: z.string().url('Invalid UPSTASH_REDIS_REST_URL format').optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN is required').optional(),

  // Dynatrace (for RUM agent)
  DT_ENV_URL: z.string().url('Invalid DT_ENV_URL format').optional(),
  DT_API_TOKEN: z.string().min(1, 'DT_API_TOKEN is required').optional(),

  // Development Origins
  ALLOWED_DEV_ORIGINS: z.string().optional().default(''),

  // Additional app config
  GST_RATE: z.union([z.string(), z.undefined()]).optional().transform(val => val ? Number(val) : DEFAULT_FINANCIALS.GST_RATE).pipe(z.number().min(0).max(1).default(DEFAULT_FINANCIALS.GST_RATE)),
  RISK_FREE_RATE_PERCENT: z.union([z.string(), z.undefined()]).optional().transform(val => val ? Number(val) : DEFAULT_FINANCIALS.RISK_FREE_RATE_PERCENT).pipe(z.number().min(0).max(100).default(DEFAULT_FINANCIALS.RISK_FREE_RATE_PERCENT)),
  BILLING_CYCLE_DAYS: z.union([z.string(), z.undefined()]).optional().transform(val => val ? Number(val) : DEFAULT_FINANCIALS.BILLING_CYCLE_DAYS).pipe(z.number().int().positive().default(DEFAULT_FINANCIALS.BILLING_CYCLE_DAYS)),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function validateEnv(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  try {
    validatedEnv = envSchema.parse(process.env);
    return validatedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors
        .filter(e => e.code === 'invalid_type')
        .map(e => e.path.join('.'))
        .join(', ');
      
      console.error('❌ Environment variable validation failed:');
      console.error(`   Missing or invalid: ${missingVars}`);
      console.error('\nPlease check your .env file and ensure all required variables are set.');
      console.error('See .env.example for reference.');
      
      throw new Error(`Environment validation failed: ${missingVars}`);
    }
    throw error;
  }
}

export function getEnv(): Env {
  if (!validatedEnv) {
    return validateEnv();
  }
  return validatedEnv;
}
