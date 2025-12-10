import { CompanyList } from "@/components/CompanyList";
import { TicketList } from "@/components/TicketList";
import { ApprovalsList } from "@/components/ApprovalsList";
import { OrdersList } from "@/components/OrdersList";
import OrderBLLevel from "@/pages/OrderBLLevel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">METYCLE Trading Platform</h1>
        </div>

        <Tabs defaultValue="companies" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="companies">Companies</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="approvals">Approvals</TabsTrigger>
            <TabsTrigger value="inventory">Inventory Management</TabsTrigger>
            <TabsTrigger value="bl-level">Order - BL Level</TabsTrigger>
          </TabsList>
          
          <TabsContent value="companies">
            <CompanyList />
          </TabsContent>
          
          <TabsContent value="tickets">
            <TicketList />
          </TabsContent>

          <TabsContent value="approvals">
            <ApprovalsList />
          </TabsContent>

          <TabsContent value="inventory">
            <OrdersList />
          </TabsContent>

          <TabsContent value="bl-level">
            <OrderBLLevel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
