'use client';

import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { Button } from '../../shared/button';
import { usePermissions } from '../../hooks/usePermissions';
import { DASHBOARD_PATH, getPostLoginPath, NO_ACCESS_PATH, STAFF_HOME_PATH } from '../../lib/route-access';

function homeLabel(path: string): string {
  if (path === DASHBOARD_PATH) return 'Go to Dashboard';
  if (path === STAFF_HOME_PATH) return 'Go to My Profile';
  if (path === NO_ACCESS_PATH) return 'View access status';
  return 'Continue';
}

export default function UnauthorizedPage() {
  const { hasGranularPermission, isLoading } = usePermissions();
  const homePath = getPostLoginPath(hasGranularPermission);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <ShieldX className="h-8 w-8 text-red-600" />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          
          <p className="text-gray-600 mb-8">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
          
          <div className="space-y-4">
            <Link href={isLoading ? NO_ACCESS_PATH : homePath}>
              <Button className="w-full">
                {isLoading ? 'Continue' : homeLabel(homePath)}
              </Button>
            </Link>
            
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
