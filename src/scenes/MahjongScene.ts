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
  Nullable,
  AbstractMesh,
  PhysicsImpostor,
  VolumetricLightScatteringPostProcess,
  ArcRotateCameraKeyboardMoveInput,
  Matrix,
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
  private _camera?: ArcRotateCamera;
  private tilePrefab?: Mesh;
  private shadowGenerator?: ShadowGenerator;
  private faceTextures? = new Map<number, Texture>();

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
    nTile.position = new Vector3(0, 0, 0);

    // Scale
    const scale = 0.4;
    nTile.scaling = new Vector3(scale, scale, scale);

    // Shadows
    nTile.receiveShadows = true;
    this.shadowGenerator?.addShadowCaster(nTile);

    // Disable by default
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

  private spawnTilesDemo(tileCode: number, position?: Vector3) {
    if (this._scene && this.tilePrefab) {
      // Compute new tile ID from number of existing tiles
      const tileId = this._scene.meshes.filter((m) =>
        m.name.startsWith("tile")
      ).length;

      // Clone and position tile next to a tile where there is space available
      const tile = this.tilePrefab.clone(`tile-${tileId}`);
      // Texture decal
      this.assignTileDecal(tileCode, tileId.toString(), tile);

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
        mass: 5,
        restitution: 0.1,
      });
    }
  }

  private assignTileDecal(tileCode: number, tileId: string, tile: Mesh) {
    const decalMaterial = new StandardMaterial("decalMat", this._scene);

    const texture = this.faceTextures!.get(tileCode);
    if (!texture) {
      console.error("Texture not found for tile code", tileCode);
      return;
    }
    decalMaterial.diffuseTexture = texture;
    decalMaterial.diffuseTexture.hasAlpha = true;
    const goldColor = new Color3(0.9, 0.8, 0.1);
    decalMaterial.specularColor = goldColor;
    decalMaterial.backFaceCulling = true;

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
    decal.material.zOffset = -1;
    decal.isPickable = false;
  }

  addTile(sceneDirectorCommand: SceneDirectorCommand) {
    if (this._scene && this.tilePrefab) {
      console.log("aaaaaaaa", sceneDirectorCommand.payload);
      this.spawnTilesDemo(sceneDirectorCommand.payload);

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

    // Prepare textures
    this.faceTextures = this.createAllTextures();

    // Table
    const table = await this.createTable(scene);

    // Camera
    this._camera = this.createCamera(scene, canvas);

    //godRays.mesh.position = lightMesh.position;
    //godRays.density = 0.5;

    // Spawn tiles!
    this.createAllTilesOnTable();

    // Add physics to tiles
    this.createTilesPhysics();
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
          this.enableGodRaysOnObject(pickInfo.pickedMesh as Mesh);
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
  private createTilesPhysics() {
    const tiles = this.getAllTiles();
    tiles?.forEach((tile) => {
      new PhysicsAggregate(tile, PhysicsShapeType.BOX, {
        mass: 5,
        restitution: 0.1,
      });
    });
  }

  private getAllTiles() {
    return this._scene?.meshes.filter((m) => m.name.startsWith("tile"));
  }

  private spawnAllTiles() {
    for (let i = 0; i < 4; i++) {
      Object.keys(tiles).forEach((key) => {
        this.spawnTilesDemo(Number(key));
      });
    }
  }

  private createTile(tileCode: number, spawn: boolean = true) {
    if (this._scene && this.tilePrefab) {
      // TILE NAME
      const tileName = this.generateTileName(tileCode);

      // CLONE PREFAB
      const tile = this.tilePrefab.clone(tileName);

      // ASSIGN DECAL (FACE TEXTURE)
      this.assignTileDecal(tileCode, tileName, tile);

      // SPAWN IT?
      tile.setEnabled(spawn);

      return tile;
    }
    return null;
  }

  private generateTileName(tileCode: number) {
    let tileName = "";
    if (this._scene) {
      // TILE NAME: tile-<tileCode>-<tileId>

      // Example: tileCode = 1
      // Name will be: "tile-1-0"
      // Second one will be: "tile-1-1", etc.
      let tileId = 0;
      tileName = `tile-${tileCode}-${tileId}`;
      while (this._scene.getMeshByName(tileName)) {
        tileId++;
        tileName = `tile-${tileCode}-${tileId}`;
      }
    }
    return tileName;
  }

  /*** Helper function to spawn all tiles on table. */
  private createAllTilesOnTable() {
    if (this._scene && this.tilePrefab) {
      const tileBoundingInfo =
        this.tilePrefab.getBoundingInfo().boundingBox.extendSize;
      const tileWidth = tileBoundingInfo.x;
      const tileDepth = tileBoundingInfo.z; // Use the depth
      const tilesPerRow = 10; // Assuming 10 tiles per row

      const position = this.getTableTopLeftPosition();

      Object.keys(tiles).forEach((key, index) => {
        const rowNumber = Math.floor(index / tilesPerRow);
        const columnNumber = index % tilesPerRow;

        const tile = this.createTile(Number(key), true);
        tile!.position = position.add(
          new Vector3(
            tileWidth * columnNumber,
            0,
            tileDepth * rowNumber // Adjusting the Z-coordinate
          )
        );
      });
    }
  }

  private getTableTopLeftPosition() {
    return new Vector3(-44, 3, -40);
  }
  private createAllTextures(): Map<number, Texture> {
    const textures = new Map<number, Texture>();
    Object.keys(tiles).forEach((key) => {
      const tileName = tiles[Number(key)];
      const texture = new Texture(
        `./tiles/textures/${tileName}.png`,
        this._scene
      );
      textures.set(Number(key), texture);
    });
    return textures;
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
    const groundMat = this.createTableFabricMaterial();
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
