// Use relative URL so Next.js rewrites (local) or nginx (VPS) handle routing
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      // In production, add Clerk token here
      Authorization: "Bearer dev-token",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `API error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Videos
  getVideos: () => request<{ videos: any[] }>("/api/videos"),
  getVideo: (id: string) => request<any>(`/api/videos/${id}`),
  createVideo: (data: { title: string; contentType?: string }) =>
    request<{ video: any; uploadUrl: string }>("/api/videos", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  confirmUpload: (id: string) =>
    request<any>(`/api/videos/${id}/uploaded`, { method: "POST" }),
  updateVideo: (id: string, data: any) =>
    request<any>(`/api/videos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  deleteVideo: (id: string) =>
    request<any>(`/api/videos/${id}`, { method: "DELETE" }),

  // Player config
  getPlayerConfig: (videoId: string) => request<any>(`/api/videos/${videoId}/player`),
  updatePlayerConfig: (videoId: string, data: any) =>
    request<any>(`/api/videos/${videoId}/player`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  // CTAs
  getCTAs: (playerId: string) => request<{ ctas: any[] }>(`/api/cta?playerId=${playerId}`),
  createCTA: (data: any) =>
    request<any>("/api/cta", { method: "POST", body: JSON.stringify(data) }),
  updateCTA: (id: string, data: any) =>
    request<any>(`/api/cta/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteCTA: (id: string) =>
    request<any>(`/api/cta/${id}`, { method: "DELETE" }),

  // Headlines
  getHeadlines: (playerId: string) =>
    request<{ headline: any; variants: any[] }>(`/api/headlines?playerId=${playerId}`),
  saveHeadline: (data: any) =>
    request<any>("/api/headlines", { method: "POST", body: JSON.stringify(data) }),
  createHeadlineVariant: (data: any) =>
    request<any>("/api/headlines/variants", { method: "POST", body: JSON.stringify(data) }),
  updateHeadlineVariant: (id: string, data: any) =>
    request<any>(`/api/headlines/variants/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteHeadlineVariant: (id: string) =>
    request<any>(`/api/headlines/variants/${id}`, { method: "DELETE" }),
  startHeadlineTest: (headlineId: string) =>
    request<any>(`/api/headlines/${headlineId}/start-test`, { method: "POST" }),
  stopHeadlineTest: (headlineId: string) =>
    request<any>(`/api/headlines/${headlineId}/stop-test`, { method: "POST" }),
  declareHeadlineWinner: (headlineId: string, variantId: string) =>
    request<any>(`/api/headlines/${headlineId}/declare-winner`, {
      method: "POST",
      body: JSON.stringify({ variantId }),
    }),

  // Exit-Intent
  getExitIntent: (playerId: string) =>
    request<{ exitIntent: any }>(`/api/exit-intent?playerId=${playerId}`),
  saveExitIntent: (data: any) =>
    request<any>("/api/exit-intent", { method: "POST", body: JSON.stringify(data) }),
  deleteExitIntent: (id: string) =>
    request<any>(`/api/exit-intent/${id}`, { method: "DELETE" }),

  // Pixels
  getPixels: (playerId: string) =>
    request<{ pixels: any[] }>(`/api/pixels?playerId=${playerId}`),
  createPixel: (data: any) =>
    request<any>("/api/pixels", { method: "POST", body: JSON.stringify(data) }),
  updatePixel: (id: string, data: any) =>
    request<any>(`/api/pixels/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deletePixel: (id: string) =>
    request<any>(`/api/pixels/${id}`, { method: "DELETE" }),

  // Analytics
  getAnalyticsOverview: (params?: { videoId?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<any>(`/analytics/overview?${qs}`);
  },
  getRetention: (videoId: string) =>
    request<{ retention: any[] }>(`/analytics/retention?videoId=${videoId}`),
  getDailyStats: (params?: { videoId?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ daily: any[] }>(`/analytics/daily?${qs}`);
  },

  // Embed
  getEmbedCode: (videoId: string) => request<any>(`/embed/${videoId}/code`),
};
