import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HedgeRequestsTab } from "@/components/hedging/HedgeRequestsTab";
import { HedgeLedgerTab } from "@/components/hedging/HedgeLedgerTab";

export default function Hedging() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Hedging</h2>
        <p className="text-sm text-muted-foreground">
          Manage hedge requests and view complete hedge ledger
        </p>
      </div>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4">
          <HedgeRequestsTab />
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <HedgeLedgerTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
