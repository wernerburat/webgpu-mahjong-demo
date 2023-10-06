import {
  Scene,
  Vector3,
  Mesh,
  ArcRotateCamera,
  WebGPUEngine,
  MeshBuilder,
  ShadowGenerator,
  HavokPlugin,
  PhysicsShapeType,
  PhysicsAggregate,
  CubeTexture,
  DirectionalLight,
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
import { SceneLighting } from "./SceneLighting";
import { SceneCamera } from "./SceneCamera";
import { createTableFabricMaterial } from "./MahjongMaterials";
import { SceneEvents } from "./SceneEvents";
import { PostProcessingSetup } from "./PostProcessingSetup";

export class MahjongScene {
  private _scene?: Scene;
  private _camera?: ArcRotateCamera | undefined;
  private tilePrefab?: Mesh;
  private shadowGenerator?: ShadowGenerator;
  private tileManager?: MahjongTileManager;

  constructor(private _eventBus: IMessageBus) {}

  async createScene(
    engine: WebGPUEngine,
    canvas: HTMLCanvasElement,
    hk: HavokPlugin
  ) {
    const scene = this.initializeScene(engine, hk);
    const light = this.setupLighting(scene);
    this.setupEnvironment(scene);
    this.setupShadows(scene, light);
    await this.setupTileManager(scene);
    await this.setupTable(scene);
    this.setupCamera(scene, canvas);
    this.setupEventHandlers(scene);
    this.setupPostProcessing(scene, this._camera!, engine);
    this.startRenderLoop(engine, scene);
    return { engine, scene };
  }

  private initializeScene(engine: WebGPUEngine, hk: HavokPlugin): Scene {
    const scene = new Scene(engine);
    scene.enablePhysics(new Vector3(0, -9.81, 0), hk);
    this._scene = scene;
    return scene;
  }

  private setupLighting(scene: Scene): DirectionalLight {
    return SceneLighting.createLight(scene);
  }

  private setupPostProcessing(
    scene: Scene,
    camera: ArcRotateCamera,
    engine: WebGPUEngine
  ): void {
    PostProcessingSetup.applyAllPostProcessing(scene, camera, engine);
  }

  private setupEnvironment(scene: Scene): void {
    const envTex = CubeTexture.CreateFromPrefilteredData(
      "./env/fireplace.env",
      scene
    );
    scene.environmentTexture = envTex;
    scene.createDefaultSkybox(envTex, true, 1000, 0.2);
  }

  private setupShadows(_scene: Scene, light: DirectionalLight): void {
    this.shadowGenerator = new ShadowGenerator(1024, light);
    this.shadowGenerator.usePoissonSampling = true;
  }

  private async setupTileManager(_scene: Scene): Promise<void> {
    this.tileManager = new MahjongTileManager(
      this._scene!,
      this.shadowGenerator!
    );
    await this.tileManager.initializeManager();
    this.tileManager.createAllTilesOnTable();
    this.tileManager.createTilesPhysics();
  }

  private async setupTable(scene: Scene): Promise<void> {
    await this.createTable(scene);
  }

  private setupCamera(scene: Scene, canvas: HTMLCanvasElement): void {
    this._camera = SceneCamera.createCamera(scene, canvas);
  }

  private setupEventHandlers(scene: Scene): void {
    SceneEvents.setupClickHandler(scene, this.emitCommand.bind(this));
    SceneEvents.setupDragHandlers(scene, this._camera!);
  }

  private startRenderLoop(engine: WebGPUEngine, scene: Scene): void {
    engine.runRenderLoop(() => {
      scene.render();
    });
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
