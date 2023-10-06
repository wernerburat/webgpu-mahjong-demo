import {
  ArcRotateCamera,
  Mesh,
  Scene,
  Texture,
  VolumetricLightScatteringPostProcess,
} from "@babylonjs/core";

export class SceneEffects {
  static enableGodRaysOnObject(
    mesh: Mesh,
    camera: ArcRotateCamera,
    scene: Scene
  ) {
    const godRays = new VolumetricLightScatteringPostProcess(
      "godrays",
      1.0,
      camera!,
      mesh,
      100,
      Texture.BILINEAR_SAMPLINGMODE,
      scene.getEngine(),
      false
    );
    // Customize the density of the rays
    godRays.density = 0.5;

    // Customize the decay of the rays
    godRays.decay = 0.97;

    // Customize the exposure of the rays
    godRays.exposure = 0.6;
  }
}
