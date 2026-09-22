/**
 * Convex provides `process.env` in functions and `auth.config.ts`.
 * The default runtime is not Node.js, so only this subset is declared.
 */
declare const process: {
  env: {
    [name: string]: string | undefined;
  };
};
