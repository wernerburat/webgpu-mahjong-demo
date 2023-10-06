import {
  Scene,
  Mesh,
  Texture,
  Vector3,
  SceneLoader,
  ShadowGenerator,
  StandardMaterial,
  MeshBuilder,
  Color3,
  PhysicsShapeType,
  PhysicsAggregate,
} from "@babylonjs/core";
import { tiles } from "./tiles";
import { createMarbleMaterial } from "./MahjongMaterials";
import { GLTFFileLoader } from "@babylonjs/loaders";

export class MahjongTileManager {
  private _scene: Scene;
  private _shadowGenerator: ShadowGenerator;
  private _faceTextures: Map<number, Texture> = new Map();
  private _tilePrefab?: Mesh;

  constructor(scene: Scene, shadowGenerator: ShadowGenerator) {
    this._scene = scene;
    this._shadowGenerator = shadowGenerator;
  }

  async initializeManager(): Promise<void> {
    this._tilePrefab = await this.createTilePrefab();
    this._faceTextures = this.createAllTextures(this._scene);
  }

  async createTilePrefab(): Promise<Mesh> {
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
    const material = createMarbleMaterial(this._scene);
    nTile.material = material;

    // Position
    nTile.position = new Vector3(0, 0, 0);

    // Scale
    const scale = 0.4;
    nTile.scaling = new Vector3(scale, scale, scale);

    // Shadows
    nTile.receiveShadows = true;
    this._shadowGenerator?.addShadowCaster(nTile);

    // Disable by default
    nTile.setEnabled(false);
    return nTile;
  }

  createTilesPhysics() {
    const tiles = this.getAllTiles();
    tiles?.forEach((tile) => {
      new PhysicsAggregate(tile, PhysicsShapeType.BOX, {
        mass: 5,
        restitution: 0.1,
      });
    });
  }

  getAllTiles() {
    return this._scene?.meshes.filter((m) => m.name.startsWith("tile"));
  }

  assignTileDecal(tileCode: number, tileId: string, tile: Mesh): void {
    const decalMaterial = new StandardMaterial("decalMat", this._scene);

    const texture = this._faceTextures.get(tileCode);
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

  createAllTilesOnTable(): void {
    if (this._scene && this._tilePrefab) {
      console.log(this._tilePrefab);
      const tileBoundingInfo =
        this._tilePrefab.getBoundingInfo().boundingBox.extendSize;
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

  createTile(tileCode: number, spawn: boolean = true) {
    if (this._scene && this._tilePrefab) {
      // TILE NAME
      const tileName = this.generateTileName(tileCode);

      // CLONE PREFAB
      const tile = this._tilePrefab.clone(tileName);

      // ASSIGN DECAL (FACE TEXTURE)
      this.assignTileDecal(tileCode, tileName, tile);

      // SPAWN IT?
      tile.setEnabled(spawn);

      return tile;
    }
    return null;
  }

  generateTileName(tileCode: number) {
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

  createAllTextures(scene: Scene): Map<number, Texture> {
    const textures = new Map<number, Texture>();
    Object.keys(tiles).forEach((key) => {
      const tileName = tiles[Number(key)];
      const texture = new Texture(`./tiles/textures/${tileName}.png`, scene);
      textures.set(Number(key), texture);
    });
    return textures;
  }

  getTileTexture(tileCode: number): Texture | undefined {
    return this._faceTextures.get(tileCode);
  }

  getTableTopLeftPosition() {
    return new Vector3(-44, 3, -40);
  }

  dispose(): void {
    this._faceTextures.forEach((texture) => texture.dispose());
  }
}
