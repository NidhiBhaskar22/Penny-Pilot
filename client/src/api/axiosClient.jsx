// src/api/axiosClient.js
import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3001/api";

const axiosClient = axios.create({
  baseURL,
});

const refreshClient = axios.create({
  baseURL,
});

let refreshPromise = null;

function clearAuthState() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
}

function redirectToLogin() {
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      throw new Error("Missing refresh token");
    }

    refreshPromise = refreshClient
      .post("/auth/refresh", { refreshToken })
      .then((res) => {
        const { token, refreshToken: nextRefreshToken, user } = res.data || {};

        if (!token || !nextRefreshToken) {
          throw new Error("Invalid refresh response");
        }

        localStorage.setItem("token", token);
        localStorage.setItem("refreshToken", nextRefreshToken);
        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
        }

        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

// Attach token to every request
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle global errors + refresh rotation
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const requestUrl = String(originalRequest?.url || "");

    if (status !== 401 || !originalRequest) {
      return Promise.reject(error);
    }

    const isAuthEndpoint = requestUrl.includes("/auth/login")
      || requestUrl.includes("/auth/register")
      || requestUrl.includes("/auth/google")
      || requestUrl.includes("/auth/refresh");

    if (originalRequest._retry || isAuthEndpoint) {
      clearAuthState();
      redirectToLogin();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const token = await refreshAccessToken();
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return axiosClient(originalRequest);
    } catch (refreshError) {
      clearAuthState();
      redirectToLogin();
      return Promise.reject(refreshError);
    }
  }
);

export default axiosClient;
