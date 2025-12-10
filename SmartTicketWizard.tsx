import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Mic, Keyboard, Loader2, AlertCircle } from 'lucide-react';
import { TicketEvidenceSection, EvidencePhoto } from './TicketEvidenceSection';
import { VoiceRecorder } from './VoiceRecorder';
import { TicketCreationForm } from './TicketCreationForm';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { traderSession } from '@/utils/traderSession';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface SmartTicketWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
}

type InputMode = 'select' | 'photo' | 'voice' | 'manual' | 'review';

export const SmartTicketWizard: React.FC<SmartTicketWizardProps> = ({ open, onOpenChange, initialData }) => {
  const [mode, setMode] = useState<InputMode>('select');
  const [selectedTraderId, setSelectedTraderId] = useState<number | null>(null);
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [parsedFields, setParsedFields] = useState<any>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [photos, setPhotos] = useState<EvidencePhoto[]>([]);
  const { toast } = useToast();

  // Load trader session and initial data
  React.useEffect(() => {
    if (open) {
      const session = traderSession.get();
      if (session) {
        setSelectedTraderId(session.traderId);
      }
      
      // If initialData is provided, skip to review mode
      if (initialData) {
        setParsedFields(initialData);
        setMode('review');
      }
    }
  }, [open, initialData]);

  // Fetch traders
  const { data: traders } = useQuery({
    queryKey: ['traders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('traders')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch context for AI parsing
  const { data: companies } = useQuery({
    queryKey: ['companies-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Company')
        .select('id, name');
      if (error) throw error;
      return data;
    },
  });

  const { data: shippingLocations } = useQuery({
    queryKey: ['shipping-locations-names'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shipping_location')
        .select('name');
      if (error) throw error;
      return data;
    },
  });

  const handleTraderSelect = (traderId: string) => {
    const trader = traders?.find(t => t.id.toString() === traderId);
    if (trader) {
      setSelectedTraderId(trader.id);
      traderSession.set(trader.id, trader.name);
    }
  };

  const handleTranscriptionComplete = async (text: string) => {
    setTranscribedText(text);
    setIsParsing(true);

    try {
      const { data, error } = await supabase.functions.invoke('parse-ticket-voice', {
        body: {
          transcribedText: text,
          context: {
            companies: companies || [],
            shippingLocations: shippingLocations || []
          }
        }
      });

      if (error) throw error;

      setParsedFields(data.parsedFields);
      setMode('review');
      
      toast({
        title: "Fields extracted",
        description: "Review and complete the missing information",
      });
    } catch (error) {
      console.error('Error parsing voice:', error);
      toast({
        title: "Parsing failed",
        description: "Could not parse voice input. Please try manual entry.",
        variant: "destructive",
      });
      setMode('manual');
    } finally {
      setIsParsing(false);
    }
  };

  const handleReset = () => {
    setMode('select');
    setTranscribedText('');
    setParsedFields(null);
    setPhotos([]);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleReset();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'select' && 'New Trade Ticket - Choose Input Method'}
            {mode === 'photo' && 'Capture Trade Photos'}
            {mode === 'voice' && 'Record Trade Details'}
            {mode === 'manual' && 'Manual Entry'}
            {mode === 'review' && 'Review & Complete'}
          </DialogTitle>
        </DialogHeader>

        {/* Trader Selection */}
        {mode === 'select' && (
          <div className="mb-6">
            <label className="text-sm font-medium mb-2 block">Select Trader</label>
            <Select 
              value={selectedTraderId?.toString()} 
              onValueChange={handleTraderSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose trader..." />
              </SelectTrigger>
              <SelectContent>
                {traders?.map(trader => (
                  <SelectItem key={trader.id} value={trader.id.toString()}>
                    {trader.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTraderId && (
              <Button
                variant="link"
                className="text-xs mt-1"
                onClick={() => {
                  setSelectedTraderId(null);
                  traderSession.clear();
                }}
              >
                Not you? Switch trader
              </Button>
            )}
          </div>
        )}

        {/* Mode Selection */}
        {mode === 'select' && selectedTraderId && (
          <div className="grid grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-32 flex flex-col gap-3"
              onClick={() => setMode('photo')}
            >
              <Camera className="h-12 w-12" />
              <span>Add Photos</span>
            </Button>

            <Button
              variant="outline"
              className="h-32 flex flex-col gap-3"
              onClick={() => setMode('voice')}
            >
              <Mic className="h-12 w-12" />
              <span>Voice Input</span>
            </Button>

            <Button
              variant="outline"
              className="h-32 flex flex-col gap-3"
              onClick={() => setMode('manual')}
            >
              <Keyboard className="h-12 w-12" />
              <span>Manual Entry</span>
            </Button>
          </div>
        )}

        {/* Photo Capture Mode */}
        {mode === 'photo' && (
          <div className="space-y-4">
            <TicketEvidenceSection
              ticketId={null}
              existingPhotos={photos}
              onPhotosChange={setPhotos}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleReset}>
                Back
              </Button>
              <Button onClick={() => setMode('manual')}>
                Continue to Details
              </Button>
            </div>
          </div>
        )}

        {/* Voice Recording Mode */}
        {mode === 'voice' && (
          <div className="space-y-4 py-8">
            {isParsing ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Analyzing your voice input...
                </p>
              </div>
            ) : (
              <>
                <VoiceRecorder onTranscriptionComplete={handleTranscriptionComplete} />
                {transcribedText && (
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Transcribed:</p>
                    <p className="text-sm">{transcribedText}</p>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-start">
              <Button variant="outline" onClick={handleReset}>
                Back
              </Button>
            </div>
          </div>
        )}

        {/* Manual Entry / Review Mode */}
        {(mode === 'manual' || mode === 'review') && (
          <div className="space-y-4">
            {mode === 'review' && parsedFields && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      AI extracted {Object.keys(parsedFields).filter(k => parsedFields[k] !== null && parsedFields[k] !== '').length} fields
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      Review the pre-filled information and complete any missing required fields
                    </p>
                  </div>
                </div>
              </div>
            )}

            <TicketCreationForm
              onSuccess={() => {
                handleReset();
                onOpenChange(false);
              }}
              initialData={{
                trader_id: selectedTraderId || undefined,
                ...parsedFields,
              }}
              hideTraderField={!!selectedTraderId}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};