import {
  Building,
  FileText,
  Package,
  Ship,
  Globe,
  CheckCircle,
  DollarSign,
  BarChart,
  PenTool,
  FolderOpen,
  LogOut,
  User,
  AlertTriangle,
  TrendingUp,
  Wallet,
  ArrowRightLeft,
  PieChart,
  BarChart3,
  Target,
} from "lucide-react";
import metycleLogo from "@/assets/metycle-logo.png";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const tradesLogisticsItems = [
  { title: "Tickets", url: "/tickets", icon: FileText },
  { title: "Orders", url: "/inventory", icon: Package },
  { title: "Orders - BL Level", url: "/bl-level", icon: FileText },
];

const approvalsDocumentationItems = [
  { title: "Approvals", url: "/approvals", icon: CheckCircle },
  { title: "Signing", url: "/signing", icon: PenTool },
  { title: "Documentation", url: "/documentation", icon: FolderOpen },
];

const financeItems = [
  { title: "Cash & Equivalents", url: "/finance/cash-availability", icon: Wallet },
  { title: "Cash Flow View", url: "/finance/cash-flow", icon: ArrowRightLeft },
  { title: "Finance Overview", url: "/finance/overview", icon: PieChart },
  { title: "Returns", url: "/finance/returns", icon: BarChart3 },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { user, signOut } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const isTradesLogisticsActive = tradesLogisticsItems.some((item) => currentPath === item.url);

  const isApprovalsDocumentationActive = approvalsDocumentationItems.some((item) => currentPath === item.url);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logged out successfully");
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          <img 
            src={metycleLogo} 
            alt="Metycle" 
            className={open ? "h-16 w-auto" : "h-8 w-8 object-contain"}
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Companies */}
        <SidebarGroup>
          <SidebarGroupLabel>Companies</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/companies"
                    className="hover:bg-accent"
                    activeClassName="bg-accent text-accent-foreground font-medium"
                  >
                    <Building className="h-4 w-4" />
                    {open && <span>Companies</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Trades & Logistics */}
        <SidebarGroup>
          <SidebarGroupLabel>Trades & Logistics</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tradesLogisticsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-accent"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Shipments */}
        <SidebarGroup>
          <SidebarGroupLabel>Shipments</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/shipments"
                    className="hover:bg-accent"
                    activeClassName="bg-accent text-accent-foreground font-medium"
                  >
                    <Globe className="h-4 w-4" />
                    {open && <span>Shipments</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Approvals & Documentation */}
        <SidebarGroup>
          <SidebarGroupLabel>Approvals & Documentation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {approvalsDocumentationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-accent"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Finance & Trade Facilities */}
        <SidebarGroup>
          <SidebarGroupLabel>Finance & Trade Facilities</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {financeItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="hover:bg-accent"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Hedging */}
        <SidebarGroup>
          <SidebarGroupLabel>Hedging</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/hedging"
                    className="hover:bg-accent"
                    activeClassName="bg-accent text-accent-foreground font-medium"
                  >
                    <TrendingUp className="h-4 w-4" />
                    {open && <span>Requests & Ledger</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/hedging/exposure-management"
                    className="hover:bg-accent"
                    activeClassName="bg-accent text-accent-foreground font-medium"
                  >
                    <Target className="h-4 w-4" />
                    {open && <span>Exposure Management</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Claims */}
        <SidebarGroup>
          <SidebarGroupLabel>Claims</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/claims"
                    className="hover:bg-accent"
                    activeClassName="bg-accent text-accent-foreground font-medium"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {open && <span>Claims</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Reporting */}
        <SidebarGroup>
          <SidebarGroupLabel>Reporting</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/reporting"
                    className="hover:bg-accent"
                    activeClassName="bg-accent text-accent-foreground font-medium"
                  >
                    <BarChart className="h-4 w-4" />
                    {open && <span>Reporting</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {user && (
        <SidebarFooter className="border-t p-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
              <User className="h-4 w-4" />
              {open && <span className="truncate">{user.email}</span>}
            </div>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start">
              <LogOut className="h-4 w-4" />
              {open && <span className="ml-2">Log out</span>}
            </Button>
          </div>
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
