export const API_CONFIG = {
  baseUrl:
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:3001",
  timeoutMs: 30000,
};
