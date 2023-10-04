import {
  Scene,
  Vector3,
  HemisphericLight,
  Mesh,
  IPointerEvent,
  PickingInfo,
  ArcRotateCamera,
  SceneLoader,
  PBRMaterial,
  Texture,
  WebGPUEngine,
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

export class MahjongScene {
  private _scene?: Scene;
  private tilePrefab?: Mesh;

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
    console.log("aaa");
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

    // Material
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
    material.metallic = 0.5;
    material.roughness = 0.5;

    nTile.material = material;
    nTile.setEnabled(true);
    console.log(nTile);
    return nTile;
  }

  addTile(sceneDirectorCommand: SceneDirectorCommand) {
    console.log("monke");
    if (this._scene && this.tilePrefab) {
      const tile = this.tilePrefab.clone("til");
      tile.setEnabled(true);
      tile.position = new Vector3(0, 0, 0);
      this.commandFinished(sceneDirectorCommand);
    }
  }

  getSceneMeshNames(sceneDirectorCommand: SceneDirectorCommand) {
    const names = this._scene?.meshes.map((m) => m.name);
    this.commandFinished(sceneDirectorCommand, names);
  }

  // create the BabylonJS scene
  async createScene(engine: WebGPUEngine, canvas: HTMLCanvasElement) {
    const scene = new Scene(engine);
    this._scene = scene;
    this.tilePrefab = await this.newTilePrefab();

    const camera = new ArcRotateCamera(
      "camera1",
      1,
      0.4,
      40,
      new Vector3(0, 0, 0),
      scene
    );
    camera.setTarget(Vector3.Zero());
    camera.attachControl(canvas, true);

    new HemisphericLight("light", Vector3.Up(), scene);

    this._scene.onPointerDown = (evt: IPointerEvent, pickInfo: PickingInfo) => {
      this.emitCommand(
        SceneEventBusMessages.TileSelected,
        pickInfo?.pickedMesh?.name
      );
    };

    this._scene.onBeforeRenderObservable.add(() => {
      camera.alpha += 0.001;
    });

    engine.runRenderLoop(() => {
      scene.render();
    });

    return { engine, scene };
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
