import { useAuthStore } from "@/stores/authStore";
import axios from "axios";

// ============================================================
// Axios Instance
// ============================================================

const api = axios.create({
  baseURL: "/api/v1",
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
  is_admin: boolean;
  avatar_url: string | null;
  theme: "dark" | "light";
  email_notifications: boolean;
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
// Profile API Functions
// ============================================================

export interface ProfileUpdate {
  avatar_url?: string | null;
  theme?: "dark" | "light";
  email_notifications?: boolean;
}

export interface PasswordChange {
  current_password: string;
  new_password: string;
}

/**
 * Update user profile
 */
export async function updateProfile(data: ProfileUpdate): Promise<User> {
  const { data: user } = await api.patch<User>("/auth/profile", data);
  return user;
}

/**
 * Change user password
 */
export async function changePassword(data: PasswordChange): Promise<void> {
  await api.post("/auth/change-password", data);
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

// ============================================================
// Admin API Functions
// ============================================================

export interface UserUpdate {
  balance?: number;
  is_admin?: boolean;
}

export interface MarketCreate {
  question: string;
  description: string;
  end_date: string;
  initial_pool?: number;
}

export interface MarketUpdate {
  question?: string;
  description?: string;
  end_date?: string;
  resolution_source?: string;
}

export interface MarketResolve {
  outcome: boolean;
  resolution_source?: string;
}

/**
 * Fetch all users (admin only)
 */
export async function fetchUsers(): Promise<{ users: User[]; total: number }> {
  const { data } = await api.get<{ users: User[]; total: number }>("/admin/users");
  return data;
}

/**
 * Update a user (admin only)
 */
export async function updateUser(userId: number, userData: UserUpdate): Promise<User> {
  const { data } = await api.patch<User>(`/admin/users/${userId}`, userData);
  return data;
}

/**
 * Fetch all markets including resolved (admin only)
 */
export async function fetchAllMarkets(): Promise<Market[]> {
  const { data } = await api.get<Market[]>("/admin/markets");
  return data;
}

/**
 * Create a market (admin only)
 */
export async function createMarket(marketData: MarketCreate): Promise<Market> {
  const { data } = await api.post<Market>("/admin/markets", marketData);
  return data;
}

/**
 * Update a market (admin only)
 */
export async function updateMarket(marketId: number, marketData: MarketUpdate): Promise<Market> {
  const { data } = await api.patch<Market>(`/admin/markets/${marketId}`, marketData);
  return data;
}

/**
 * Delete a market (admin only)
 */
export async function deleteMarket(marketId: number): Promise<void> {
  await api.delete(`/admin/markets/${marketId}`);
}

/**
 * Resolve a market (admin only)
 */
export async function resolveMarket(marketId: number, resolveData: MarketResolve): Promise<Market> {
  const { data } = await api.post<Market>(`/admin/markets/${marketId}/resolve`, resolveData);
  return data;
}

// ============================================================
// Transaction Types & Functions
// ============================================================

export interface Transaction {
  id: number;
  user_id: number;
  username: string;
  amount: number;
  type: string;
  created_at: string;
}

export interface TransactionListResponse {
  transactions: Transaction[];
  total: number;
}

export interface TransactionFilters {
  user_id?: number;
  type?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fetch all transactions (admin only)
 */
export async function fetchTransactions(filters?: TransactionFilters): Promise<TransactionListResponse> {
  const params = new URLSearchParams();
  if (filters?.user_id) params.append("user_id", filters.user_id.toString());
  if (filters?.type) params.append("type", filters.type);
  if (filters?.limit) params.append("limit", filters.limit.toString());
  if (filters?.offset) params.append("offset", filters.offset.toString());

  const { data } = await api.get<TransactionListResponse>(`/admin/transactions?${params.toString()}`);
  return data;
}

// ============================================================
// Position Types & Functions
// ============================================================

export interface Position {
  id: number;
  user_id: number;
  username: string;
  market_id: number;
  market_question: string;
  shares_yes: number;
  shares_no: number;
}

export interface PositionListResponse {
  positions: Position[];
  total: number;
}

export interface PositionFilters {
  user_id?: number;
  market_id?: number;
  limit?: number;
  offset?: number;
}

/**
 * Fetch all positions (admin only)
 */
export async function fetchPositions(filters?: PositionFilters): Promise<PositionListResponse> {
  const params = new URLSearchParams();
  if (filters?.user_id) params.append("user_id", filters.user_id.toString());
  if (filters?.market_id) params.append("market_id", filters.market_id.toString());
  if (filters?.limit) params.append("limit", filters.limit.toString());
  if (filters?.offset) params.append("offset", filters.offset.toString());

  const { data } = await api.get<PositionListResponse>(`/admin/positions?${params.toString()}`);
  return data;
}

// ============================================================
// Admin Stats Types & Functions
// ============================================================

export interface AdminStats {
  total_users: number;
  total_markets: number;
  active_markets: number;
  resolved_markets: number;
  total_transactions: number;
  total_volume: number;
  total_positions: number;
  recent_transactions: Transaction[];
}

/**
 * Fetch admin dashboard stats (admin only)
 */
export async function fetchAdminStats(): Promise<AdminStats> {
  const { data } = await api.get<AdminStats>("/admin/stats");
  return data;
}

// ============================================================
// Export Functions
// ============================================================

/**
 * Export users as CSV (admin only)
 */
export async function exportUsersCSV(): Promise<void> {
  const response = await api.get("/admin/export/users", { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "users_export.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Export transactions as CSV (admin only)
 */
export async function exportTransactionsCSV(): Promise<void> {
  const response = await api.get("/admin/export/transactions", { responseType: "blob" });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "transactions_export.csv");
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default api;
