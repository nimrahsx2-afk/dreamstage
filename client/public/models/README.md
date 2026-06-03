# 3D Models (GLB)

Place your GLB model files in this folder. The 3D editor loads models from `/models/{filename}`.

## Usage

1. Add your `.glb` file to this folder (e.g. `TABLE.glb`, `CHAIR.glb`)
2. Update the asset in the database: set `model_ref` to the filename only (e.g. `TABLE.glb`)
3. Assets with `model_ref` will render the GLB model in the editor; assets without it use placeholder primitives
