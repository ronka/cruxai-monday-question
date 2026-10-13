// Supplied export utilities. Candidates do not need to write an encoder:
// SVG is serialized directly; PNG is rasterized with the browser's canvas.
import { delay } from "@/mock/network";
import type { Artboard } from "@/types/canvas";

export type ExportFormat = "png" | "svg";
/** Scales the renderer supports. SVG ignores scale (it is resolution-independent). */
export const SUPPORTED_SCALES = [0.5, 1, 2, 3, 4] as const;
export type ExportScale = (typeof SUPPORTED_SCALES)[number];

export interface ExportSettings {
  format: ExportFormat;
  scale: ExportScale;
}

export interface ExportResult {
  artboardId: string;
  blob: Blob;
  width: number;
  height: number;
  format: ExportFormat;
}

const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Serializes an artboard to a standalone SVG document. */
export function artboardToSvg(artboard: Artboard): string {
  const body = artboard.layers
    .map((layer) => {
      if (layer.kind === "rect")
        return `<rect x="${layer.x}" y="${layer.y}" width="${layer.width}" height="${layer.height}" rx="${layer.radius ?? 0}" fill="${layer.fill}"${layer.stroke ? ` stroke="${layer.stroke}"` : ""}/>`;
      if (layer.kind === "ellipse")
        return `<ellipse cx="${layer.x + layer.width / 2}" cy="${layer.y + layer.height / 2}" rx="${layer.width / 2}" ry="${layer.height / 2}" fill="${layer.fill}"/>`;
      return `<text x="${layer.x}" y="${layer.y}" font-size="${layer.size}" font-weight="${layer.weight ?? 400}" fill="${layer.fill}" font-family="Inter, system-ui, sans-serif">${escape(layer.text)}</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${artboard.width}" height="${artboard.height}" viewBox="0 0 ${artboard.width} ${artboard.height}"><rect width="100%" height="100%" fill="${artboard.background}"/>${body}</svg>`;
}

/** Rasterizes an artboard to PNG at `scale` (browser only). */
export async function artboardToPng(artboard: Artboard, scale: ExportScale): Promise<Blob> {
  if (!SUPPORTED_SCALES.includes(scale)) throw new Error(`Unsupported scale ${scale}x`);
  const url = URL.createObjectURL(new Blob([artboardToSvg(artboard)], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(artboard.width * scale);
    canvas.height = Math.round(artboard.height * scale);
    const context = canvas.getContext("2d")!;
    context.scale(scale, scale);
    context.drawImage(image, 0, 0);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed"))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

const failures = new Set<string>();
let failNext = false;
/** Mock control: the next export call fails. */
export function failNextExport() {
  failNext = true;
}
/** Mock control: every export of this artboard fails until cleared. */
export function setArtboardExportFailure(artboardId: string, failing: boolean) {
  if (failing) failures.add(artboardId);
  else failures.delete(artboardId);
}

/**
 * Exports one artboard like a remote render service would: it takes time
 * (larger outputs take longer), reports progress, honours `signal`, and can
 * fail through the mock controls. The artboard is rendered exactly as passed.
 */
export async function exportArtboard(
  artboard: Artboard,
  settings: ExportSettings,
  options: { signal?: AbortSignal; onProgress?: (fraction: number) => void } = {},
): Promise<ExportResult> {
  if (!SUPPORTED_SCALES.includes(settings.scale)) throw new Error(`Unsupported scale ${settings.scale}x`);
  const steps = 4 + Math.round(((artboard.width * artboard.height) / 200_000) * (settings.format === "png" ? settings.scale : 1));
  for (let step = 1; step <= steps; step++) {
    if (options.signal?.aborted) throw new DOMException("Export canceled", "AbortError");
    await delay(150);
    options.onProgress?.(step / steps);
  }
  if (options.signal?.aborted) throw new DOMException("Export canceled", "AbortError");
  if (failNext || failures.has(artboard.id)) {
    failNext = false;
    throw new Error(`Render service failed for “${artboard.name}”`);
  }
  const blob = settings.format === "svg" ? new Blob([artboardToSvg(artboard)], { type: "image/svg+xml" }) : await artboardToPng(artboard, settings.scale);
  const scale = settings.format === "svg" ? 1 : settings.scale;
  return { artboardId: artboard.id, blob, width: Math.round(artboard.width * scale), height: Math.round(artboard.height * scale), format: settings.format };
}

/** Triggers a browser download for a blob. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
