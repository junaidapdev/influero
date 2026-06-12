import { PDF_RENDER_WIDTH_PX } from "@/constants/snap";

// Client-side PDF → PNG for the snap pipeline: the Deno edge runtime cannot
// rasterize PDFs, so the FIRST PAGE is rendered to a PNG in the browser and
// only that image is ever uploaded (architecture "Snap Extraction" flow).
//
// pdf.js is imported DYNAMICALLY so its ~400 kB chunk loads only when a user
// actually picks a PDF — never in the main bundle. pdfjs-dist v6 renders into
// a `canvas` directly (the `canvasContext` parameter is back-compat only).

export async function pdfFirstPageToPng(file: File): Promise<Blob> {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const loadingTask = pdfjs.getDocument({ data: await file.arrayBuffer() });
  try {
    const doc = await loadingTask.promise;
    const page = await doc.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({
      scale: PDF_RENDER_WIDTH_PX / baseViewport.width,
    });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);

    await page.render({ canvas, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/png");
    });
    if (!blob) {
      throw new Error("[pdfToImage] canvas.toBlob returned null");
    }
    return blob;
  } finally {
    await loadingTask.destroy();
  }
}
