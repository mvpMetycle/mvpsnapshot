import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight, Upload, Loader2, Plus, Pencil, Trash2, Search, FileCheck, FileX, FileText } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Fuse from "fuse.js";
import { EditBLOrderDialog } from "@/components/EditBLOrderDialog";
import { BLExtractionFormDialog } from "@/components/BLExtractionFormDialog";
import { AllocateBLDialog } from "@/components/AllocateBLDialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteWithReasonDialog } from "@/components/DeleteWithReasonDialog";
import { checkBLOrderDeletable, softDeleteBLOrder } from "@/hooks/useDeleteEntity";

export default function OrderBLLevel() {
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [editingBLOrder, setEditingBLOrder] = useState<any>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [deletingBLOrder, setDeletingBLOrder] = useState<any>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<string>("");
  const [blExtractionDialogOpen, setBLExtractionDialogOpen] = useState(false);
  const [selectedBLForExtraction, setSelectedBLForExtraction] = useState<{ blOrderId?: number; blNumber?: string; existingData?: any }>({});
  const [allocateDialogOpen, setAllocateDialogOpen] = useState(false);
  const [uploadingForBLOrderId, setUploadingForBLOrderId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: blOrders, isLoading } = useQuery({
    queryKey: ["bl-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bl_order")
        .select("*")
        .is("deleted_at", null)
        .order("order_id");

      if (error) throw error;
      return data || [];
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["orders-for-bl"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order")
        .select("id, allocated_quantity_mt, commodity_type, transaction_type, buyer, seller");

      if (error) throw error;
      return data || [];
    },
  });

  const { data: traders } = useQuery({
    queryKey: ["traders-for-bl"],
    queryFn: async () => {
      const { data, error } = await supabase.from("traders").select("id, name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: tickets } = useQuery({
    queryKey: ["tickets-for-bl"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket")
        .select("id, trader_id");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: generatedDocs } = useQuery({
    queryKey: ["generated-docs-for-bl"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_documents")
        .select("bl_order_id, id, document_name, document_url");
      if (error) throw error;
      return data || [];
    },
  });

  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteBLOrder = async (reason: string) => {
    if (!deletingBLOrder) return;

    setIsDeleting(true);
    try {
      // Check referential integrity first
      const { canDelete, reason: blockReason } = await checkBLOrderDeletable(
        deletingBLOrder.id, 
        deletingBLOrder.bl_order_name
      );
      
      if (!canDelete) {
        toast({
          title: "Cannot delete BL Order",
          description: blockReason,
          variant: "destructive",
        });
        return;
      }

      // Perform soft delete with reason
      await softDeleteBLOrder(deletingBLOrder.id, reason);
      
      queryClient.invalidateQueries({ queryKey: ["bl-orders"] });
      toast({ title: "BL Order deleted successfully" });
    } catch (error: any) {
      toast({
        title: "Cannot delete BL Order",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeletingBLOrder(null);
    }
  };

  const toggleOrder = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const formatAmount = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Group BL orders by order_id
  const groupedBLOrders = blOrders?.reduce((acc, bl) => {
    const orderId = bl.order_id || "Unknown";
    if (!acc[orderId]) {
      acc[orderId] = [];
    }
    acc[orderId].push(bl);
    return acc;
  }, {} as Record<string, typeof blOrders>);

  // Set up fuzzy search with Fuse.js
  const fuse = useMemo(() => {
    if (!blOrders) return null;
    return new Fuse(blOrders, {
      keys: [
        "order_id",
        "bl_order_name",
        "bl_number",
        "status",
        "port_of_loading",
        "port_of_discharge",
        "final_destination",
      ],
      threshold: 0.3,
      ignoreLocation: true,
      includeScore: true,
    });
  }, [blOrders]);

  // Filter and group BL orders based on search
  const filteredGroupedBLOrders = useMemo(() => {
    if (!searchQuery || !fuse) {
      return groupedBLOrders;
    }

    const searchResults = fuse.search(searchQuery);
    const matchingBLOrders = searchResults.map(result => result.item);

    return matchingBLOrders.reduce((acc, bl) => {
      const orderId = bl.order_id || "Unknown";
      if (!acc[orderId]) {
        acc[orderId] = [];
      }
      acc[orderId].push(bl);
      return acc;
    }, {} as Record<string, typeof blOrders>);
  }, [groupedBLOrders, searchQuery, fuse]);

  const getOrderStats = (orderId: string) => {
    const orderData = orders?.find((o) => o.id === orderId);
    const totalQuantity = orderData?.allocated_quantity_mt || 0;
    const blOrdersForOrder = groupedBLOrders?.[orderId] || [];
    const loadedQuantity = blOrdersForOrder.reduce(
      (sum, bl) => sum + (bl.loaded_quantity_mt || 0),
      0
    );
    const percentage = totalQuantity > 0 ? (loadedQuantity / totalQuantity) * 100 : 0;
    const remaining = totalQuantity - loadedQuantity;
    const blCount = blOrdersForOrder.length;
    
    // Get next ETA from BL orders
    const futureETAs = blOrdersForOrder
      .filter(bl => bl.eta && new Date(bl.eta) >= new Date())
      .map(bl => new Date(bl.eta!))
      .sort((a, b) => a.getTime() - b.getTime());
    const nextETA = futureETAs[0] ? futureETAs[0].toISOString().split('T')[0] : null;

    return { totalQuantity, loadedQuantity, percentage, remaining, blCount, nextETA };
  };

  const getTraderForOrder = (orderId: string) => {
    const order = orders?.find(o => o.id === orderId);
    if (!order) return "—";
    
    const ticketIds = [
      ...(order.buyer?.split(",").map(id => parseInt(id.trim())).filter(Boolean) || []),
      ...(order.seller?.split(",").map(id => parseInt(id.trim())).filter(Boolean) || []),
    ];
    
    const traderIds = tickets?.filter(t => ticketIds.includes(t.id)).map(t => t.trader_id).filter(Boolean) || [];
    const traderNames = traders?.filter(t => traderIds.includes(t.id)).map(t => t.name) || [];
    return [...new Set(traderNames)].join(", ") || "—";
  };

  const getBLPercentOfOrder = (bl: any, orderId: string) => {
    const orderData = orders?.find((o) => o.id === orderId);
    const totalQuantity = orderData?.allocated_quantity_mt || 0;
    if (totalQuantity === 0) return 0;
    return ((bl.loaded_quantity_mt || 0) / totalQuantity) * 100;
  };

  const getDocsForBL = (blOrderId: number, blUrl: string | null) => {
    const docs = generatedDocs?.filter(d => d.bl_order_id === blOrderId) || [];
    const allDocs = blUrl 
      ? [{ id: 'bl-pdf', document_name: 'Bill of Lading (PDF)', document_url: blUrl, is_bl: true }, ...docs]
      : docs;
    return allDocs;
  };
  
  const getDocsStatus = (blOrderId: number, blUrl: string | null) => {
    const docs = getDocsForBL(blOrderId, blUrl);
    return docs.length >= 4 ? "Complete" : "Missing";
  };

  const handleViewDocument = async (documentUrl: string, isBl?: boolean) => {
    try {
      const bucket = isBl ? 'bl-documents' : 'signed-documents';
      const { data } = await supabase.storage
        .from(bucket)
        .createSignedUrl(documentUrl, 60);
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      toast({ title: "Failed to open document", variant: "destructive" });
    }
  };

  const getStatusBadgeVariant = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "landed":
        return "default";
      case "on board":
      case "in transit":
        return "secondary";
      case "pending":
        return "outline";
      default:
        return "outline";
    }
  };

  const handlePDFUpload = async (file: File, retryCount = 0) => {
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF file.",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    setExtractionProgress("Uploading PDF...");

    try {
      const formData = new FormData();
      formData.append('file', file);

      setExtractionProgress("Extracting data from Bill of Lading...");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      let response;
      try {
        response = await fetch(
          'https://tbwkhqvrqhagoswehrkx.supabase.co/functions/v1/extract-bol',
          {
            method: 'POST',
            body: formData,
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          if (retryCount < 2) {
            const waitTime = Math.pow(2, retryCount) * 1000;
            toast({
              title: "Processing Timeout",
              description: `Retrying... (Attempt ${retryCount + 2}/3)`,
            });
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return handlePDFUpload(file, retryCount + 1);
          }
          throw new Error('Extraction timeout after multiple attempts.');
        }
        throw fetchError;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to extract BoL data');
      }

      const result = await response.json();

      setExtractionProgress("Saving extracted data...");

      const extractedBLNumber = result.data.basic_information?.bl_number;

      const { data: createdBLOrder, error: blOrderError } = await supabase
        .from('bl_order')
        .insert({
          bl_order_name: null,
          order_id: null,
          status: result.data.basic_information?.status || 'Pending',
          bl_number: extractedBLNumber,
          bl_issue_date: result.data.basic_information?.bl_issue_date,
          port_of_loading: result.data.shipping_information?.port_of_loading,
          port_of_discharge: result.data.shipping_information?.port_of_discharge,
          final_destination: result.data.shipping_information?.final_destination,
          loading_date: result.data.shipping_information?.loading_date,
          etd: result.data.schedule?.etd,
          atd: result.data.schedule?.atd,
          eta: result.data.schedule?.eta,
          ata: result.data.schedule?.ata,
          loaded_quantity_mt: result.data.quantities?.total_quantity_mt,
        })
        .select()
        .single();

      if (blOrderError) throw blOrderError;

      const filePath = `${createdBLOrder.id}/${Date.now()}_${file.name}`;
      
      await supabase.storage.from('bl-documents').upload(filePath, file);
      await supabase.from('bl_order').update({ bl_url: filePath }).eq('id', createdBLOrder.id);

      await supabase.from('bl_extraction').insert({
        bl_order_id: createdBLOrder.id,
        bl_number: extractedBLNumber,
        bl_issue_date: result.data.basic_information?.bl_issue_date,
        shipper: result.data.shipping_information?.shipper,
        shipping_line: result.data.shipping_information?.shipping_line,
        product_description: result.data.quantities?.commodity_description,
        country_of_origin: result.data.shipping_information?.country_of_origin,
        final_destination: result.data.shipping_information?.final_destination,
        port_of_loading: result.data.shipping_information?.port_of_loading,
        port_of_discharge: result.data.shipping_information?.port_of_discharge,
        total_net_weight: result.data.quantities?.total_quantity_mt,
        number_of_containers: result.data.quantities?.container_count,
        vessel_name: result.data.shipping_information?.vessel_name,
      });

      if (result.data.containers?.length > 0) {
        const containerInserts = result.data.containers.map((container: any) => ({
          bl_order_id: createdBLOrder.id,
          bl_number: extractedBLNumber,
          container_number: container.container_number,
          seal_number: container.seal_number,
          net_weight: container.net_weight,
          gross_weight: container.gross_weight,
        }));

        await supabase.from('bl_extraction_container').insert(containerInserts);
      }

      await queryClient.invalidateQueries({ queryKey: ["bl-orders"] });

      toast({
        title: "BL Created",
        description: "New BL order created with extracted data.",
      });

    } catch (error) {
      console.error('Upload and extraction error:', error);
      toast({
        title: "Failed",
        description: error instanceof Error ? error.message : "Failed to create BL from PDF",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
      setExtractionProgress("");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const orderIds = Object.keys(filteredGroupedBLOrders || {});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-foreground">Order – BL Level</h2>
        <div className="flex items-center gap-2">
          <input
            type="file"
            id="bl-pdf-upload"
            className="hidden"
            accept=".pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePDFUpload(file);
            }}
          />
          <Button
            onClick={() => document.getElementById('bl-pdf-upload')?.click()}
            disabled={isExtracting}
          >
            {isExtracting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {extractionProgress || "Processing..."}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload & Create BL
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="w-72 space-y-2">
          <Label>Search Orders & BLs</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, BL number, port, trader..."
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Order Type</TableHead>
              <TableHead>Commodity</TableHead>
              <TableHead>Quantity (MT)</TableHead>
              <TableHead>% Filled</TableHead>
              <TableHead>Trader</TableHead>
              <TableHead>Next ETA</TableHead>
              <TableHead># of BL groups</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orderIds.length > 0 ? (
              orderIds.map((orderId) => {
                const isExpanded = expandedOrders.has(orderId);
                const orderData = orders?.find((o) => o.id === orderId);
                const blOrdersList = filteredGroupedBLOrders?.[orderId] || [];
                const stats = getOrderStats(orderId);
                const isUnknownOrder = orderId === "Unknown";

                return (
                  <>
                    {/* Parent Order Row */}
                    <TableRow
                      key={orderId}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleOrder(orderId)}
                    >
                      <TableCell className="w-10">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {orderId}
                          {isUnknownOrder && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAllocateDialogOpen(true);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Allocate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          orderData?.transaction_type === "B2B" 
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : orderData?.transaction_type === "Inventory" || orderData?.transaction_type === "INVENTORY"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        }`}>
                          {orderData?.transaction_type || (isUnknownOrder ? "Unassigned" : "B2B")}
                        </span>
                      </TableCell>
                      <TableCell>{orderData?.commodity_type || "—"}</TableCell>
                      <TableCell>{formatAmount(stats.totalQuantity)}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={stats.percentage >= 100 ? "default" : stats.percentage > 0 ? "secondary" : "outline"}
                          className="font-mono"
                        >
                          {stats.percentage.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{getTraderForOrder(orderId)}</TableCell>
                      <TableCell>{stats.nextETA ? formatDate(stats.nextETA) : "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{stats.blCount}</Badge>
                      </TableCell>
                    </TableRow>

                    {/* Expanded BL Details */}
                    {isExpanded && (
                      <TableRow key={`${orderId}-expanded`}>
                        <TableCell colSpan={9} className="p-0">
                          <div className="bg-muted/30 mx-2 mb-2 rounded-b-lg overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>BL Order Name</TableHead>
                                  <TableHead>BL Number</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Loaded (MT)</TableHead>
                                  <TableHead>% of Order</TableHead>
                                  <TableHead>ETD</TableHead>
                                  <TableHead>ETA</TableHead>
                                  <TableHead>ATA</TableHead>
                                  <TableHead>Docs</TableHead>
                                  <TableHead className="w-20"></TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {blOrdersList.map((bl) => {
                                  const percentOfOrder = getBLPercentOfOrder(bl, orderId);
                                  const docsStatus = getDocsStatus(bl.id, bl.bl_url);
                                  const docsForBL = getDocsForBL(bl.id, bl.bl_url);
                                  
                                  return (
                                    <ContextMenu key={bl.id}>
                                      <ContextMenuTrigger asChild>
                                        <TableRow className="group hover:bg-muted/50">
                                          <TableCell 
                                            className="font-medium text-primary cursor-pointer hover:underline"
                                            onClick={() => navigate(`/bl-orders/${bl.id}`)}
                                          >
                                            {bl.bl_order_name || "—"}
                                          </TableCell>
                                          <TableCell>{bl.bl_number || "—"}</TableCell>
                                          <TableCell>
                                            <Badge variant={getStatusBadgeVariant(bl.status)} className="text-xs">
                                              {bl.status || "Pending"}
                                            </Badge>
                                          </TableCell>
                                          <TableCell>{formatAmount(bl.loaded_quantity_mt)}</TableCell>
                                          <TableCell>
                                            <Badge variant="outline" className="text-xs font-mono">
                                              {percentOfOrder.toFixed(1)}%
                                            </Badge>
                                          </TableCell>
                                          <TableCell>{formatDate(bl.etd)}</TableCell>
                                          <TableCell>{formatDate(bl.eta)}</TableCell>
                                          <TableCell>{formatDate(bl.ata)}</TableCell>
                                          <TableCell onClick={(e) => e.stopPropagation()}>
                                            <Popover>
                                              <PopoverTrigger asChild>
                                                <button className="flex items-center gap-1.5 hover:bg-muted px-2 py-1 rounded-md transition-colors cursor-pointer">
                                                  {docsStatus === "Complete" ? (
                                                    <FileCheck className="h-4 w-4 text-green-600" />
                                                  ) : (
                                                    <FileX className="h-4 w-4 text-orange-500" />
                                                  )}
                                                  <span className={`text-xs ${docsStatus === "Complete" ? "text-green-600" : "text-orange-500"}`}>
                                                    {docsStatus}
                                                  </span>
                                                  <Badge variant="outline" className="ml-1 h-5 min-w-5 text-xs">
                                                    {docsForBL.length}
                                                  </Badge>
                                                </button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-72 p-2" align="start">
                                                <div className="space-y-1">
                                                  <p className="text-xs font-semibold text-muted-foreground mb-2 px-2">
                                                    Documents ({docsForBL.length})
                                                  </p>
                                                  {docsForBL.length > 0 ? (
                                                    docsForBL.map((doc: any) => (
                                                      <button
                                                        key={doc.id}
                                                        className="flex items-center gap-2 w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted transition-colors"
                                                        onClick={() => handleViewDocument(doc.document_url, doc.is_bl)}
                                                      >
                                                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                                        <span className="truncate">{doc.document_name}</span>
                                                      </button>
                                                    ))
                                                  ) : (
                                                    <p className="text-xs text-muted-foreground px-2 py-2">No documents uploaded</p>
                                                  )}
                                                </div>
                                              </PopoverContent>
                                            </Popover>
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingBLOrder(bl);
                                                }}
                                              >
                                                <Pencil className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setDeletingBLOrder(bl);
                                                }}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                            </TableCell>
                                          </TableRow>
                                        </ContextMenuTrigger>
                                        <ContextMenuContent>
                                          <ContextMenuItem onClick={() => navigate(`/bl-orders/${bl.id}`)}>
                                            View Details
                                          </ContextMenuItem>
                                          <ContextMenuItem onClick={() => setEditingBLOrder(bl)}>
                                            Edit BL Order
                                          </ContextMenuItem>
                                          <ContextMenuItem 
                                            onClick={() => setDeletingBLOrder(bl)}
                                            className="text-destructive"
                                          >
                                            Delete BL Order
                                          </ContextMenuItem>
                                        </ContextMenuContent>
                                      </ContextMenu>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-12">
                  {searchQuery
                    ? "No orders match your search criteria."
                    : "No BL orders found. Upload a Bill of Lading to get started."
                  }
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      {editingBLOrder && (
        <EditBLOrderDialog
          blOrder={editingBLOrder}
          open={!!editingBLOrder}
          onOpenChange={(open) => {
            if (!open) {
              setEditingBLOrder(null);
              setExtractedData(null);
            }
          }}
          extractedData={extractedData}
        />
      )}

      <DeleteWithReasonDialog
        entityLabel="BL Order"
        open={!!deletingBLOrder}
        onOpenChange={(open) => !open && setDeletingBLOrder(null)}
        onConfirm={handleDeleteBLOrder}
        isDeleting={isDeleting}
      />

      <BLExtractionFormDialog
        open={blExtractionDialogOpen}
        onOpenChange={setBLExtractionDialogOpen}
        blOrderId={selectedBLForExtraction.blOrderId}
        blNumber={selectedBLForExtraction.blNumber}
        existingData={selectedBLForExtraction.existingData}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["bl-extractions"] });
          queryClient.invalidateQueries({ queryKey: ["bl-containers"] });
        }}
      />

      <AllocateBLDialog
        open={allocateDialogOpen}
        onOpenChange={setAllocateDialogOpen}
        unknownBLOrders={groupedBLOrders?.["Unknown"] || []}
      />
    </div>
  );
}
