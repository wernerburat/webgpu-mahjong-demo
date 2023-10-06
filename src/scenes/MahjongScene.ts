import {
  Scene,
  Vector3,
  Mesh,
  IPointerEvent,
  PickingInfo,
  ArcRotateCamera,
  Texture,
  WebGPUEngine,
  MeshBuilder,
  ShadowGenerator,
  DirectionalLight,
  HavokPlugin,
  PhysicsShapeType,
  PhysicsAggregate,
  CubeTexture,
  Nullable,
  AbstractMesh,
  VolumetricLightScatteringPostProcess,
  ArcRotateCameraKeyboardMoveInput,
  Matrix,
} from "@babylonjs/core";

import { AsyncBus } from "../bus/AsyncBus";
import { IMessageBus } from "../bus/BusFactory";
import {
  SceneEventBusMessages,
  SceneDirectorEventBusMessages,
} from "../bus/events";
import { SceneDirectorCommand } from "../director/BaseSceneDirector";
import { reviver } from "../utils/json";
import { MahjongTileManager } from "./MahjongTiles";
import { createTableFabricMaterial } from "./MahjongMaterials";

export class MahjongScene {
  private _scene?: Scene;
  private _camera?: ArcRotateCamera;
  private tilePrefab?: Mesh;
  private shadowGenerator?: ShadowGenerator;
  private tileManager?: MahjongTileManager;

  private pickedTile: Nullable<AbstractMesh> = null;
  private initialMousePos?: Vector3;

  constructor(private _eventBus: IMessageBus) {}

  public registerBusEvents() {
    const messagesToActions = this.getMessagesToActionsMapping();

    this._eventBus.$on(
      SceneDirectorEventBusMessages.SceneDirectorCommand,
      (sceneDirectorCommandJson: string) => {
        const sceneDirectorCommand = <SceneDirectorCommand>(
          JSON.parse(sceneDirectorCommandJson, reviver)
        );
        const action = messagesToActions.get(sceneDirectorCommand.messageType);
        console.log(
          "BabylonJS Scene has received command",
          sceneDirectorCommand
        );
        if (action) {
          action.call(this, sceneDirectorCommand);
        }
      }
    );
  }

  public unregisterBusEvents() {
    this._eventBus.$off(SceneDirectorEventBusMessages.SceneDirectorCommand);
  }

  // which messages you want to react to
  getMessagesToActionsMapping() {
    const messagesToActions = new Map<string, (payload: any) => void>();
    messagesToActions.set(SceneDirectorEventBusMessages.AddTile, this.addTile);

    return messagesToActions;
  }

  addTile(sceneDirectorCommand: SceneDirectorCommand) {
    if (this._scene && this.tilePrefab) {
      this.commandFinished(sceneDirectorCommand);
    }
  }

  getSceneMeshNames(sceneDirectorCommand: SceneDirectorCommand) {
    const names = this._scene?.meshes.map((m) => m.name);
    this.commandFinished(sceneDirectorCommand, names);
  }

  // create the BabylonJS scene
  async createScene(
    engine: WebGPUEngine,
    canvas: HTMLCanvasElement,
    hk: HavokPlugin
  ) {
    const scene = new Scene(engine);
    scene.enablePhysics(new Vector3(0, -9.81, 0), hk);
    this._scene = scene;
    // Lights
    const light = this.createLight(scene);
    // const light2 = new DirectionalLight("dir02", new Vector3(1, -1, -1), scene);
    // light2.position = new Vector3(50, 20, 50);
    //light2.intensity = 0.7;

    // Env
    const envTex = CubeTexture.CreateFromPrefilteredData(
      "./env/fireplace.env",
      scene
    );
    scene.environmentTexture = envTex;
    scene.createDefaultSkybox(envTex, true, 1000, 0.2);

    // Shadows
    this.shadowGenerator = new ShadowGenerator(1024, light);
    this.shadowGenerator.usePoissonSampling = true;

    // Tile manager, now that scene and shadows are created
    this.tileManager = new MahjongTileManager(
      this._scene!,
      this.shadowGenerator!
    );
    await this.tileManager.initializeManager();

    // Table
    await this.createTable(scene);

    // Camera
    this._camera = this.createCamera(scene, canvas);

    //godRays.mesh.position = lightMesh.position;
    //godRays.density = 0.5;

    // Spawn tiles!
    this.tileManager.createAllTilesOnTable();

    // Add physics to tiles
    this.tileManager.createTilesPhysics();

    // Click handlers
    this.setupClickHandler();
    this.setupDragHandlers();

    engine.runRenderLoop(() => {
      scene.render();
    });

    return { engine, scene };
  }

  private enableGodRaysOnObject(mesh: Mesh) {
    const godRays = new VolumetricLightScatteringPostProcess(
      "godrays",
      1.0,
      this._camera!,
      mesh,
      100,
      Texture.BILINEAR_SAMPLINGMODE,
      this._scene!.getEngine(),
      false
    );
    // Customize the density of the rays
    godRays.density = 0.5;

    // Customize the decay of the rays
    godRays.decay = 0.97;

    // Animate
    this._scene!.onBeforeRenderObservable.add(() => {
      godRays.weight = Math.sin(this._scene!.getEngine().getDeltaTime() / 1000);
    });

    // Customize the exposure of the rays
    godRays.exposure = 0.6;
  }

  private setupClickHandler() {
    if (this._scene) {
      this._scene.onPointerDown = (
        _evt: IPointerEvent,
        pickInfo: PickingInfo
      ) => {
        if (pickInfo.pickedMesh) {
          // this.enableGodRaysOnObject(pickInfo.pickedMesh as Mesh);
          if (pickInfo.pickedMesh.name.startsWith("tile")) {
            // Enable god rays on the clicked tile
            this.pickedTile = pickInfo.pickedMesh;
          }
          this.initialMousePos = pickInfo.ray!.origin;
        }
        this.emitCommand(
          SceneEventBusMessages.TileSelected,
          pickInfo?.pickedMesh?.name
        );
      };
    }
  }

  private setupDragHandlers() {
    this._scene!.onPointerMove = (
      _evt: IPointerEvent,
      pickInfo: PickingInfo
    ) => {
      if (this.pickedTile) {
        this._camera?.detachControl();
        // Calculate movement based on pickInfo.ray.origin
        // and this.initialMousePos and move or apply force to tile
        const dragVector = pickInfo.ray!.origin.subtract(this.initialMousePos!);
        //this.pickedTile.position.addInPlace(dragVector.scale(1));
        this.pickedTile.position.y = 1;
        // test if the drag works on the tile:
        this.pickedTile.physicsBody?.applyForce(
          dragVector.scale(1),
          Vector3.Zero()
        );

        this.initialMousePos = pickInfo.ray!.origin;
      }
    };
    this._scene!.onPointerUp = (_evt: IPointerEvent) => {
      this._camera?.attachControl(
        this._scene!.getEngine().getRenderingCanvas()
      );
      if (this.pickedTile) {
        // Calculate force based on how fast and where the mouse moved,
        // then apply that force to this.pickedTile
        this.pickedTile = null; // End the drag operation
      }
    };
  }

  private createLight(scene: Scene) {
    const light = new DirectionalLight("dir01", new Vector3(1, -1, 1), scene);
    light.position = new Vector3(-50, 20, -50);
    light.intensity = 1;
    return light;
  }

  private createCamera(scene: Scene, canvas: HTMLCanvasElement) {
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

  private async createTable(scene: Scene) {
    // Mesh
    const table = MeshBuilder.CreateGround(
      "ground",
      { width: 100, height: 100 },
      scene
    );

    // Physics
    new PhysicsAggregate(table, PhysicsShapeType.BOX, {
      mass: 0,
      restitution: 0.1,
    });

    // PBR
    const groundMat = createTableFabricMaterial(scene);
    table.material = groundMat;
    table.receiveShadows = true;

    return table;
  }

  // helper methods
  emitCommand(name: SceneEventBusMessages, payload?: any) {
    console.log("BabylonJS Scene is sending command", name, payload);
    AsyncBus.emitCommand(this._eventBus, name, payload);
  }

  commandFinished(sceneDirectorCommand: SceneDirectorCommand, payload?: any) {
    console.log(
      "BabylonJS Scene is sending command finished",
      sceneDirectorCommand.id,
      payload
    );
    AsyncBus.commandFinished(this._eventBus, sceneDirectorCommand, payload);
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
