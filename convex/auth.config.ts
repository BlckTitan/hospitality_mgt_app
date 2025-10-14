const authConfig = {
    providers: [
        {
            applicationID: 'convex',
            domain: process.env.NEXT_PUBLIC_CLERK_JWT_ISSUER_DOMAIN,
        }
    ]
}
export default authConfig