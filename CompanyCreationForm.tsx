import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Building2, MapPin, User, Upload, Plus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import * as XLSX from "xlsx";

const companySchema = z.object({
  // Section 1: Company Details - REQUIRED: Company Name only
  name: z.string().min(2, "Company name must be at least 2 characters").max(200, "Company name too long"),
  kyb_status: z.enum(["Approved", "Rejected", "Needs Review"]).optional(),
  kyb_effective_date: z.string().optional(),
  credit_limit: z.string().optional(),
  trade_credit_limit: z.string().optional(),
  current_exposure: z.string().optional(),
  risk_rating: z.string().optional(),
  payment_terms: z.string().optional(),
  trader_relationship_owner: z.enum(["Harry", "Eric", "Veli", "Anton", "Armin", "Christian", "Kshitiz"]).optional(),
  total_MT_signed: z.string().optional(),
  total_MT_loaded: z.string().optional(),
  total_traded_volume: z.string().optional(),
  amount_overdue: z.string().optional(),

  // Section 2: Company Address - REQUIRED: Address Line, City, Country, Postal Code
  line1: z.string().min(1, "Address line is required").max(200),
  line2: z.string().min(1, "Postal code is required").max(200),
  city: z.string().min(1, "City is required").max(100),
  region: z.string().max(100).optional(),
  country: z.string().min(1, "Country is required").max(100),
  is_primary: z.boolean().optional(),
  VAT_id: z.string().max(50).optional(),
  // India-specific fields
  pan_number: z.string().max(20).optional(),
  iec_code: z.string().max(20).optional(),

  // Section 3: Company Users - All optional
  contact_name_1: z.string().max(100).optional(),
  email_1: z.string().email("Invalid email").optional().or(z.literal("")),
  phone_1: z.string().max(50).optional(),
  job_position_1: z.string().max(100).optional(),
  contact_name_2: z.string().max(100).optional(),
  email_2: z.string().email("Invalid email").optional().or(z.literal("")),
  phone_2: z.string().max(50).optional(),
  job_position_2: z.string().max(100).optional(),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyCreationFormProps {
  onSuccess?: () => void;
}

export const CompanyCreationForm = ({ onSuccess }: CompanyCreationFormProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSecondaryContact, setShowSecondaryContact] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
    trigger,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      kyb_status: "Needs Review",
      is_primary: true,
    },
  });

  // Show validation errors when form submit fails
  const onFormError = (formErrors: any) => {
    const errorMessages: string[] = [];
    if (formErrors.name) errorMessages.push("Company Name is required");
    if (formErrors.line1) errorMessages.push("Address Line is required");
    if (formErrors.line2) errorMessages.push("Postal Code is required");
    if (formErrors.city) errorMessages.push("City is required");
    if (formErrors.country) errorMessages.push("Country is required");
    if (formErrors.email_1) errorMessages.push("Invalid email format");
    if (formErrors.email_2) errorMessages.push("Invalid secondary email format");
    
    if (errorMessages.length > 0) {
      toast.error("Please fill in required fields", {
        description: errorMessages.join(", "),
      });
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      // Read rows as simple arrays: [label, value, ...]
      const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

      if (!rows || rows.length === 0) {
        toast.error("Excel file appears to be empty");
        return;
      }

      // Map normalized Excel labels (lowercase, trimmed) to our form fields
      const labelToField: Record<string, keyof CompanyFormData> = {
        "company name": "name",
        "address line": "line1",
        "address": "line1",
        "post code": "line2",
        "postal code": "line2",
        "postcode": "line2",
        "zip code": "line2",
        "zip": "line2",
        city: "city",
        country: "country",
        "region": "region",
        "region state": "region",
        "region/state": "region",
        "state": "region",
        "vat id": "VAT_id",
        "tax id": "VAT_id",
        vat: "VAT_id",
        "vat number if applicable": "VAT_id",
        "vat number (if applicable)": "VAT_id",
        "contact name": "contact_name_1",
        "phone number": "phone_1",
        "phone": "phone_1",
        email: "email_1",
        "payment terms": "payment_terms",
        "job position": "job_position_1",
        "position": "job_position_1",
      };

      // Clear all form fields first (except kyb_status and is_primary which have defaults)
      const allFields: (keyof CompanyFormData)[] = [
        "name", "kyb_effective_date", "credit_limit", "trade_credit_limit", 
        "current_exposure", "risk_rating", "payment_terms", "trader_relationship_owner",
        "total_MT_signed", "total_MT_loaded", "total_traded_volume", "amount_overdue",
        "line1", "line2", "city", "region", "country", "VAT_id", "pan_number", "iec_code",
        "contact_name_1", "email_1", "phone_1", "job_position_1",
        "contact_name_2", "email_2", "phone_2", "job_position_2"
      ];
      
      allFields.forEach((field) => {
        setValue(field as any, "" as any);
      });

      // Now only set fields that are present in the Excel file
      rows.forEach((row) => {
        const rawLabel = row?.[0];
        if (rawLabel === undefined || rawLabel === null || rawLabel === "") return;

        const normalizedLabel = String(rawLabel)
          .toLowerCase()
          .replace(/[:\s]+/g, " ")
          .trim();

        const fieldName = labelToField[normalizedLabel];
        if (!fieldName) return;

        const rawValue = row?.[1];

        // Only set if value is present
        if (rawValue !== undefined && rawValue !== null && String(rawValue).trim() !== "") {
          const stringValue = typeof rawValue === "string" ? rawValue.trim() : String(rawValue);
          setValue(fieldName as any, stringValue as any);
        }
      });

      toast.success("Excel data loaded successfully");
    } catch (error) {
      console.error("Error reading Excel file:", error);
      toast.error("Failed to read Excel file");
    }
  };

  const onSubmit = async (data: CompanyFormData) => {
    setIsSubmitting(true);
    try {
      // Check for duplicate company
      const { data: existingCompany } = await supabase
        .from("Company")
        .select("id, name")
        .eq("name", data.name)
        .single();

      if (existingCompany) {
        toast.error("Company already exists", {
          description: `A company with the name "${data.name}" is already in the database.`,
        });
        setIsSubmitting(false);
        return;
      }

      // Insert company
      const { data: companyData, error: companyError } = await supabase
        .from("Company")
        .insert({
          name: data.name,
          kyb_status: data.kyb_status,
          kyb_effective_date: data.kyb_effective_date || null,
          credit_limit: data.credit_limit ? parseFloat(data.credit_limit) : null,
          trade_credit_limit: data.trade_credit_limit ? parseFloat(data.trade_credit_limit) : null,
          current_exposure: data.current_exposure ? parseFloat(data.current_exposure) : null,
          risk_rating: data.risk_rating,
          payment_terms: data.payment_terms,
          trader_relationship_owner: data.trader_relationship_owner,
          total_MT_signed: data.total_MT_signed ? parseFloat(data.total_MT_signed) : null,
          total_MT_loaded: data.total_MT_loaded ? parseFloat(data.total_MT_loaded) : null,
          total_traded_volume: data.total_traded_volume ? parseFloat(data.total_traded_volume) : null,
          amount_overdue: data.amount_overdue ? parseFloat(data.amount_overdue) : null,
        } as any)
        .select()
        .single();

      if (companyError) throw companyError;

      // Insert address
      const { error: addressError } = await supabase.from("Company_address").insert({
        company_id: companyData.id,
        line1: data.line1,
        post_code: data.line2,
        city: data.city,
        region: data.region,
        country: data.country,
        is_primary: data.is_primary ?? true,
        VAT_id: data.VAT_id,
        pan_number: data.pan_number || null,
        iec_code: data.iec_code || null,
        contact_name_1: data.contact_name_1,
        email_1: data.email_1,
        phone_1: data.phone_1,
        job_position_1: data.job_position_1,
        contact_name_2: data.contact_name_2,
        email_2: data.email_2,
        phone_2: data.phone_2,
        job_position_2: data.job_position_2,
      });

      if (addressError) throw addressError;

      toast.success("Company created successfully!", {
        description: `${data.name} has been added to the platform.`,
      });

      // Reset form
      reset();
      setStep(1);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating company:", error);
      toast.error("Failed to create company", {
        description: "Please check your input and try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepIcon = () => {
    switch (step) {
      case 1:
        return <Building2 className="h-6 w-6 text-primary" />;
      case 2:
        return <MapPin className="h-6 w-6 text-primary" />;
      case 3:
        return <User className="h-6 w-6 text-primary" />;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "Company Details";
      case 2:
        return "Company Address";
      case 3:
        return "Company Users";
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case 1:
        return "Enter the company details and trading information";
      case 2:
        return "Provide the company's primary business address";
      case 3:
        return "Add contact information for company users";
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto border-border/50 shadow-lg">
      <CardHeader className="space-y-1 pb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getStepIcon()}
            <div className="flex gap-2">
              <div className={`h-1.5 w-12 rounded-full transition-colors ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
              <div className={`h-1.5 w-12 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
              <div className={`h-1.5 w-12 rounded-full transition-colors ${step >= 3 ? "bg-primary" : "bg-muted"}`} />
            </div>
          </div>
          <div className="relative">
            <Input type="file" accept=".xlsx,.xls" onChange={handleExcelUpload} className="hidden" id="excel-upload" />
            <Label htmlFor="excel-upload" className="cursor-pointer">
              <Button type="button" variant="outline" size="sm" asChild>
                <span className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Excel
                </span>
              </Button>
            </Label>
          </div>
        </div>
        <CardTitle className="text-2xl font-semibold">{getStepTitle()}</CardTitle>
        <CardDescription>{getStepDescription()}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit, onFormError)} className="space-y-6">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input id="name" {...register("name")} placeholder="Acme Trading Corp" />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="kyb_status">KYB Status</Label>
                  <Select onValueChange={(value) => setValue("kyb_status", value as any)} defaultValue="Needs Review">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Needs Review">Needs Review</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="trader_relationship_owner">Relationship Owner</Label>
                  <Select onValueChange={(value) => setValue("trader_relationship_owner", value as any)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Harry">Harry</SelectItem>
                      <SelectItem value="Eric">Eric</SelectItem>
                      <SelectItem value="Veli">Veli</SelectItem>
                      <SelectItem value="Anton">Anton</SelectItem>
                      <SelectItem value="Armin">Armin</SelectItem>
                      <SelectItem value="Christian">Christian</SelectItem>
                      <SelectItem value="Kshitiz">Kshitiz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="kyb_effective_date">KYB Effective Date</Label>
                <Input id="kyb_effective_date" type="date" {...register("kyb_effective_date")} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current_exposure">Current Exposure</Label>
                  <Input
                    id="current_exposure"
                    type="number"
                    step="0.01"
                    {...register("current_exposure")}
                    placeholder="250000.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount_overdue">Amount Overdue</Label>
                  <Input
                    id="amount_overdue"
                    type="number"
                    step="0.01"
                    {...register("amount_overdue")}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_MT_signed">Total MT Signed</Label>
                  <Input
                    id="total_MT_signed"
                    type="number"
                    step="0.01"
                    {...register("total_MT_signed")}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="total_MT_loaded">Total MT Loaded</Label>
                  <Input
                    id="total_MT_loaded"
                    type="number"
                    step="0.01"
                    {...register("total_MT_loaded")}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_traded_volume">Total Traded Volume</Label>
                <Input
                  id="total_traded_volume"
                  type="number"
                  step="0.01"
                  {...register("total_traded_volume")}
                  placeholder="0.00"
                />
              </div>

              {/* Internal Risk Matrix Subsection */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="text-lg font-semibold text-foreground">Internal Risk Matrix</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="credit_limit">Credit Limit</Label>
                    <Input
                      id="credit_limit"
                      type="number"
                      step="0.01"
                      {...register("credit_limit")}
                      placeholder="1000000.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trade_credit_limit">Trade Credit Limit</Label>
                    <Input
                      id="trade_credit_limit"
                      type="number"
                      step="0.01"
                      {...register("trade_credit_limit")}
                      placeholder="500000.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="risk_rating">Risk Rating</Label>
                    <Input id="risk_rating" {...register("risk_rating")} placeholder="AA" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment_terms">Payment Terms</Label>
                    <Input id="payment_terms" {...register("payment_terms")} placeholder="Net 30" />
                  </div>
                </div>
              </div>

              <Button type="button" onClick={() => setStep(2)} className="w-full">
                Continue to Address
              </Button>
            </div>
          ) : step === 2 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="line1">Address Line *</Label>
                <Input id="line1" {...register("line1")} placeholder="123 Trading Street" />
                {errors.line1 && <p className="text-sm text-destructive">{errors.line1.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="line2">Postal Code *</Label>
                <Input id="line2" {...register("line2")} placeholder="FY6 8JE" />
                {errors.line2 && <p className="text-sm text-destructive">{errors.line2.message}</p>}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input id="city" {...register("city")} placeholder="London" />
                  {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region">Region/State</Label>
                  <Input id="region" {...register("region")} placeholder="England" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Input id="country" {...register("country")} placeholder="United Kingdom" />
                  {errors.country && <p className="text-sm text-destructive">{errors.country.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="VAT_id">TAX ID</Label>
                  <Input id="VAT_id" {...register("VAT_id")} placeholder="GB123456789" />
                </div>

                <div className="space-y-2 flex items-center gap-2">
                  <Checkbox
                    id="is_primary"
                    checked={watch("is_primary")}
                    onCheckedChange={(checked) => setValue("is_primary", checked as boolean)}
                  />
                  <Label htmlFor="is_primary" className="cursor-pointer">
                    Set as Primary Address
                  </Label>
                </div>
              </div>

              {/* India-specific fields */}
              {watch("country")?.toLowerCase() === "india" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
                  <div className="space-y-2">
                    <Label htmlFor="pan_number">PAN Number</Label>
                    <Input id="pan_number" {...register("pan_number")} placeholder="ABCDE1234F" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="iec_code">IEC Code</Label>
                    <Input id="iec_code" {...register("iec_code")} placeholder="0123456789" />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button type="button" onClick={() => setStep(3)} className="flex-1">
                  Continue to Users
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-b border-border pb-4">
                <h4 className="text-sm font-medium mb-4">Primary Contact</h4>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contact_name_1">Contact Name</Label>
                    <Input id="contact_name_1" {...register("contact_name_1")} placeholder="John Smith" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email_1">Email</Label>
                      <Input id="email_1" type="email" {...register("email_1")} placeholder="john@company.com" />
                      {errors.email_1 && <p className="text-sm text-destructive">{errors.email_1.message}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone_1">Phone</Label>
                      <Input id="phone_1" {...register("phone_1")} placeholder="+44 20 7123 4567" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="job_position_1">Job Position</Label>
                    <Input id="job_position_1" {...register("job_position_1")} placeholder="Finance Manager" />
                  </div>
                </div>
              </div>

              {!showSecondaryContact && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSecondaryContact(true)}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Secondary Contact
                </Button>
              )}

              {showSecondaryContact && (
                <div className="pt-4">
                  <h4 className="text-sm font-medium mb-4">Secondary Contact (Optional)</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact_name_2">Contact Name</Label>
                      <Input id="contact_name_2" {...register("contact_name_2")} placeholder="Jane Doe" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email_2">Email</Label>
                        <Input id="email_2" type="email" {...register("email_2")} placeholder="jane@company.com" />
                        {errors.email_2 && <p className="text-sm text-destructive">{errors.email_2.message}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone_2">Phone</Label>
                        <Input id="phone_2" {...register("phone_2")} placeholder="+44 20 7123 4568" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="job_position_2">Job Position</Label>
                      <Input id="job_position_2" {...register("job_position_2")} placeholder="Operations Manager" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Back
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Creating..." : "Create Company"}
                </Button>
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
