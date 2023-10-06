import { Scene, PBRMaterial, Texture, Color3 } from "@babylonjs/core";

export function createTableFabricMaterial(scene: Scene): PBRMaterial {
  // Green pool / casino table fabric
  const material = new PBRMaterial("tableMaterial", scene);
  material.albedoTexture = new Texture(
    "./materials/table/fabrics_0075_color_4k.jpg",
    scene
  );
  material.bumpTexture = new Texture(
    "./materials/table/fabrics_0075_normal_directx_4k.png",
    scene
  );
  material.ambientTexture = new Texture(
    "./materials/table/fabrics_0075_ao_4k.jpg",
    scene
  );
  material.metallic = 0;
  material.roughness = 1;

  return material;
}

export function createMarbleMaterial(scene: Scene): PBRMaterial {
  const material = new PBRMaterial("tileMaterial", scene);
  material.albedoTexture = new Texture(
    "./tiles/materials/marble/color_map.jpg",
    scene
  );
  material.bumpTexture = new Texture(
    "./tiles/materials/marble/normal_map_opengl.jpg",
    scene
  );

  material.ambientTexture = new Texture(
    "./tiles/materials/marble/ao_map.jpg",
    scene
  );
  material.metallic = 0;
  material.roughness = 0;
  material.albedoColor = new Color3(1, 1, 1);
  material.reflectivityColor = new Color3(1, 1, 1);
  material.reflectionColor = new Color3(1, 1, 1);
  material.metallicReflectanceColor = new Color3(0.5, 0.5, 0.5);
  return material;
}
