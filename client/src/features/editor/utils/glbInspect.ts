/**
 * Read glTF JSON from a .glb (or .gltf) URL and return extensionsUsed / extensionsRequired.
 * Does not use Three.js — safe to call before load.
 */

import {
  DEPRECATED_GLTF_EXTENSIONS,
  THREE_BUILTIN_GLTF_EXTENSIONS,
} from './gltfExtensions.constants';

export type GlbExtensionReport = {
  extensionsUsed: string[];
  extensionsRequired: string[];
  unsupported: string[];
  deprecated: string[];
  warnings: string[];
};

const warnedUrls = new Set<string>();
const reportCache = new Map<string, GlbExtensionReport>();

export function getCachedGlbExtensionReport(url: string): GlbExtensionReport | undefined {
  return reportCache.get(url);
}

function parseGlbJsonChunk(buffer: ArrayBuffer): Record<string, unknown> | null {
  const view = new DataView(buffer);
  if (buffer.byteLength < 12) return null;

  const magic = view.getUint32(0, true);
  if (magic !== 0x46546c67) return null; // 'glTF'
  const version = view.getUint32(4, true);
  if (version !== 2) return null;

  let offset = 12;
  while (offset + 8 <= buffer.byteLength) {
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    offset += 8;
    if (offset + chunkLength > buffer.byteLength) break;

    if (chunkType === 0x4e4f534a) {
      // JSON chunk
      const jsonBytes = new Uint8Array(buffer, offset, chunkLength);
      const text = new TextDecoder().decode(jsonBytes);
      return JSON.parse(text) as Record<string, unknown>;
    }

    offset += chunkLength;
  }
  return null;
}

function reportFromGltfJson(json: Record<string, unknown>): GlbExtensionReport {
  const extensionsUsed = Array.isArray(json.extensionsUsed)
    ? (json.extensionsUsed as string[])
    : [];
  const extensionsRequired = Array.isArray(json.extensionsRequired)
    ? (json.extensionsRequired as string[])
    : [];

  const deprecated = extensionsUsed.filter((e) =>
    (DEPRECATED_GLTF_EXTENSIONS as readonly string[]).includes(e)
  );

  const unsupported = extensionsUsed.filter(
    (e) =>
      !(THREE_BUILTIN_GLTF_EXTENSIONS as Set<string>).has(e) &&
      !(DEPRECATED_GLTF_EXTENSIONS as readonly string[]).includes(e)
  );

  const warnings: string[] = [];
  if (deprecated.length > 0) {
    warnings.push(
      `Deprecated material extension(s): ${deprecated.join(', ')}. Re-export as metallic-roughness (see npm run models:metalrough).`
    );
  }
  if (unsupported.length > 0) {
    warnings.push(`Extensions not handled by Three.js r161: ${unsupported.join(', ')}`);
  }

  return { extensionsUsed, extensionsRequired, unsupported, deprecated, warnings };
}

/** Fetch and inspect a model URL (.glb or .gltf). */
export async function inspectGlbExtensions(url: string): Promise<GlbExtensionReport> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to inspect ${url}: HTTP ${res.status}`);
  }

  const buffer = await res.arrayBuffer();
  const lower = url.toLowerCase();

  if (lower.endsWith('.gltf')) {
    const text = new TextDecoder().decode(buffer);
    const report = reportFromGltfJson(JSON.parse(text) as Record<string, unknown>);
    reportCache.set(url, report);
    return report;
  }

  const json = parseGlbJsonChunk(buffer);
  if (!json) {
    return {
      extensionsUsed: [],
      extensionsRequired: [],
      unsupported: [],
      deprecated: [],
      warnings: ['Could not read glTF JSON chunk from GLB'],
    };
  }

  const report = reportFromGltfJson(json);
  reportCache.set(url, report);
  return report;
}

/** Log once per URL in dev; returns whether deprecated spec/gloss is present. */
export function logGlbExtensionWarnings(url: string, report: GlbExtensionReport): boolean {
  const hasDeprecated = report.deprecated.length > 0;
  if (report.warnings.length === 0) return hasDeprecated;

  const key = url;
  if (warnedUrls.has(key)) return hasDeprecated;
  warnedUrls.add(key);

  for (const msg of report.warnings) {
    console.warn(`[DreamStage] ${url}: ${msg}`);
  }
  return hasDeprecated;
}
