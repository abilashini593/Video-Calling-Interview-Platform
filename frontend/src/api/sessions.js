import axiosInstance from "../lib/axios";

export const sessionApi = {
  createSession: async (data, token) => {
    const response = await axiosInstance.post("/api/sessions", data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  },

  getActiveSessions: async () => {
    const response = await axiosInstance.get("/api/sessions/active");
    return response.data;
  },

  getMyRecentSessions: async () => {
    const response = await axiosInstance.get("/api/sessions/my-recent");
    return response.data;
  },

  getSessionById: async (id) => {
    const response = await axiosInstance.get(`/api/sessions/${id}`);
    return response.data;
  },

  joinSession: async (id, token) => {
    const response = await axiosInstance.post(
      `/api/sessions/${id}/join`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  endSession: async (id, token) => {
    const response = await axiosInstance.post(
      `/api/sessions/${id}/end`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  getStreamToken: async (token) => {
    const response = await axiosInstance.get(`/api/chat/token`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return response.data;
  },
};
