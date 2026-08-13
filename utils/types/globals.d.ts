export {}

declare global {
  interface CustomJwtSessionClaims {
    metadata?: Record<string, unknown>
  }
}
