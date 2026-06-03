/** glTF extension names — see Three.js GLTFLoader EXTENSIONS + removed legacy set. */

/** Removed from Three.js r147+ — cannot be registered; convert assets to metallic-roughness. */
export const DEPRECATED_GLTF_EXTENSIONS = [
  'KHR_materials_pbrSpecularGlossiness',
] as const;

/** Built into Three.js r161 GLTFLoader (core switch + plugins). */
export const THREE_BUILTIN_GLTF_EXTENSIONS = new Set([
  'KHR_binary_glTF',
  'KHR_draco_mesh_compression',
  'KHR_lights_punctual',
  'KHR_materials_clearcoat',
  'KHR_materials_dispersion',
  'KHR_materials_ior',
  'KHR_materials_sheen',
  'KHR_materials_specular',
  'KHR_materials_transmission',
  'KHR_materials_iridescence',
  'KHR_materials_anisotropy',
  'KHR_materials_unlit',
  'KHR_materials_volume',
  'KHR_texture_basisu',
  'KHR_texture_transform',
  'KHR_mesh_quantization',
  'KHR_materials_emissive_strength',
  'EXT_materials_bump',
  'EXT_texture_webp',
  'EXT_texture_avif',
  'EXT_meshopt_compression',
  'EXT_mesh_gpu_instancing',
]);

export const KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS = 'KHR_materials_pbrSpecularGlossiness';
