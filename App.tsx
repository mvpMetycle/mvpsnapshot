import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import Auth from "./pages/Auth";
import Companies from "./pages/Companies";
import Tickets from "./pages/Tickets";
import Inventory from "./pages/Inventory";
import OrderDetail from "./pages/OrderDetail";
import BLLevel from "./pages/BLLevel";
import BLOrderDetail from "./pages/BLOrderDetail";
import Shipments from "./pages/Shipments";
import Approvals from "./pages/Approvals";
import Signing from "./pages/Signing";
import Documentation from "./pages/Documentation";
import CashAvailability from "./pages/finance/CashAvailability";
import CashFlowView from "./pages/finance/CashFlowView";
import FinanceOverview from "./pages/finance/FinanceOverview";
import Returns from "./pages/finance/Returns";
import Hedging from "./pages/Hedging";
import ExposureManagement from "./pages/ExposureManagement";
import Reporting from "./pages/Reporting";
import Claims from "./pages/Claims";
import ClaimsDashboard from "./pages/ClaimsDashboard";
import ClaimDetail from "./pages/ClaimDetail";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Navigate to="/companies" replace />} />
          <Route
            path="/*"
            element={
              <AppLayout>
                <Routes>
                  <Route path="/companies" element={<Companies />} />
                  <Route path="/tickets" element={<Tickets />} />
                  <Route path="/inventory" element={<Inventory />} />
                  <Route path="/inventory/:orderId" element={<OrderDetail />} />
                  <Route path="/bl-level" element={<BLLevel />} />
                  <Route path="/bl-orders/:blOrderId" element={<BLOrderDetail />} />
                  <Route path="/shipments" element={<Shipments />} />
                  <Route path="/approvals" element={<Approvals />} />
                  <Route path="/signing" element={<Signing />} />
                  <Route path="/documentation" element={<Documentation />} />
                  <Route path="/finance/cash-availability" element={<CashAvailability />} />
                  <Route path="/finance/cash-flow" element={<CashFlowView />} />
                  <Route path="/finance/overview" element={<FinanceOverview />} />
                  <Route path="/finance/returns" element={<Returns />} />
                  <Route path="/hedging" element={<Hedging />} />
                  <Route path="/hedging/exposure-management" element={<ExposureManagement />} />
                  <Route path="/reporting" element={<Reporting />} />
                  <Route path="/claims" element={<ClaimsDashboard />} />
                  <Route path="/claims/:claimId" element={<ClaimDetail />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
