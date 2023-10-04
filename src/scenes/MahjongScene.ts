import {
  Scene,
  Vector3,
  Color3,
  Mesh,
  IPointerEvent,
  PickingInfo,
  ArcRotateCamera,
  SceneLoader,
  PBRMaterial,
  Texture,
  WebGPUEngine,
  MeshBuilder,
  ShadowGenerator,
  DirectionalLight,
  StandardMaterial,
  HavokPlugin,
  PhysicsShapeType,
  PhysicsAggregate,
} from "@babylonjs/core";

import { GLTFFileLoader } from "@babylonjs/loaders";

import { AsyncBus } from "../bus/AsyncBus";
import { IMessageBus } from "../bus/BusFactory";
import {
  SceneEventBusMessages,
  SceneDirectorEventBusMessages,
} from "../bus/events";
import { SceneDirectorCommand } from "../director/BaseSceneDirector";
import { reviver } from "../utils/json";
import { tiles } from "./tiles";

export class MahjongScene {
  private _scene?: Scene;
  private tilePrefab?: Mesh;
  private shadowGenerator?: ShadowGenerator;

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

  //
  // Your code starts here
  //

  // which messages you want to react to
  getMessagesToActionsMapping() {
    const messagesToActions = new Map<string, (payload: any) => void>();
    messagesToActions.set(SceneDirectorEventBusMessages.AddTile, this.addTile);

    return messagesToActions;
  }

  async newTilePrefab() {
    new GLTFFileLoader();
    let tile = await Promise.resolve(
      SceneLoader.ImportMeshAsync(
        "",
        "./tiles/models/",
        "JogneTuil.gltf",
        this._scene
      )
    );

    let tileParent = tile.meshes[0];
    let nTile = tileParent.getChildMeshes()[0] as Mesh;
    nTile.name = "prefab-tile";

    // Standard Material
    // const newMaterial = new StandardMaterial("newMaterial", this._scene);
    // newMaterial.diffuseColor = new Color3(0.5, 0.5, 0.5);
    // newMaterial.specularColor = new Color3(0.9, 1, 0.9);
    // newMaterial.emissiveColor = new Color3(0.6, 0.6, 0.6);
    // newMaterial.alpha = 1;
    // newMaterial.backFaceCulling = true;
    // nTile.material = newMaterial;

    // Material
    const material = this.createMarbleMaterial();
    nTile.material = material;

    // Position
    nTile.position = new Vector3(0, 5, 0);

    // Scale
    const scale = 0.5;
    nTile.scaling = new Vector3(scale, scale, scale);

    // Shadows
    nTile.receiveShadows = true;
    this.shadowGenerator?.addShadowCaster(nTile);

    nTile.setEnabled(false);

    return nTile;
  }

  private createMarbleMaterial() {
    const material = new PBRMaterial("tileMaterial", this._scene);
    material.albedoTexture = new Texture(
      "./tiles/materials/marble/color_map.jpg",
      this._scene
    );
    material.bumpTexture = new Texture(
      "./tiles/materials/marble/normal_map_opengl.jpg",
      this._scene
    );

    material.ambientTexture = new Texture(
      "./tiles/materials/marble/ao_map.jpg",
      this._scene
    );
    material.metallic = 0;
    material.roughness = 0.1;
    material.albedoColor = new Color3(1, 1, 1);
    material.reflectivityColor = new Color3(0.5, 0.5, 0.5);
    material.microSurface = 1;
    material.reflectionColor = new Color3(0.5, 0.5, 0.5);
    material.metallicReflectanceColor = new Color3(0.5, 0.5, 0.5);
    return material;
  }

  addTile(sceneDirectorCommand?: SceneDirectorCommand) {
    if (this._scene && this.tilePrefab) {
      // Compute new tile ID from number of existing tiles
      const tileId = this._scene.meshes
        .filter((m) => m.name.startsWith("tile"))
        .length.toString();

      // Get amount of tiles
      const tileCount = this._scene.meshes.filter((m) =>
        m.name.startsWith("tile")
      ).length;

      // Clone and position tile next to a tile where there is space available
      const tile = this.tilePrefab.clone(`tile-${tileId}`);
      tile.position = tile.position.add(Vector3.Right().scale(10 * tileCount));

      // Texture decal
      const decalMaterial = new StandardMaterial("decalMat", this._scene);
      let tileCode = 31;
      if (sceneDirectorCommand?.payload) {
        tileCode = sceneDirectorCommand.payload;
      }
      const tileName = tiles[tileCode];
      decalMaterial.diffuseTexture = new Texture(
        `./tiles/textures/${tileName}.png`,
        this._scene
      );
      decalMaterial.diffuseTexture.hasAlpha = true;
      const goldColor = new Color3(0.9, 0.8, 0.1);
      decalMaterial.specularColor = goldColor;
      decalMaterial.backFaceCulling = true;

      const scale = 0.8;
      const decal = MeshBuilder.CreateDecal(`decal-${tileId}`, tile, {
        position: tile.absolutePosition,
        normal: Vector3.Up(),
        size: new Vector3(8 * scale, 10 * scale, 10 * scale),
        angle: Math.PI / 2,
        localMode: true,
        cullBackFaces: true,
      });
      decal.material = decalMaterial.clone(`decal-${tileId}-material`);
      decal.material.zOffset = -0.2;

      tile.setEnabled(true);
      this.shadowGenerator?.addShadowCaster(tile);

      if (sceneDirectorCommand) {
        this.commandFinished(sceneDirectorCommand);
      }
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

    // Shadows
    this.shadowGenerator = new ShadowGenerator(1024, light);
    this.shadowGenerator.usePoissonSampling = true;

    // Tile prefab (after shadows to avoid no shadow caster)
    this.tilePrefab = await this.newTilePrefab();

    // Ground
    this.createGround(scene);

    // Camera
    const camera = this.createCamera(scene);
    camera.attachControl(canvas, true);

    this._scene.onPointerDown = (evt: IPointerEvent, pickInfo: PickingInfo) => {
      this.emitCommand(
        SceneEventBusMessages.TileSelected,
        pickInfo?.pickedMesh?.name
      );
    };

    this._scene.onBeforeRenderObservable.add(() => {
      camera.alpha += 0.001;
    });

    // Spawn a first tile
    this.addTile();

    engine.runRenderLoop(() => {
      scene.render();
    });

    return { engine, scene };
  }

  private createLight(scene: Scene) {
    const light = new DirectionalLight("dir01", new Vector3(1, -1, 1), scene);
    light.position = new Vector3(-50, 20, -50);
    light.intensity = 1;
    return light;
  }

  private createCamera(scene: Scene) {
    const camera = new ArcRotateCamera(
      "camera1",
      0.5,
      0.8,
      60,
      new Vector3(0, 0, 0),
      scene
    );
    camera.setTarget(Vector3.Zero());
    return camera;
  }

  private createGround(scene: Scene) {
    // Mesh
    const ground = MeshBuilder.CreateGround(
      "ground",
      { width: 100, height: 100 },
      scene
    );

    // Physics
    new PhysicsAggregate(ground, PhysicsShapeType.BOX, {
      mass: 0,
      restitution: 0.1,
    });

    // Material
    const groundMat = new StandardMaterial("groundMat", scene);
    groundMat.diffuseColor = new Color3(0.15, 0.4, 0.15);
    groundMat.specularColor = new Color3(0, 0, 0);
    ground.material = groundMat;
    ground.receiveShadows = true;
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
