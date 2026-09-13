import axios from "axios";

// In production (Vercel) the frontend and API share an origin, so a plain
// relative /api path is correct. Local dev points at uvicorn directly via
// VITE_API_BASE (see .env.development).
const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || "",
});

export const getBorrowers = () => client.get("/api/borrowers").then((res) => res.data);

export const getBorrowerDetail = (id) =>
  client.get(`/api/borrowers/${id}`).then((res) => res.data);

export const refreshExplanation = (id) =>
  client.post(`/api/borrowers/${id}/refresh-explanation`).then((res) => res.data);
