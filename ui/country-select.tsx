import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { countries, type Country } from "@/data/countries";

interface CountrySelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CountrySelect({
  value,
  onValueChange,
  placeholder = "Select country...",
  disabled = false,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedCountry = countries.find((country) => country.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground"
          )}
        >
        {selectedCountry ? (
            <span className="flex items-center gap-2">
              <img 
                src={selectedCountry.flagUrl} 
                alt={selectedCountry.name}
                className="w-5 h-4 object-cover rounded-sm"
              />
              <span>{selectedCountry.name}</span>
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 pointer-events-auto" align="start">
        <Command>
          <CommandInput placeholder="Search countries..." className="pointer-events-auto" />
          <CommandList className="pointer-events-auto">
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.code}`}
                  onSelect={() => {
                    onValueChange(country.code);
                    setOpen(false);
                  }}
                  className="pointer-events-auto"
                >
                  <span className="flex items-center gap-2 flex-1">
                    <img 
                      src={country.flagUrl} 
                      alt={country.name}
                      className="w-5 h-4 object-cover rounded-sm"
                    />
                    <span>{country.name}</span>
                    <span className="text-muted-foreground text-sm">
                      ({country.code})
                    </span>
                  </span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === country.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
