import axios from "axios";

// Dynamically determine API base URL based on current location and port connectivity
let apiBaseUrlPromise = null;
const detectApiBaseUrl = async () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const hostname = window.location.hostname || 'localhost';
  const configuredPort = import.meta.env.VITE_API_PORT;

  if (configuredPort) {
    return `http://${hostname}:${configuredPort}`;
  }

  // Try candidate ports in order (5008, 5009, 5010, 5011, 5012)
  const candidatePorts = [5008, 5009, 5010, 5011, 5012];
  for (const port of candidatePorts) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 200);

      // Fast check request
      await fetch(`http://${hostname}:${port}/`, {
        signal: controller.signal,
        mode: 'no-cors' // Use no-cors to prevent preflight errors for checking presence
      });

      clearTimeout(timeoutId);
      console.info(`[API DETECT] Found backend active on port: ${port}`);
      return `http://${hostname}:${port}`;
    } catch (err) {
      // Server not running on this port
    }
  }

  // Default fallback
  return `http://${hostname}:5008`;
};

apiBaseUrlPromise = detectApiBaseUrl();

const API = axios.create({
  baseURL: `http://localhost:5008`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

API.interceptors.request.use(async (config) => {
  const detectedBaseUrl = await apiBaseUrlPromise;
  config.baseURL = detectedBaseUrl;

  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle network errors gracefully
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.message === 'Network Error' && !error.response) {
      console.error('Backend server not accessible at:', getApiBaseUrl());
    }
    return Promise.reject(error);
  }
);

// Debugging: log requests and responses when VITE_DEBUG_API is set
if (import.meta.env.VITE_DEBUG_API === 'true') {
  API.interceptors.request.use((config) => {
    console.debug('[API REQUEST]', config.method?.toUpperCase(), config.url, config.data || config.params || '');
    return config;
  });

  API.interceptors.response.use(
    (res) => {
      console.debug('[API RESPONSE]', res.status, res.config.url, res.data);
      return res;
    },
    (err) => {
      console.debug('[API ERROR]', err.response?.status, err.response?.config?.url, err.response?.data || err.message);
      return Promise.reject(err);
    }
  );
}

export default API;
