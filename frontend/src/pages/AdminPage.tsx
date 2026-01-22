import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  createMarket,
  deleteMarket,
  exportTransactionsCSV,
  exportUsersCSV,
  fetchAdminStats,
  fetchAllMarkets,
  fetchPositions,
  fetchTransactions,
  fetchUsers,
  resolveMarket,
  updateMarket,
  updateUser,
  type Market,
  type MarketCreate,
  type MarketUpdate,
  type PositionFilters,
  type TransactionFilters,
  type User,
  type UserUpdate
} from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate } from "react-router-dom";

// ============================================================
// Analytics Tab (Dashboard Overview)
// ============================================================

function AnalyticsTab() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: fetchAdminStats,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading statistics...</div>;
  }

  if (error) {
    return (
      <div className="text-destructive py-4">
        Failed to load stats: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardDescription>Total Users</CardDescription>
            <CardTitle className="text-3xl font-bold">{stats?.total_users ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardHeader className="pb-2">
            <CardDescription>Active Markets</CardDescription>
            <CardTitle className="text-3xl font-bold">{stats?.active_markets ?? 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats?.resolved_markets ?? 0} resolved
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardDescription>Total Volume</CardDescription>
            <CardTitle className="text-3xl font-bold">
              ${(stats?.total_volume ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {stats?.total_transactions ?? 0} transactions
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardHeader className="pb-2">
            <CardDescription>Active Positions</CardDescription>
            <CardTitle className="text-3xl font-bold">{stats?.total_positions ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest 10 transactions across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recent_transactions && stats.recent_transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recent_transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.username}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        tx.type === 'buy' ? 'bg-blue-500/20 text-blue-400' :
                        tx.type === 'sell' ? 'bg-orange-500/20 text-orange-400' :
                        tx.type === 'win' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-purple-500/20 text-purple-400'
                      }`}>
                        {tx.type.toUpperCase()}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono">${tx.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {new Date(tx.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">No recent transactions</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Transactions Tab
// ============================================================

function TransactionsTab() {
  const [filters, setFilters] = useState<TransactionFilters>({ limit: 50, offset: 0 });
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "transactions", filters, typeFilter],
    queryFn: () => fetchTransactions({
      ...filters,
      type: typeFilter === "all" ? undefined : typeFilter,
    }),
  });

  const handleExport = async () => {
    try {
      await exportTransactionsCSV();
    } catch (err) {
      console.error("Failed to export transactions:", err);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading transactions...</div>;
  }

  if (error) {
    return (
      <div className="text-destructive py-4">
        Failed to load transactions: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="buy">Buy</SelectItem>
              <SelectItem value="sell">Sell</SelectItem>
              <SelectItem value="win">Win</SelectItem>
              <SelectItem value="bonus">Bonus</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            Total: {data?.total ?? 0} transactions
          </span>
        </div>
        <Button variant="outline" onClick={handleExport}>
          📥 Export CSV
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.transactions.map((tx) => (
            <TableRow key={tx.id}>
              <TableCell className="font-mono">{tx.id}</TableCell>
              <TableCell className="font-medium">{tx.username}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  tx.type === 'buy' ? 'bg-blue-500/20 text-blue-400' :
                  tx.type === 'sell' ? 'bg-orange-500/20 text-orange-400' :
                  tx.type === 'win' ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-purple-500/20 text-purple-400'
                }`}>
                  {tx.type.toUpperCase()}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono">${tx.amount.toFixed(2)}</TableCell>
              <TableCell className="text-right text-muted-foreground">
                {new Date(tx.created_at).toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <Button
          variant="outline"
          disabled={!filters.offset || filters.offset === 0}
          onClick={() => setFilters(f => ({ ...f, offset: Math.max(0, (f.offset ?? 0) - 50) }))}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Showing {(filters.offset ?? 0) + 1} - {Math.min((filters.offset ?? 0) + 50, data?.total ?? 0)}
        </span>
        <Button
          variant="outline"
          disabled={(filters.offset ?? 0) + 50 >= (data?.total ?? 0)}
          onClick={() => setFilters(f => ({ ...f, offset: (f.offset ?? 0) + 50 }))}
        >
          Next
        </Button>
      </div>
    </>
  );
}

// ============================================================
// Positions Tab
// ============================================================

function PositionsTab() {
  const [filters, setFilters] = useState<PositionFilters>({ limit: 50, offset: 0 });

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "positions", filters],
    queryFn: () => fetchPositions(filters),
  });

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading positions...</div>;
  }

  if (error) {
    return (
      <div className="text-destructive py-4">
        Failed to load positions: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground">
          Total: {data?.total ?? 0} active positions
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>User</TableHead>
            <TableHead className="max-w-xs">Market</TableHead>
            <TableHead className="text-right">YES Shares</TableHead>
            <TableHead className="text-right">NO Shares</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.positions.map((pos) => (
            <TableRow key={pos.id}>
              <TableCell className="font-mono">{pos.id}</TableCell>
              <TableCell className="font-medium">{pos.username}</TableCell>
              <TableCell className="max-w-xs truncate" title={pos.market_question}>
                {pos.market_question}
              </TableCell>
              <TableCell className="text-right font-mono text-emerald-500">
                {pos.shares_yes > 0 ? pos.shares_yes.toFixed(2) : "-"}
              </TableCell>
              <TableCell className="text-right font-mono text-rose-500">
                {pos.shares_no > 0 ? pos.shares_no.toFixed(2) : "-"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <Button
          variant="outline"
          disabled={!filters.offset || filters.offset === 0}
          onClick={() => setFilters(f => ({ ...f, offset: Math.max(0, (f.offset ?? 0) - 50) }))}
        >
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Showing {(filters.offset ?? 0) + 1} - {Math.min((filters.offset ?? 0) + 50, data?.total ?? 0)}
        </span>
        <Button
          variant="outline"
          disabled={(filters.offset ?? 0) + 50 >= (data?.total ?? 0)}
          onClick={() => setFilters(f => ({ ...f, offset: (f.offset ?? 0) + 50 }))}
        >
          Next
        </Button>
      </div>
    </>
  );
}

// ============================================================
// Users Management Tab (Enhanced)
// ============================================================

function UsersTab() {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editBalance, setEditBalance] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: fetchUsers,
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, userData }: { userId: number; userData: UserUpdate }) =>
      updateUser(userId, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setEditingUser(null);
    },
  });

  const handleToggleAdmin = (user: User) => {
    updateMutation.mutate({
      userId: user.id,
      userData: { is_admin: !user.is_admin },
    });
  };

  const handleSaveBalance = () => {
    if (!editingUser) return;
    const balance = parseFloat(editBalance);
    if (isNaN(balance) || balance < 0) return;

    updateMutation.mutate({
      userId: editingUser.id,
      userData: { balance },
    });
  };

  const handleExport = async () => {
    try {
      await exportUsersCSV();
    } catch (err) {
      console.error("Failed to export users:", err);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading users...</div>;
  }

  if (error) {
    return (
      <div className="text-destructive py-4">
        Failed to load users: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  const users = data?.users ?? [];
  const filteredUsers = searchTerm
    ? users.filter(u => u.username.toLowerCase().includes(searchTerm.toLowerCase()))
    : users;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Input
          placeholder="Search by username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="outline" onClick={handleExport}>
          📥 Export CSV
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Username</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            <TableHead className="text-center">Admin</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-mono">{user.id}</TableCell>
              <TableCell className="font-medium">{user.username}</TableCell>
              <TableCell className="text-right font-mono">
                ${user.balance.toFixed(2)}
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={user.is_admin}
                  onCheckedChange={() => handleToggleAdmin(user)}
                  disabled={updateMutation.isPending}
                />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingUser(user);
                    setEditBalance(user.balance.toString());
                  }}
                >
                  Edit Balance
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Balance</DialogTitle>
            <DialogDescription>
              Editing balance for {editingUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="balance">New Balance ($)</Label>
              <Input
                id="balance"
                type="number"
                value={editBalance}
                onChange={(e) => setEditBalance(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBalance} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================
// Markets Management Tab (Enhanced)
// ============================================================

function MarketsTab() {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingMarket, setEditingMarket] = useState<Market | null>(null);
  const [resolvingMarket, setResolvingMarket] = useState<Market | null>(null);
  const [resolveOutcome, setResolveOutcome] = useState<string>("true");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Form state
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [endDate, setEndDate] = useState("");
  const [initialPool, setInitialPool] = useState("100");

  const { data: markets, isLoading, error } = useQuery({
    queryKey: ["admin", "markets"],
    queryFn: fetchAllMarkets,
  });

  const createMutation = useMutation({
    mutationFn: (data: MarketCreate) => createMarket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "markets"] });
      queryClient.invalidateQueries({ queryKey: ["markets"] });
      setShowCreateDialog(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ marketId, data }: { marketId: number; data: MarketUpdate }) =>
      updateMarket(marketId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "markets"] });
      queryClient.invalidateQueries({ queryKey: ["markets"] });
      setEditingMarket(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (marketId: number) => deleteMarket(marketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "markets"] });
      queryClient.invalidateQueries({ queryKey: ["markets"] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ marketId, outcome }: { marketId: number; outcome: boolean }) =>
      resolveMarket(marketId, { outcome }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "markets"] });
      queryClient.invalidateQueries({ queryKey: ["markets"] });
      setResolvingMarket(null);
    },
  });

  const resetForm = () => {
    setQuestion("");
    setDescription("");
    setEndDate("");
    setInitialPool("100");
  };

  const handleCreate = () => {
    createMutation.mutate({
      question,
      description,
      end_date: new Date(endDate).toISOString(),
      initial_pool: parseFloat(initialPool),
    });
  };

  const handleUpdate = () => {
    if (!editingMarket) return;
    updateMutation.mutate({
      marketId: editingMarket.id,
      data: {
        question,
        description,
        end_date: endDate ? new Date(endDate).toISOString() : undefined,
      },
    });
  };

  const handleResolve = () => {
    if (!resolvingMarket) return;
    resolveMutation.mutate({
      marketId: resolvingMarket.id,
      outcome: resolveOutcome === "true",
    });
  };

  const openEditDialog = (market: Market) => {
    setEditingMarket(market);
    setQuestion(market.question);
    setDescription(market.description);
    setEndDate(market.end_date.split("T")[0]);
  };

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading markets...</div>;
  }

  if (error) {
    return (
      <div className="text-destructive py-4">
        Failed to load markets: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

  const filteredMarkets = (markets ?? [])
    .filter(m => searchTerm ? m.question.toLowerCase().includes(searchTerm.toLowerCase()) : true)
    .filter(m => {
      if (statusFilter === "active") return !m.is_resolved;
      if (statusFilter === "resolved") return m.is_resolved;
      return true;
    });

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Input
            placeholder="Search markets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>+ Create Market</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Question</TableHead>
            <TableHead className="text-center">Status</TableHead>
            <TableHead className="text-right">YES %</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredMarkets.map((market) => (
            <TableRow key={market.id}>
              <TableCell className="font-mono">{market.id}</TableCell>
              <TableCell className="max-w-xs truncate">{market.question}</TableCell>
              <TableCell className="text-center">
                {market.is_resolved ? (
                  <span className={market.outcome ? "text-emerald-500" : "text-rose-500"}>
                    {market.outcome ? "YES" : "NO"}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Active</span>
                )}
              </TableCell>
              <TableCell className="text-right font-mono">
                {(market.prob_yes * 100).toFixed(1)}%
              </TableCell>
              <TableCell className="text-right space-x-2">
                {!market.is_resolved && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(market)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setResolvingMarket(market)}
                    >
                      Resolve
                    </Button>
                  </>
                )}
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate(market.id)}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Create Market Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Market</DialogTitle>
            <DialogDescription>
              Add a new prediction market for users to trade on.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Will Bitcoin reach $100k by 2025?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide context about the market..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initialPool">Initial Pool ($)</Label>
                <Input
                  id="initialPool"
                  type="number"
                  value={initialPool}
                  onChange={(e) => setInitialPool(e.target.value)}
                  min="1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending || !question || !endDate}>
              {createMutation.isPending ? "Creating..." : "Create Market"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Market Dialog */}
      <Dialog open={!!editingMarket} onOpenChange={(open) => !open && setEditingMarket(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Market</DialogTitle>
            <DialogDescription>Update market details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-question">Question</Label>
              <Input
                id="edit-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-endDate">End Date</Label>
              <Input
                id="edit-endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMarket(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Market Dialog */}
      <Dialog open={!!resolvingMarket} onOpenChange={(open) => !open && setResolvingMarket(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Market</DialogTitle>
            <DialogDescription className="line-clamp-2">
              {resolvingMarket?.question}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Outcome</Label>
              <Select value={resolveOutcome} onValueChange={setResolveOutcome}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">YES ✓</SelectItem>
                  <SelectItem value="false">NO ✗</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolvingMarket(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleResolve}
              disabled={resolveMutation.isPending}
              className={resolveOutcome === "true" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-rose-500 hover:bg-rose-600"}
            >
              {resolveMutation.isPending ? "Resolving..." : `Resolve as ${resolveOutcome === "true" ? "YES" : "NO"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================
// Admin Page
// ============================================================

export default function AdminPage() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect if not admin
  if (!user?.is_admin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="text-2xl">📈</span>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                PolyMOCK
              </h1>
            </Link>
            <span className="text-sm font-medium text-muted-foreground">/ Admin Panel</span>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm">
              ← Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Admin Dashboard</CardTitle>
            <CardDescription>Manage platform analytics, users, markets, transactions, and positions</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="analytics">
              <TabsList className="mb-6 grid w-full grid-cols-5">
                <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
                <TabsTrigger value="users">👥 Users</TabsTrigger>
                <TabsTrigger value="markets">🏪 Markets</TabsTrigger>
                <TabsTrigger value="transactions">💸 Transactions</TabsTrigger>
                <TabsTrigger value="positions">📍 Positions</TabsTrigger>
              </TabsList>

              <TabsContent value="analytics">
                <AnalyticsTab />
              </TabsContent>

              <TabsContent value="users">
                <UsersTab />
              </TabsContent>

              <TabsContent value="markets">
                <MarketsTab />
              </TabsContent>

              <TabsContent value="transactions">
                <TransactionsTab />
              </TabsContent>

              <TabsContent value="positions">
                <PositionsTab />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
