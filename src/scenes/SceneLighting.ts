import { DirectionalLight, Scene, Vector3 } from "@babylonjs/core";

export class SceneLighting {
  static createLight(scene: Scene) {
    const light = new DirectionalLight("dir01", new Vector3(1, -1, 1), scene);
    light.position = new Vector3(-50, 20, -50);
    light.intensity = 1;
    return light;
  }
}
