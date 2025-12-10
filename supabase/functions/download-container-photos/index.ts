import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { bl_order_id, container_ids } = await req.json();
    
    console.log('Request received:', { bl_order_id, container_ids });

    if (!bl_order_id || !container_ids || !Array.isArray(container_ids) || container_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'bl_order_id and container_ids array are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch bl_order for naming
    const { data: blOrder } = await supabase
      .from('bl_order')
      .select('bl_order_name')
      .eq('id', bl_order_id)
      .single();

    console.log('BL Order:', blOrder);

    // Fetch all photos for the selected containers
    const { data: photos, error: photosError } = await supabase
      .from('bl_container_photos')
      .select('*')
      .eq('bl_order_id', bl_order_id)
      .in('container_id', container_ids);

    if (photosError) {
      console.error('Error fetching photos:', photosError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch photos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${photos?.length || 0} photos`);

    if (!photos || photos.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No photos found for selected containers' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create ZIP archive
    const zip = new JSZip();

    // Group photos by container number
    const photosByContainer: Record<string, typeof photos> = {};
    for (const photo of photos) {
      const containerNum = photo.container_number || 'unknown';
      if (!photosByContainer[containerNum]) {
        photosByContainer[containerNum] = [];
      }
      photosByContainer[containerNum].push(photo);
    }

    // Download each photo and add to ZIP
    for (const [containerNum, containerPhotos] of Object.entries(photosByContainer)) {
      for (let i = 0; i < containerPhotos.length; i++) {
        const photo = containerPhotos[i];
        
        console.log(`Downloading: ${photo.file_path}`);

        const { data: fileData, error: downloadError } = await supabase.storage
          .from('container-photos')
          .download(photo.file_path);

        if (downloadError) {
          console.error(`Error downloading ${photo.file_path}:`, downloadError);
          continue;
        }

        // Get file extension from original name or content type
        let ext = photo.file_name_original?.split('.').pop() || 'jpg';
        if (ext === photo.file_name_original) {
          const typeMap: Record<string, string> = {
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/gif': 'gif',
          };
          ext = typeMap[photo.content_type] || 'jpg';
        }

        // Create filename: containerNumber/originalName or containerNumber_index.ext
        const fileName = photo.file_name_original || `photo_${i + 1}.${ext}`;
        const zipPath = `${containerNum}/${fileName}`;

        const arrayBuffer = await fileData.arrayBuffer();
        zip.file(zipPath, arrayBuffer);
        
        console.log(`Added to ZIP: ${zipPath}`);
      }
    }

    // Generate ZIP as ArrayBuffer (raw binary)
    const zipContent = await zip.generateAsync({ type: "arraybuffer" });

    const blName = blOrder?.bl_order_name || bl_order_id;
    const fileName = `BL-${blName}-containers.zip`;

    console.log("ZIP size (bytes):", zipContent.byteLength);
    console.log("ZIP first 4 bytes:", Array.from(new Uint8Array(zipContent.slice(0, 4))));

    // Return raw binary response
    return new Response(zipContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': zipContent.byteLength.toString(),
      },
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
