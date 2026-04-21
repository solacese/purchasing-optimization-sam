const API_BASE = "/api";

async function fetchJSON(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

export const getDashboardSummary = () => fetchJSON("/dashboard/summary");
export const getNews = (limit = 30) => fetchJSON(`/news?limit=${limit}`);
export const getCommentary = () => fetchJSON("/commentary");
export const getCollaborations = () => fetchJSON("/collaborations");
export const getLatestCollaboration = () => fetchJSON("/collaborations/latest");
export const getRecommendations = () => fetchJSON("/recommendations");
export const getRisks = () => fetchJSON("/risks");
export const getEventHistory = (limit = 100) => fetchJSON(`/events/history?limit=${limit}`);
export const getHealth = () => fetchJSON("/health");

export function createEventSource() {
  return new EventSource(`${API_BASE}/events/stream`);
}
