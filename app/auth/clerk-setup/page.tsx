'use client';

import Link from 'next/link';
import { Settings2 } from 'lucide-react';
import { Button } from 'react-bootstrap';
import {
  CLERK_CONVEX_JWT_TEMPLATE,
  CLERK_CONVEX_SETUP_URL,
  MISSING_CLERK_CONVEX_JWT_TEMPLATE_ERROR,
} from '../../../lib/clerk-convex-auth';

export default function ClerkSetupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-lg w-full space-y-8 p-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
            <Settings2 className="h-8 w-8 text-amber-700" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Clerk Auth Setup Required
          </h1>

          <p className="text-gray-600 mb-6">{MISSING_CLERK_CONVEX_JWT_TEMPLATE_ERROR}</p>

          <div className="rounded-lg border border-gray-200 bg-white p-4 text-left text-sm text-gray-700 space-y-3 mb-8">
            <p className="font-medium text-gray-900">To fix this:</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>
                Open the{' '}
                <a
                  href={CLERK_CONVEX_SETUP_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  Clerk Convex integration page
                </a>
                .
              </li>
              <li>
                Activate the integration so Clerk creates a JWT template named{' '}
                <code className="rounded bg-gray-100 px-1">{CLERK_CONVEX_JWT_TEMPLATE}</code>.
              </li>
              <li>
                Confirm{' '}
                <code className="rounded bg-gray-100 px-1">NEXT_PUBLIC_CLERK_JWT_ISSUER_DOMAIN</code>{' '}
                matches your Clerk Frontend API URL.
              </li>
              <li>Sign out, then sign back in to refresh your session token.</li>
            </ol>
          </div>

          <div className="space-y-4">
            <a href={CLERK_CONVEX_SETUP_URL} target="_blank" rel="noreferrer">
              <Button className="w-full">Open Clerk Convex Setup</Button>
            </a>

            <Link href="/">
              <Button variant="outline" className="w-full">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
