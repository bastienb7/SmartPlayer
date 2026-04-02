// Use relative URL so Next.js rewrites (local) or nginx (VPS) handle routing
const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

function getToken(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("sp_token") || "dev-token";
  }
  return "dev-token";
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
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
  getVideosWithFeatures: () => request<{ videos: any[] }>("/api/videos-with-features"),
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

  // Advanced Analytics
  getAnalyticsDetails: (videoId: string) =>
    request<any>(`/analytics/details?videoId=${videoId}`),
  getAnalyticsHeatmap: (videoId: string) =>
    request<{ heatmap: any[] }>(`/analytics/heatmap?videoId=${videoId}`),
  getAnalyticsDropoff: (videoId: string) =>
    request<{ dropoff: any[] }>(`/analytics/dropoff?videoId=${videoId}`),
  getAnalyticsVariants: (videoId: string) =>
    request<{ variants: any[] }>(`/analytics/variants?videoId=${videoId}`),

  // Funnels
  getFunnels: () => request<{ funnels: any[] }>("/api/funnels"),
  getFunnel: (id: string) => request<{ funnel: any; steps: any[] }>(`/api/funnels/${id}`),
  createFunnel: (data: { name: string; description?: string }) =>
    request<{ funnel: any }>("/api/funnels", { method: "POST", body: JSON.stringify(data) }),
  updateFunnel: (id: string, data: any) =>
    request<any>(`/api/funnels/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteFunnel: (id: string) =>
    request<any>(`/api/funnels/${id}`, { method: "DELETE" }),
  addFunnelStep: (funnelId: string, data: { name: string; category: string; sort_order: number }) =>
    request<{ step: any }>(`/api/funnels/${funnelId}/steps`, { method: "POST", body: JSON.stringify(data) }),
  updateFunnelStep: (stepId: string, data: any) =>
    request<any>(`/api/funnels/steps/${stepId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteFunnelStep: (stepId: string) =>
    request<any>(`/api/funnels/steps/${stepId}`, { method: "DELETE" }),
  addStepVariant: (stepId: string, data: { video_id: string; name: string; weight: number }) =>
    request<{ variant: any }>(`/api/funnels/steps/${stepId}/variants`, { method: "POST", body: JSON.stringify(data) }),
  updateStepVariant: (variantId: string, data: any) =>
    request<any>(`/api/funnels/variants/${variantId}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteStepVariant: (variantId: string) =>
    request<any>(`/api/funnels/variants/${variantId}`, { method: "DELETE" }),
  getFunnelEmbed: (id: string) =>
    request<{ html: string }>(`/api/funnels/${id}/embed`),

  // Settings
  getSettings: () => request<any>("/api/settings"),
  updateSettings: (data: { orgName: string }) =>
    request<any>("/api/settings", { method: "PATCH", body: JSON.stringify(data) }),
  regenerateApiKey: () =>
    request<{ apiKey: string }>("/api/settings/regenerate-key", { method: "POST" }),
  updatePlan: (plan: string) =>
    request<any>("/api/settings/plan", { method: "PATCH", body: JSON.stringify({ plan }) }),

  // Folders (Library)
  getFolders: () => request<{ folders: any[] }>("/api/folders"),
  createFolder: (data: { name: string; color?: string }) =>
    request<{ folder: any }>("/api/folders", { method: "POST", body: JSON.stringify(data) }),
  updateFolder: (id: string, data: { name?: string; color?: string }) =>
    request<any>(`/api/folders/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteFolder: (id: string) =>
    request<any>(`/api/folders/${id}`, { method: "DELETE" }),
  organizeVideo: (id: string, data: { folder_id?: string | null; category?: string; tags?: string[] }) =>
    request<any>(`/api/videos/${id}/organize`, { method: "PATCH", body: JSON.stringify(data) }),

  // Embed
  getEmbedCode: (videoId: string) => request<any>(`/embed/${videoId}/code`),
};
