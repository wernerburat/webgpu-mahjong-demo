import {
  Scene,
  Camera,
  DefaultRenderingPipeline,
  FxaaPostProcess,
  WebGPUEngine,
} from "@babylonjs/core";
import { DitheringPostProcess } from "./DitheringPostProcess";

export class PostProcessingSetup {
  static setupDefaultPipeline(scene: Scene, camera: Camera) {
    const defaultPipeline = new DefaultRenderingPipeline(
      "default",
      true,
      scene,
      [camera]
    );
    defaultPipeline.fxaaEnabled = true;
    defaultPipeline.bloomEnabled = true;
    return defaultPipeline;
  }

  static setupFXAA(camera: Camera) {
    const fxaa = new FxaaPostProcess("fxaa", 1.0, camera);
    return fxaa;
  }

  static setupDithering(camera: Camera, engine: WebGPUEngine) {
    const dithering = new DitheringPostProcess(camera, engine);
    dithering.ditherScale = 150.0;
    return dithering;
  }

  static applyAllPostProcessing(
    scene: Scene,
    camera: Camera,
    engine: WebGPUEngine
  ) {
    this.setupDefaultPipeline(scene, camera);
    this.setupFXAA(camera);
    this.setupDithering(camera, engine);
  }
}
