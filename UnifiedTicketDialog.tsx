import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, Square, Loader2, ChevronDown, ChevronUp, Sparkles, Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { TicketCreationForm } from './TicketCreationForm';
import { useQuery } from '@tanstack/react-query';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { TicketEvidenceSection, EvidencePhoto } from './TicketEvidenceSection';

interface UnifiedTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
}

export const UnifiedTicketDialog: React.FC<UnifiedTicketDialogProps> = ({ 
  open, 
  onOpenChange,
  initialData 
}) => {
  const [photos, setPhotos] = useState<EvidencePhoto[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [parsedFields, setParsedFields] = useState<any>(initialData || null);
  const [prefilledFieldNames, setPrefilledFieldNames] = useState<string[]>([]);
  const [isAiSectionOpen, setIsAiSectionOpen] = useState(false);
  const { toast } = useToast();
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);

  // Fetch context for AI parsing
  const { data: companies } = useQuery({
    queryKey: ['companies-names'],
    queryFn: async () => {
      const { data, error } = await supabase.from('Company').select('id, name');
      if (error) throw error;
      return data;
    },
  });

  const { data: shippingLocations } = useQuery({
    queryKey: ['shipping-locations-names'],
    queryFn: async () => {
      const { data, error } = await supabase.from('shipping_location').select('name');
      if (error) throw error;
      return data;
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setIsAiSectionOpen(true);
      
      toast({
        title: "Recording started",
        description: "Speak clearly about the trade details",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsProcessing(true);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setIsAiSectionOpen(true);

    try {
      await processAudio(file);
    } catch (error) {
      console.error('Error processing uploaded audio:', error);
      toast({
        title: "Error",
        description: "Failed to process audio file",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const processAudio = async (audioInput: Blob | File) => {
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioInput);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        const { data, error } = await supabase.functions.invoke('voice-to-text', {
          body: { audio: base64Audio }
        });

        if (error) throw error;

        if (data.text) {
          setTranscribedText(data.text);
          await parseTicketData(data.text);
        }
        
        setIsProcessing(false);
      };
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Error",
        description: "Failed to transcribe audio",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  const parseTicketData = async (text: string) => {
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
      setPrefilledFieldNames(Object.keys(data.parsedFields || {}));
      
      toast({
        title: "AI extracted fields",
        description: "Review and complete the form below",
      });
    } catch (error) {
      console.error('Error parsing voice:', error);
      toast({
        title: "Parsing failed",
        description: "Please fill the form manually",
        variant: "destructive",
      });
    }
  };

  const handleApplyToForm = () => {
    // Extract values from parsedFields objects
    if (parsedFields) {
      const extractedValues: any = {};
      Object.entries(parsedFields).forEach(([key, fieldData]: [string, any]) => {
        // Extract value from object structure {value, confidence}
        if (typeof fieldData === 'object' && fieldData !== null && 'value' in fieldData) {
          extractedValues[key] = fieldData.value;
        } else {
          extractedValues[key] = fieldData;
        }
      });
      setParsedFields(extractedValues);
      setPrefilledFieldNames(Object.keys(extractedValues));
    }
    
    // Close the AI section
    setIsAiSectionOpen(false);
    toast({
      title: "Fields applied",
      description: "AI data has been pre-filled in the form below",
    });
  };

  const handleReset = () => {
    setPhotos([]);
    setTranscribedText('');
    setParsedFields(null);
    setPrefilledFieldNames([]);
    setIsAiSectionOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleReset();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Trade Ticket</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Section A: Photo Attachments - Using shared component */}
          <TicketEvidenceSection
            ticketId={null}
            existingPhotos={photos}
            onPhotosChange={setPhotos}
          />

          {/* Section B: AI Quick Fill (Collapsible) */}
          <Collapsible open={isAiSectionOpen} onOpenChange={setIsAiSectionOpen}>
            <Card>
              <CardHeader className="pb-3">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      AI Quick Fill (Optional)
                      {parsedFields && (
                        <Badge variant="secondary" className="ml-2">
                          {prefilledFieldNames.length} fields extracted
                        </Badge>
                      )}
                    </CardTitle>
                    {isAiSectionOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Record or upload audio describing the trade to let AI extract the details
                  </p>

                  <div className="flex flex-col items-center gap-4">
                    {!isRecording && !isProcessing && (
                      <>
                        <div className="flex gap-4">
                          <Button
                            onClick={startRecording}
                            size="lg"
                            className="h-20 w-20 rounded-full"
                          >
                            <Mic className="h-8 w-8" />
                          </Button>
                          <Button
                            onClick={() => document.getElementById('audio-upload')?.click()}
                            size="lg"
                            variant="outline"
                            className="h-20 w-20 rounded-full"
                          >
                            <Upload className="h-8 w-8" />
                          </Button>
                        </div>
                        <input
                          id="audio-upload"
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={handleAudioUpload}
                        />
                      </>
                    )}
                    
                    {isRecording && (
                      <Button
                        onClick={stopRecording}
                        size="lg"
                        variant="destructive"
                        className="h-20 w-20 rounded-full animate-pulse"
                      >
                        <Square className="h-8 w-8" />
                      </Button>
                    )}
                    
                    {isProcessing && (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Processing audio...</p>
                      </div>
                    )}
                    
                    {isRecording && (
                      <p className="text-sm text-muted-foreground animate-pulse">
                        Recording... Click to stop
                      </p>
                    )}
                  </div>

                  {transcribedText && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Transcribed:</p>
                      <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                        {transcribedText}
                      </p>
                    </div>
                  )}

                  {parsedFields && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Extracted Fields:</p>
                      <div className="bg-muted p-3 rounded space-y-1">
                        {Object.entries(parsedFields).map(([key, fieldData]: [string, any]) => {
                          const displayValue = typeof fieldData === 'object' && fieldData !== null && 'value' in fieldData
                            ? fieldData.value
                            : fieldData;
                          const confidence = typeof fieldData === 'object' && fieldData !== null && 'confidence' in fieldData
                            ? fieldData.confidence
                            : null;
                          
                          return (
                            <div key={key} className="text-sm flex items-center justify-between">
                              <div>
                                <span className="font-medium">{key}:</span>{' '}
                                <span className="text-muted-foreground">
                                  {displayValue !== null && displayValue !== undefined ? String(displayValue) : 'N/A'}
                                </span>
                              </div>
                              {confidence !== null && (
                                <Badge 
                                  variant="outline" 
                                  className={`ml-2 text-xs ${
                                    confidence >= 80 ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                                    confidence >= 50 ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' :
                                    'bg-red-500/10 text-red-600 border-red-500/20'
                                  }`}
                                >
                                  {confidence}%
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <Button 
                        onClick={handleApplyToForm}
                        size="sm"
                        className="mt-2"
                      >
                        Apply to Form
                      </Button>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Section C: Trade Ticket Form */}
          <TicketCreationForm 
            onSuccess={() => onOpenChange(false)} 
            initialData={parsedFields}
            photos={photos.map(p => p.url)}
            prefilledFields={prefilledFieldNames}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
