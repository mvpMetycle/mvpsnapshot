import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CompanyDetailDialog } from "./CompanyDetailDialog";
import { CreateCompanyDialog } from "./CreateCompanyDialog";
import { Building2, Plus, Search, Trash2 } from "lucide-react";
import Fuse from "fuse.js";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Company = {
  id: number;
  name: string;
  kyb_status: string | null;
  kyb_effective_date: string | null;
  risk_rating: string | null;
  credit_limit: number | null;
  current_exposure: number | null;
  trader_relationship_owner: string | null;
  amount_overdue: number | null;
  total_MT_loaded: number | null;
  total_MT_signed: number | null;
  country: string | null;
};

export const CompanyList = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data: companiesData, error: companiesError } = await supabase
        .from("Company")
        .select("id, name, kyb_status, kyb_effective_date, risk_rating, credit_limit, current_exposure, trader_relationship_owner, amount_overdue, total_MT_loaded, total_MT_signed");

      if (companiesError) throw companiesError;

      // Fetch addresses to get country
      const { data: addressesData, error: addressesError } = await supabase
        .from("Company_address")
        .select("company_id, country")
        .eq("is_primary", true);

      if (addressesError) throw addressesError;

      // Map addresses to companies
      const addressMap = new Map(addressesData?.map(addr => [addr.company_id, addr.country]) || []);
      
      const companiesWithCountry = companiesData?.map(company => ({
        ...company,
        country: addressMap.get(company.id) || null,
      })) || [];

      setCompanies(companiesWithCountry);
    } catch (error) {
      console.error("Error fetching companies:", error);
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const getKybStatusVariant = (status: string | null): "success" | "destructive" | "secondary" => {
    switch (status) {
      case "Approved":
        return "success";
      case "Rejected":
        return "destructive";
      case "Needs Review":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const calculateMTRatio = (loaded: number | null, signed: number | null) => {
    if (!loaded || !signed || signed === 0) return "-";
    const ratio = (loaded / signed) * 100;
    return `${ratio.toFixed(1)}%`;
  };

  const fuse = useMemo(() => {
    return new Fuse(companies, {
      keys: [
        { name: "name", weight: 2 },
        { name: "country", weight: 1 },
        { name: "trader_relationship_owner", weight: 1 },
        { name: "risk_rating", weight: 0.5 },
      ],
      threshold: 0.4,
      includeScore: true,
      minMatchCharLength: 2,
    });
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    
    const results = fuse.search(searchQuery);
    return results.map(result => result.item);
  }, [companies, searchQuery, fuse]);

  const handleDeleteClick = (e: React.MouseEvent, company: Company) => {
    e.stopPropagation(); // Prevent row click
    setCompanyToDelete(company);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!companyToDelete) return;

    try {
      // Delete related records first (foreign key constraints)
      // Delete company documents
      await supabase
        .from("company_documents")
        .delete()
        .eq("company_id", companyToDelete.id);

      // Delete company notes
      await supabase
        .from("company_notes")
        .delete()
        .eq("company_id", companyToDelete.id);

      // Delete company addresses
      await supabase
        .from("Company_address")
        .delete()
        .eq("company_id", companyToDelete.id);

      // Now delete the company
      const { error } = await supabase
        .from("Company")
        .delete()
        .eq("id", companyToDelete.id);

      if (error) throw error;

      toast.success(`${companyToDelete.name} deleted successfully`);
      fetchCompanies();
    } catch (error) {
      console.error("Error deleting company:", error);
      toast.error("Failed to delete company. It may have linked tickets or orders.");
    } finally {
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
    }
  };

  return (
    <>
      <Card className="border-border/50 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl font-semibold">Companies</CardTitle>
            </div>
            <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Company
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by company name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading companies...</div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "No companies found matching your search" : "No companies found"}
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-muted/50">
                    <TableHead className="font-semibold">Company Name</TableHead>
                    <TableHead className="font-semibold">Country</TableHead>
                    <TableHead className="font-semibold">KYB Status</TableHead>
                    <TableHead className="font-semibold">KYB Date</TableHead>
                    <TableHead className="font-semibold">Risk Rating</TableHead>
                    <TableHead className="font-semibold">Credit Limit</TableHead>
                    <TableHead className="font-semibold">Exposure</TableHead>
                    <TableHead className="font-semibold">Trader</TableHead>
                    <TableHead className="font-semibold">Overdue Amount</TableHead>
                    <TableHead className="font-semibold">MT Loaded/Signed</TableHead>
                    <TableHead className="font-semibold w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => (
                    <TableRow
                      key={company.id}
                      className="cursor-pointer hover:bg-accent/5"
                      onClick={() => setSelectedCompanyId(company.id)}
                    >
                      <TableCell className="font-medium">{company.name}</TableCell>
                      <TableCell>{company.country || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={getKybStatusVariant(company.kyb_status)}>
                          {company.kyb_status || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(company.kyb_effective_date)}</TableCell>
                      <TableCell>{company.risk_rating || "-"}</TableCell>
                      <TableCell>{formatCurrency(company.credit_limit)}</TableCell>
                      <TableCell>{formatCurrency(company.current_exposure)}</TableCell>
                      <TableCell>{company.trader_relationship_owner || "-"}</TableCell>
                      <TableCell>{formatCurrency(company.amount_overdue)}</TableCell>
                      <TableCell>{calculateMTRatio(company.total_MT_loaded, company.total_MT_signed)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDeleteClick(e, company)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CompanyDetailDialog
        companyId={selectedCompanyId!}
        open={!!selectedCompanyId}
        onOpenChange={(open) => !open && setSelectedCompanyId(null)}
      />

      <CreateCompanyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={fetchCompanies}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Company</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{companyToDelete?.name}</strong>? 
              This action cannot be undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
