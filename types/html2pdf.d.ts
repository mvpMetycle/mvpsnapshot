declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[] | [number, number] | [number, number, number, number];
    filename?: string;
    image?: {
      type?: 'jpeg' | 'png' | 'webp';
      quality?: number;
    };
    html2canvas?: {
      scale?: number;
      useCORS?: boolean;
      [key: string]: any;
    };
    jsPDF?: {
      unit?: string;
      format?: string;
      orientation?: 'portrait' | 'landscape';
      [key: string]: any;
    };
    [key: string]: any;
  }

  interface Html2Pdf {
    set(options: Html2PdfOptions): Html2Pdf;
    from(element: HTMLElement | string): Html2Pdf;
    outputPdf(type: 'blob' | 'datauristring' | 'datauri' | 'bloburi'): Promise<any>;
    save(): Promise<void>;
    output(type: string, options?: any): Promise<any>;
    [key: string]: any;
  }

  function html2pdf(): Html2Pdf;
  export default html2pdf;
}
