import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL environment variable is not set');
}

export const convex = new ConvexHttpClient(convexUrl);
export { api };
