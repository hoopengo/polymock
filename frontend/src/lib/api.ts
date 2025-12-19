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

// ============================================================
// API Functions
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
