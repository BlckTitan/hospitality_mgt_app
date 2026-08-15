"use client";

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import { useEffect } from 'react';
import { api } from '../convex/_generated/api';

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const userContext = useQuery(api.authContext.getCurrentUserContext);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || userContext === undefined) return;

    const destination = userContext && userContext.roles?.length > 0 ? '/admin/dashboard' : '/setup/property';
    router.replace(destination);
  }, [isLoaded, isSignedIn, userContext, router]);

  if (!isLoaded || (isSignedIn && userContext === undefined)) {
    return (
      <section className="w-full h-screen bg-white flex justify-center items-center p-4 lg:p-0">
        <div className="text-gray-500">Loading...</div>
      </section>
    );
  }

  if (isSignedIn) {
    return null;
  }

  return (
    <section className="w-full h-screen bg-white flex justify-center items-center p-4 lg:p-0">
      <div className="w-full lg:w-[600px] h-[500px] rounded-md flex flex-col items-center justify-center gap-4">
        <header className="w-full h-fit flex flex-col items-center justify-center gap-2 mb-8">
          <h1 className="site_main_title">Hospitality Manager</h1>
          <p className="text-center">Welcome, Manager! Please, sign in to begin</p>
        </header>

        <div className="admin_btn w-full h-fit flex items-center justify-center gap-4 mt-4">
          <div className="w-full h-fit flex flex-col lg:flex-row items-center justify-center gap-4 mt-4">
            <a
              href="/sign-in"
              className="!no-underline flex items-center justify-center border bg-white hover:!bg-gray-100 text-black !rounded-sm font-medium w-full lg:w-1/2 h-10 sm:h-12 px-4 sm:px-5 cursor-pointer"
            >
              Sign In
            </a>

            <a
              href="/sign-up"
              className="!no-underline flex items-center justify-center bg-black hover:!bg-gray-800 text-white !rounded-sm font-medium w-full lg:w-1/2 h-10 sm:h-12 px-4 sm:px-5 cursor-pointer"
            >
              Sign Up
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
