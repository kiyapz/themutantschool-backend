// Helper for token expiry time (1 hour from now)
export const tokenExpiry = () => Date.now() + 60 * 60 * 1000;
