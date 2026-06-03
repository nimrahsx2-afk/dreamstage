/// <reference lib="webworker" />

import { DRACOLoader, GLTFLoader, MeshoptDecoder } from 'three-stdlib';

import type {
  GltfWorkerRequest,
  GltfWorkerResponse,
} from './gltfTransfer.types';
import { collectTransferables, serializeGltfScene } from './gltfSceneSerialize';

const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/';

const activeLoads = new Map<string, AbortController>();

let dracoLoader: DRACOLoader | null = null;
let gltfLoader: GLTFLoader | null = null;

function getLoader(): GLTFLoader {
  if (!gltfLoader) {
    gltfLoader = new GLTFLoader();
    if (!dracoLoader) {
      dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    }
    gltfLoader.setDRACOLoader(dracoLoader);
    gltfLoader.setMeshoptDecoder(
      typeof MeshoptDecoder === 'function' ? MeshoptDecoder() : MeshoptDecoder
    );
  }
  return gltfLoader;
}

function post(message: GltfWorkerResponse, transfer?: Transferable[]) {
  self.postMessage(message, transfer ?? []);
}

async function fetchWithProgress(
  url: string,
  id: string,
  signal: AbortSignal
): Promise<ArrayBuffer> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} loading ${url}`);
  }

  const total = Number(response.headers.get('Content-Length')) || 0;
  const body = response.body;
  if (!body) {
    return response.arrayBuffer();
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    post({
      type: 'progress',
      id,
      url,
      loaded,
      total: total || loaded,
    });
  }

  const merged = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  post({
    type: 'progress',
    id,
    url,
    loaded,
    total: loaded,
  });

  return merged.buffer;
}

function parseGlb(buffer: ArrayBuffer): Promise<import('three-stdlib').GLTF> {
  const loader = getLoader();
  return new Promise((resolve, reject) => {
    loader.parse(
      buffer,
      '',
      (gltf) => resolve(gltf),
      (err) => reject(err instanceof Error ? err : new Error(String(err)))
    );
  });
}

async function handleLoad(id: string, url: string) {
  const ac = new AbortController();
  activeLoads.set(id, ac);

  try {
    post({ type: 'progress', id, url, loaded: 0, total: 0 });

    const buffer = await fetchWithProgress(url, id, ac.signal);
    const gltf = await parseGlb(buffer);
    const payload = serializeGltfScene(gltf.scene);
    const transferables = collectTransferables(payload);

    post(
      {
        type: 'complete',
        id,
        url,
        payload,
      },
      transferables
    );
  } catch (err) {
    if (ac.signal.aborted) return;
    const message = err instanceof Error ? err.message : String(err);
    post({ type: 'error', id, url, message });
  } finally {
    activeLoads.delete(id);
  }
}

self.onmessage = (event: MessageEvent<GltfWorkerRequest>) => {
  const msg = event.data;

  switch (msg.type) {
    case 'load':
      void handleLoad(msg.id, msg.url);
      break;
    case 'cancel': {
      const ac = activeLoads.get(msg.id);
      ac?.abort();
      activeLoads.delete(msg.id);
      break;
    }
    case 'dispose': {
      for (const ac of activeLoads.values()) ac.abort();
      activeLoads.clear();
      dracoLoader?.dispose();
      dracoLoader = null;
      gltfLoader = null;
      break;
    }
    default:
      break;
  }
};
