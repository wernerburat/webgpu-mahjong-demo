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
  CubeTexture,
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
    messagesToActions.set(
      SceneDirectorEventBusMessages.SpawnAllTiles,
      this.spawnAllTiles
    );

    return messagesToActions;
  }

  async createTilePrefab() {
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

    // Material
    const material = this.createMarbleMaterial();
    nTile.material = material;

    // Position
    nTile.position = new Vector3(0, 150, 0);

    // Scale
    const scale = 0.4;
    nTile.scaling = new Vector3(scale, scale, scale);

    // Shadows
    nTile.receiveShadows = true;
    this.shadowGenerator?.addShadowCaster(nTile);

    nTile.setEnabled(false);

    return nTile;
  }

  private createTableFabricMaterial() {
    // Green pool / casino table fabric
    const material = new PBRMaterial("tableMaterial", this._scene);
    material.albedoTexture = new Texture(
      "./materials/table/fabrics_0075_color_4k.jpg",
      this._scene
    );
    material.bumpTexture = new Texture(
      "./materials/table/fabrics_0075_normal_directx_4k.png",
      this._scene
    );
    material.ambientTexture = new Texture(
      "./materials/table/fabrics_0075_ao_4k.jpg",
      this._scene
    );
    material.metallic = 0;
    material.roughness = 1;

    return material;
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
    material.roughness = 0;
    material.albedoColor = new Color3(1, 1, 1);
    material.reflectivityColor = new Color3(1, 1, 1);
    material.reflectionColor = new Color3(1, 1, 1);
    material.metallicReflectanceColor = new Color3(0.5, 0.5, 0.5);
    return material;
  }

  private spawnTile(tileCode: number, position?: Vector3) {
    if (this._scene && this.tilePrefab) {
      // Compute new tile ID from number of existing tiles
      const tileId = this._scene.meshes.filter((m) =>
        m.name.startsWith("tile")
      ).length;

      // Clone and position tile next to a tile where there is space available
      const tile = this.tilePrefab.clone(`tile-${tileId}`);
      // Texture decal
      this.createTileDecal(tileCode, tileId.toString(), tile);

      if (!position) {
        const randomness = Math.random() * 10;
        const newHeightFactor = Math.random() * 20 * tile.scaling.y;
        tile.position = tile.position.add(
          Vector3.Up().scale(5 * tileId + newHeightFactor)
        );
        tile.position = tile.position.add(Vector3.Left().scale(randomness));
      } else {
        tile.position = position;
      }

      if (!position) {
        // Rotate randomly to make it look more natural
        const factor = 1;
        tile.rotation = new Vector3(
          Math.random() * factor,
          Math.random() * factor,
          Math.random() * factor
        );
      }

      tile.setEnabled(true);
      this.shadowGenerator?.addShadowCaster(tile);
      new PhysicsAggregate(tile, PhysicsShapeType.BOX, {
        mass: 100,
        restitution: 1,
      });
    }
  }

  private createTileDecal(tileCode: number, tileId: string, tile: Mesh) {
    // Get the "tileCode" from the payload or generate a random one
    if (!tileCode) {
      // take random value from keys of "tiles"
      const keys = Object.keys(tiles);
      tileCode = Number(keys[(keys.length * Math.random()) << 0]);
    }
    const decalMaterial = new StandardMaterial("decalMat", this._scene);

    const tileName = tiles[tileCode];
    decalMaterial.diffuseTexture = new Texture(
      `./tiles/textures/${tileName}.png`,
      this._scene
    );
    decalMaterial.diffuseTexture.hasAlpha = true;
    const goldColor = new Color3(0.9, 0.8, 0.1);
    decalMaterial.specularColor = goldColor;
    decalMaterial.backFaceCulling = true;

    console.log(tile.scaling);
    const scale = 2;
    const newSize = new Vector3(
      tile.scaling.x * 6 * scale,
      tile.scaling.y * 8 * scale,
      tile.scaling.z * 8 * scale
    );
    const decal = MeshBuilder.CreateDecal(`decal-${tileId}`, tile, {
      position: tile.absolutePosition,
      normal: Vector3.Up(),
      size: newSize,
      angle: Math.PI / 2,
      localMode: true,
      cullBackFaces: true,
    });
    decal.material = decalMaterial.clone(`decal-${tileId}-material`);
    decal.material.zOffset = -0.3;
  }

  addTile(sceneDirectorCommand: SceneDirectorCommand) {
    if (this._scene && this.tilePrefab) {
      console.log("aaaaaaaa", sceneDirectorCommand.payload);
      this.spawnTile(sceneDirectorCommand.payload);

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

    // Tile prefab (after shadows to avoid no shadow caster)
    this.tilePrefab = await this.createTilePrefab();

    // Table
    await this.createTable(scene);

    // Camera
    const camera = this.createCamera(scene);
    camera.attachControl(canvas, true);

    this._scene.onPointerDown = (
      _evt: IPointerEvent,
      pickInfo: PickingInfo
    ) => {
      this.emitCommand(
        SceneEventBusMessages.TileSelected,
        pickInfo?.pickedMesh?.name
      );
    };

    this._scene.onBeforeRenderObservable.add(() => {
      camera.alpha += 0.001;
    });

    // // Spawn a first tile
    // this.addTile();

    //this.spawnAllTiles();

    engine.runRenderLoop(() => {
      scene.render();
    });

    return { engine, scene };
  }

  private spawnAllTiles() {
    for (let i = 0; i < 4; i++) {
      Object.keys(tiles).forEach((key) => {
        this.spawnTile(Number(key));
      });
    }
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
      0.6,
      150,
      new Vector3(0, 0, 0),
      scene
    );
    camera.setTarget(Vector3.Zero());
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

    // Material
    // const groundMat = new StandardMaterial("groundMat", scene);
    // groundMat.diffuseColor = new Color3(0.15, 0.4, 0.15);
    // groundMat.specularColor = new Color3(0, 0, 0);
    // table.material = groundMat;
    // table.receiveShadows = true;

    // PBR
    const groundMat = this.createTableFabricMaterial();
    table.material = groundMat;
    table.receiveShadows = true;
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
