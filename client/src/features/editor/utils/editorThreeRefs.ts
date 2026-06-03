/** Bridge so non-R3F code (memory diagnostics, dev tools) can reach the live scene + renderer. */

import type * as THREE from 'three';

type EditorThreeRefs = {
  scene: THREE.Scene | null;
  gl: THREE.WebGLRenderer | null;
};

const refs: EditorThreeRefs = {
  scene: null,
  gl: null,
};

export function setEditorThreeRefs(next: Partial<EditorThreeRefs>): void {
  if (next.scene !== undefined) refs.scene = next.scene;
  if (next.gl !== undefined) refs.gl = next.gl;
}

export function clearEditorThreeRefs(): void {
  refs.scene = null;
  refs.gl = null;
}

export function getEditorThreeRefs(): Readonly<EditorThreeRefs> {
  return refs;
}
