import { useAuthStore } from "@/stores/authStore";
import axios from "axios";

// ============================================================
// Axios Instance
// ============================================================

const api = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================
// Request Interceptor - Inject Auth Token
// ============================================================

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================================
// Response Interceptor - Handle 401 Unauthorized
// ============================================================

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - logout user
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

// ============================================================
// Types
// ============================================================

export interface Market {
  id: number;
  question: string;
  description: string;
  end_date: string;
  pool_yes: number;
  pool_no: number;
  is_resolved: boolean;
  outcome: boolean | null;
  resolution_source: string | null;
  prob_yes: number;
  prob_no: number;
}

export interface MarketsResponse {
  markets: Market[];
  total: number;
}

export interface User {
  id: number;
  username: string;
  balance: number;
}

export interface BuyRequest {
  user_id: number;
  amount: number;
  outcome: boolean; // true = YES, false = NO
}

export interface BuyResponse {
  market_id: number;
  user_id: number;
  outcome: boolean;
  amount_spent: number;
  shares_received: number;
  effective_price: number;
  new_prob_yes: number;
  new_prob_no: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// ============================================================
// Auth API Functions
// ============================================================

/**
 * Login with username and password.
 * Uses OAuth2 password flow (application/x-www-form-urlencoded format)
 */
export async function login(
  username: string,
  password: string
): Promise<TokenResponse> {
  const formData = new URLSearchParams();
  formData.append("username", username);
  formData.append("password", password);

  const { data } = await api.post<TokenResponse>("/auth/token", formData, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  return data;
}

/**
 * Register a new user
 */
export async function register(
  username: string,
  password: string
): Promise<User> {
  const { data } = await api.post<User>("/auth/register", {
    username,
    password,
  });
  return data;
}

/**
 * Fetch current authenticated user info
 */
export async function fetchCurrentUser(): Promise<User> {
  const { data } = await api.get<User>("/auth/me");
  return data;
}

// ============================================================
// Market API Functions
// ============================================================

/**
 * Fetch all markets from the API
 */
export async function fetchMarkets(): Promise<MarketsResponse> {
  const { data } = await api.get<MarketsResponse>("/markets");
  return data;
}

/**
 * Buy shares in a market
 */
export async function buyShares(
  marketId: number,
  request: BuyRequest
): Promise<BuyResponse> {
  const { data } = await api.post<BuyResponse>(
    `/markets/${marketId}/buy`,
    request
  );
  return data;
}

export default api;
