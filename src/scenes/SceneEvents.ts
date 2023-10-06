import {
  Camera,
  IPointerEvent,
  PickingInfo,
  Scene,
  Vector3,
} from "@babylonjs/core";

export class SceneEvents {
  static pickedTile: any = null;
  static initialMousePos: Vector3 | null = null;

  static setupClickHandler(scene: Scene, emitCommand: Function) {
    scene.onPointerDown = (_evt: IPointerEvent, pickInfo: PickingInfo) => {
      if (pickInfo.pickedMesh) {
        if (pickInfo.pickedMesh.name.startsWith("tile")) {
          SceneEvents.pickedTile = pickInfo.pickedMesh;
        }
        SceneEvents.initialMousePos = pickInfo.ray!.origin;
      }
      emitCommand("TileSelected", pickInfo?.pickedMesh?.name);
    };
  }

  static setupDragHandlers(scene: Scene, camera: Camera) {
    scene.onPointerMove = (_evt: IPointerEvent, pickInfo: PickingInfo) => {
      if (SceneEvents.pickedTile) {
        camera.detachControl();
        const dragVector = pickInfo.ray!.origin.subtract(
          SceneEvents.initialMousePos!
        );
        SceneEvents.pickedTile.position.y = 1;
        SceneEvents.pickedTile.physicsBody?.applyForce(
          dragVector.scale(1),
          Vector3.Zero()
        );
        SceneEvents.initialMousePos = pickInfo.ray!.origin;
      }
    };

    scene.onPointerUp = (_evt: IPointerEvent) => {
      camera.attachControl(scene.getEngine().getRenderingCanvas());
      if (SceneEvents.pickedTile) {
        SceneEvents.pickedTile = null;
      }
    };
  }
}
