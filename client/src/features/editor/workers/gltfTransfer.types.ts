/** Serializable glTF scene graph transferred from the load worker to the main thread. */

export type SerializedMaterial =
  | {
      kind: 'standard';
      color: number;
      roughness: number;
      metalness: number;
      transparent: boolean;
      opacity: number;
      /** Transferred separately via ImageBitmap */
      hasMap?: boolean;
    }
  | {
      kind: 'basic';
      color: number;
      transparent: boolean;
      opacity: number;
      hasMap?: boolean;
    };

export type SerializedMesh = {
  position: Float32Array;
  positionItemSize: number;
  normal?: Float32Array;
  uv?: Float32Array;
  index?: Uint16Array | Uint32Array;
  material?: SerializedMaterial;
  /** Index into parallel `mapBitmaps` array on the payload */
  mapBitmapIndex?: number;
};

export type SerializedObject3D = {
  name: string;
  /** Column-major 4×4 matrix from THREE.Object3D.matrix.toArray() */
  matrix: number[];
  mesh?: SerializedMesh;
  children: SerializedObject3D[];
};

export type GltfTransferPayload = {
  root: SerializedObject3D;
  /** Texture maps aligned with mesh.mapBitmapIndex */
  mapBitmaps: ImageBitmap[];
};

export type GltfWorkerLoadRequest = {
  type: 'load';
  id: string;
  url: string;
};

export type GltfWorkerCancelRequest = {
  type: 'cancel';
  id: string;
};

export type GltfWorkerDisposeRequest = {
  type: 'dispose';
};

export type GltfWorkerRequest =
  | GltfWorkerLoadRequest
  | GltfWorkerCancelRequest
  | GltfWorkerDisposeRequest;

export type GltfWorkerProgressMessage = {
  type: 'progress';
  id: string;
  url: string;
  loaded: number;
  total: number;
};

export type GltfWorkerCompleteMessage = {
  type: 'complete';
  id: string;
  url: string;
  payload: GltfTransferPayload;
};

export type GltfWorkerErrorMessage = {
  type: 'error';
  id: string;
  url: string;
  message: string;
};

export type GltfWorkerResponse =
  | GltfWorkerProgressMessage
  | GltfWorkerCompleteMessage
  | GltfWorkerErrorMessage;
