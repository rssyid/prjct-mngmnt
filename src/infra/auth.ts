import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { nextCookies } from 'better-auth/next-js';
import { prisma } from './db';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'MANAGEMENT_VIEWER',
        required: false,
      },
      isActive: {
        type: 'boolean',
        defaultValue: true,
        required: false,
      },
      mustChangePassword: {
        type: 'boolean',
        defaultValue: true,
        required: false,
      },
    },
  },
  plugins: [nextCookies()],
});
