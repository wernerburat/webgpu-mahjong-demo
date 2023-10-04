import { ref } from "vue";
import {
  SceneDirectorEventBusMessages,
  SceneEventBusMessages,
} from "../bus/events";
import { BaseSceneDirector } from "./BaseSceneDirector";

export class MahjongSceneDirector extends BaseSceneDirector {
  private _selectedMarbleName = ref("");

  constructor() {
    super();
    this.registerSceneEvents();
  }

  private registerSceneEvents() {
    // this.asyncBus.$on(SceneEventBusMessages.MarbleSelected, (name: string) => {
    //   console.log("Marble selected", name);
    //   this._selectedMarbleName.value = name;
    // });
  }

  // unregister your events here
  public unregisterSceneEvents() {
    // this.asyncBus.$off(SceneEventBusMessages.MarbleSelected);
  }

  //

  async getMeshNames() {
    const retvalue = await this.asyncCommand(
      SceneDirectorEventBusMessages.GetMeshNames,
      {}
    );
    return retvalue;
  }

  async addTile() {
    console.log("suc");
    void this.asyncCommand(SceneDirectorEventBusMessages.AddTile);
  }

  // Vue reactive stuff
  useSelectedMarbleName() {
    return this._selectedMarbleName;
  }
}
