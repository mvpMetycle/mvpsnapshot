import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CountrySelect } from "@/components/ui/country-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";

interface KYBSearchDialogProps {
  companyId: number;
  companyName: string;
  countryCode: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

interface SearchResult {
  response_id: string;
  name: string;
  provider: string;
  confidence: number;
  registration_number?: string;
  address?: {
    country_code?: string;
    locality?: string;
  };
}

export function KYBSearchDialog({
  companyId,
  companyName,
  countryCode,
  open,
  onOpenChange,
  onComplete,
}: KYBSearchDialogProps) {
  const [searchName, setSearchName] = useState(companyName);
  const [searchCountry, setSearchCountry] = useState(countryCode);
  const [searchCity, setSearchCity] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedResponseId, setSelectedResponseId] = useState<string>("");
  const [lookupId, setLookupId] = useState<string>("");
  const [searchMessage, setSearchMessage] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  const handleSearch = async () => {
    if (!searchName.trim()) {
      setSearchMessage({ type: 'error', text: 'Please enter a company name' });
      return;
    }

    if (!searchCountry) {
      setSearchMessage({ type: 'error', text: 'Please select a country' });
      return;
    }

    if (!searchCity.trim()) {
      setSearchMessage({ type: 'error', text: 'Please enter a city' });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSelectedResponseId("");
    setSearchMessage(null);

    try {
      const { data, error } = await supabase.functions.invoke("detected-kyb", {
        body: {
          action: "lookup",
          companyName: searchName,
          countryCode: searchCountry,
          city: searchCity.trim(),
        },
      });

      console.log("KYB detected-kyb response:", data);

      if (error) throw error;

      if (!data?.success) {
        setSearchMessage({ type: 'error', text: data?.error || 'Search failed. Please try again.' });
        return;
      }

      setLookupId(data.lookupId);
      setSearchResults(data.responses || []);

      console.log("KYB responses count:", data.responses?.length ?? 0);

      if (!data.responses || data.responses.length === 0) {
        setSearchMessage({ 
          type: 'info', 
          text: 'No company found matching your search criteria. Try adjusting the company name, city, or country.' 
        });
      }
    } catch (error: any) {
      console.error("Search error:", error);
      setSearchMessage({ type: 'error', text: 'Search failed. Please try again.' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateProfile = async () => {
    if (!selectedResponseId) {
      toast.error("Please select a company from the search results");
      return;
    }

    setIsCreatingProfile(true);

    try {
      const { data, error } = await supabase.functions.invoke("detected-kyb", {
        body: {
          action: "create-profile",
          companyId,
          lookupId,
          responseId: selectedResponseId,
        },
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || "Failed to create profile");
        return;
      }

      toast.success("KYB check completed successfully");
      onComplete();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Profile creation error:", error);
      toast.error(error.message || "Failed to create KYB profile");
    } finally {
      setIsCreatingProfile(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Search Company for KYB Check</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Form */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="search-name">Company Name</Label>
              <Input
                id="search-name"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Enter company name"
              />
            </div>

            <div>
              <Label htmlFor="search-country">
                Country <span className="text-destructive">*</span>
              </Label>
              <CountrySelect
                value={searchCountry}
                onValueChange={setSearchCountry}
                placeholder="Select country..."
                disabled={isSearching || isCreatingProfile}
              />
            </div>

            <div>
              <Label htmlFor="search-city">
                City <span className="text-destructive">*</span>
              </Label>
              <Input
                id="search-city"
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                placeholder="Enter city name"
                disabled={isSearching || isCreatingProfile}
              />
            </div>

            <Button
              onClick={handleSearch}
              disabled={isSearching || !searchName.trim() || !searchCountry || !searchCity.trim()}
              className="w-full"
            >
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Companies
                </>
              )}
            </Button>
          </div>

          {/* Search Message */}
          {searchMessage && searchResults.length === 0 && (
            <Alert variant={searchMessage.type === 'error' ? 'destructive' : 'default'}>
              <AlertDescription>{searchMessage.text}</AlertDescription>
            </Alert>
          )}

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-3">
              <Label>Select the correct company:</Label>
              <RadioGroup
                value={selectedResponseId}
                onValueChange={setSelectedResponseId}
              >
                {searchResults.map((result) => (
                  <div
                    key={result.response_id}
                    className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent cursor-pointer"
                    onClick={() => setSelectedResponseId(result.response_id)}
                  >
                    <RadioGroupItem
                      value={result.response_id}
                      id={result.response_id}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="font-medium">{result.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {result.registration_number && (
                          <span className="mr-4">
                            Reg: {result.registration_number}
                          </span>
                        )}
                        <span className="mr-4">
                          Provider: {result.provider}
                        </span>
                        <span>Confidence: {result.confidence}%</span>
                      </div>
                      {result.address && (
                        <div className="text-sm text-muted-foreground">
                          {result.address.locality && `${result.address.locality}, `}
                          {result.address.country_code}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

          {/* Action Buttons */}
          {searchResults.length > 0 && (
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateProfile}
                disabled={!selectedResponseId || isCreatingProfile}
              >
                {isCreatingProfile ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  "Create Profile"
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
