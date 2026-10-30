/**
 * Fotos im Browser verkleinern, bevor sie hochgeladen werden: lange Kante max. 2048 px, JPEG.
 * Spart Speicher auf dem Heimserver und Datenvolumen auf dem Handy; EXIF-Drehung wird berücksichtigt.
 */
export async function shrinkImage(file: Blob, maxEdge = 2048, quality = 0.85): Promise<{ blob: Blob; w: number; h: number }> {
  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    source = await new Promise<HTMLImageElement>((ok, fail) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => fail(new Error('Dieses Bild kann der Browser nicht öffnen (z. B. HEIC – bitte als JPEG teilen).'));
      img.src = URL.createObjectURL(file);
    });
  }
  const sw = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const sh = 'naturalHeight' in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const w = Math.round(sw * scale), h = Math.round(sh * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(source, 0, 0, w, h);
  if ('close' in source) source.close();
  const blob = await new Promise<Blob>((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error('Bild konnte nicht verkleinert werden'))), 'image/jpeg', quality));
  return { blob, w, h };
}
