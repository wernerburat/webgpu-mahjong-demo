import {
  ArcRotateCamera,
  ArcRotateCameraKeyboardMoveInput,
  Matrix,
  Scene,
  Vector3,
} from "@babylonjs/core";

export class SceneCamera {
  static createCamera(scene: Scene, canvas: HTMLCanvasElement) {
    const camera = new ArcRotateCamera(
      "camera1",
      Math.PI / 2,
      -Math.PI / 2,
      150,
      new Vector3(0, 0, 0),
      scene
    );
    camera.setTarget(Vector3.Zero());
    camera.attachControl(canvas, true);
    scene.onBeforeRenderObservable.add(() => {
      // camera.alpha += 0.001;
    });

    camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");
    camera.inputs.add(new KeyboardPanningInput(new Matrix(), Vector3.Zero()));
    //-

    const w = 87;
    const s = 83;
    const d = 68;
    const a = 65;

    camera.keysUp.push(w);
    camera.keysDown.push(s);
    camera.keysRight.push(d);
    camera.keysLeft.push(a);

    camera.attachControl(canvas, true);

    return camera;
  }
}
class KeyboardPanningInput extends ArcRotateCameraKeyboardMoveInput {
  matrix: any;
  displacement: any;
  constructor(matrix: any, vector: any) {
    super();

    this.matrix = matrix;
    this.displacement = vector;
  }

  checkInputs() {
    // Ignore typescript error
    // @ts-ignore
    if (this._onKeyboardObserver) {
      const camera = this.camera;
      const m = this.matrix;

      this.camera.absoluteRotation.toRotationMatrix(m);

      // @ts-ignore
      for (let index = 0; index < this._keys.length; index++) {
        // @ts-ignore
        const keyCode = this._keys[index];

        if (this.keysReset.indexOf(keyCode) !== -1) {
          if (camera.useInputToRestoreState) {
            camera.restoreState();
            continue;
          }
        }
        //Matrix magic see https://www.3dgep.com/understanding-the-view-matrix/ and
        //   https://forum.babylonjs.com/t/arc-rotate-camera-panning-on-button-click/15428/6
        else if (this.keysLeft.indexOf(keyCode) !== -1) {
          this.displacement.set(-m.m[0], -m.m[1], -m.m[2]);
        } else if (this.keysUp.indexOf(keyCode) !== -1) {
          this.displacement.set(m.m[8], 0, m.m[10]);
        } else if (this.keysRight.indexOf(keyCode) !== -1) {
          this.displacement.set(m.m[0], m.m[1], m.m[2]);
        } else if (this.keysDown.indexOf(keyCode) !== -1) {
          this.displacement.set(-m.m[8], 0, -m.m[10]);
        }

        this.camera.target.addInPlace(this.displacement);
        this.camera.position.addInPlace(this.displacement);
        this.displacement.setAll(0);
      }
    }
  }
}
