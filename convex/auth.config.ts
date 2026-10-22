import type { AuthConfig } from "convex/server";

const authConfig: AuthConfig = {
    providers: [
        {
            applicationID: 'convex',
            domain: process.env.NEXT_PUBLIC_CLERK_JWT_ISSUER_DOMAIN!,
        }
    ]
}
export default authConfig