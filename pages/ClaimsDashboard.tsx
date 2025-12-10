import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Search,
  Eye,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  BarChart3,
  PieChart,
} from "lucide-react";
import { differenceInDays, format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

type ClaimStatus = 
  | "draft"
  | "preliminary_submitted"
  | "formal_submitted"
  | "under_supplier_review"
  | "accepted"
  | "rejected"
  | "counter_offer"
  | "settled"
  | "closed";

export default function ClaimsDashboard() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [buyerFilter, setBuyerFilter] = useState<string>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");

  const { data: claims, isLoading } = useQuery({
    queryKey: ["all-claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select(`
          *,
          buyer:Company!claims_buyer_id_fkey(id, name),
          supplier:Company!claims_supplier_id_fkey(id, name),
          trader:traders!claims_assigned_trader_id_fkey(id, name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: companies } = useQuery({
    queryKey: ["companies-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("Company")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const filteredClaims = claims?.filter((claim) => {
    const matchesSearch =
      !searchTerm ||
      claim.claim_reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.bl_order_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.buyer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      claim.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || claim.status === statusFilter;
    const matchesBuyer = buyerFilter === "all" || claim.buyer_id?.toString() === buyerFilter;
    const matchesSupplier = supplierFilter === "all" || claim.supplier_id?.toString() === supplierFilter;

    return matchesSearch && matchesStatus && matchesBuyer && matchesSupplier;
  });

  const formatCurrency = (amount: number | null, currency: string | null) => {
    if (amount === null) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadgeColor = (status: string) => {
    // Normalize status - treat any value other than Closed/closed as Open
    const normalizedStatus = status === "Closed" || status === "closed" ? "Closed" : "Open";
    const colors: Record<string, string> = {
      Open: "bg-yellow-500/10 text-yellow-600",
      Closed: "bg-green-500/10 text-green-600",
    };
    return colors[normalizedStatus] || "bg-muted text-muted-foreground";
  };

  // Calculate stats
  const totalClaims = claims?.length || 0;
  const totalClaimedAmount = claims?.reduce((sum, c) => sum + (c.claimed_value_amount || 0), 0) || 0;
  const totalSettledAmount = claims?.reduce((sum, c) => sum + (c.final_settlement_amount || 0), 0) || 0;
  const openClaims = claims?.filter((c) => c.status !== "closed").length || 0;
  const overdueClaims = claims?.filter((c) => {
    if (!c.ata || c.status === "closed") return false;
    return differenceInDays(new Date(), new Date(c.ata)) > 7;
  }).length || 0;

  // Chart data - Status distribution
  const statusDistribution = claims?.reduce((acc: Record<string, number>, claim) => {
    acc[claim.status] = (acc[claim.status] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(statusDistribution || {}).map(([name, value]) => ({
    name: name.replace(/_/g, " "),
    value,
  }));

  // Metycle brand colors
  const PIE_COLORS = ["#255659", "#70F3DC", "#1a7f84", "#3d9ca1", "#5cbfc4", "#E2FAFF"];

  // Chart data - Claims by commodity
  const commodityDistribution = claims?.reduce((acc: Record<string, number>, claim) => {
    const commodity = claim.commodity_type || "Unknown";
    acc[commodity] = (acc[commodity] || 0) + 1;
    return acc;
  }, {});

  const barData = Object.entries(commodityDistribution || {}).map(([name, value]) => ({
    name,
    claims: value,
  }));

  // Chart data - Claims by month
  const monthlyData = claims?.reduce((acc: Record<string, number>, claim) => {
    const month = format(new Date(claim.created_at), "MMM yyyy");
    acc[month] = (acc[month] || 0) + 1;
    return acc;
  }, {});

  const lineData = Object.entries(monthlyData || {})
    .map(([name, claims]) => ({ name, claims }))
    .slice(-6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-orange-500" />
          <div>
            <h1 className="text-3xl font-bold">Claims Dashboard</h1>
            <p className="text-muted-foreground">Manage and track all claims across orders</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Claims</p>
                <p className="text-2xl font-bold">{totalClaims}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Claimed</p>
                <p className="text-2xl font-bold">{formatCurrency(totalClaimedAmount, "USD")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Settled</p>
                <p className="text-2xl font-bold">{formatCurrency(totalSettledAmount, "USD")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open Claims</p>
                <p className="text-2xl font-bold">{openClaims}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold">{overdueClaims}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bar Chart - Claims by Commodity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-4 w-4" />
              Claims by Commodity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="claims" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart - Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-4 w-4" />
              Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${value}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Line Chart - Claims Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Claims by Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="claims" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search claims..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="preliminary_submitted">Preliminary Submitted</SelectItem>
                <SelectItem value="formal_submitted">Formal Submitted</SelectItem>
                <SelectItem value="under_supplier_review">Under Review</SelectItem>
                <SelectItem value="accepted">Accepted</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="counter_offer">Counter Offer</SelectItem>
                <SelectItem value="settled">Settled</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={buyerFilter} onValueChange={setBuyerFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Buyers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buyers</SelectItem>
                {companies?.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={supplierFilter} onValueChange={setSupplierFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Suppliers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Suppliers</SelectItem>
                {companies?.map((company) => (
                  <SelectItem key={company.id} value={company.id.toString()}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Claims Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Claims</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredClaims && filteredClaims.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>BL Number</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Arrived On</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Claimed</TableHead>
                  <TableHead>Settlement</TableHead>
                  <TableHead>Days from ATA</TableHead>
                  <TableHead>Days from Claim</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Trader</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClaims.map((claim) => (
                  <TableRow key={claim.id}>
                    <TableCell className="font-medium">{claim.claim_reference}</TableCell>
                    <TableCell>{claim.bl_order_name || "—"}</TableCell>
                    <TableCell>{claim.buyer?.name || "—"}</TableCell>
                    <TableCell>{claim.supplier?.name || "—"}</TableCell>
                    <TableCell>{formatDate(claim.ata)}</TableCell>
                    <TableCell className="capitalize">{claim.claim_type?.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-orange-600 font-medium">
                      {formatCurrency(claim.claimed_value_amount, claim.claimed_value_currency)}
                    </TableCell>
                    <TableCell className="text-green-600 font-medium">
                      {formatCurrency(claim.final_settlement_amount, claim.final_settlement_currency)}
                    </TableCell>
                    <TableCell className="text-center">
                      {claim.days_to_resolve_since_ata !== null ? claim.days_to_resolve_since_ata : "—"}
                    </TableCell>
                    <TableCell className="text-center">
                      {claim.days_to_resolve_since_claim !== null ? claim.days_to_resolve_since_claim : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(claim.status)}>
                        {claim.status === "closed" ? "Closed" : "Open"}
                      </Badge>
                    </TableCell>
                    <TableCell>{claim.trader?.name || "—"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/claims/${claim.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No claims found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
