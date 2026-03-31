const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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
