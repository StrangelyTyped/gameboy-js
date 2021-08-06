import PixelProcessingUnit from "./graphics/ppu.js";
import WinBox from "https://unpkg.com/winbox@0.2.0/src/js/winbox.js";


export default abstract class DebugWindow {
    #window : WinBox | null = null;
    #windowContent : HTMLElement;
    constructor(ppu : PixelProcessingUnit, windowTitle : string, windowWidth : number, windowHeight : number, fragmentId : string){
        const debugMenu = <HTMLElement>document.getElementById("debug-menu");
        const debugListItem = document.createElement("li");
        const debugLink = document.createElement("a");
        debugLink.className = "dropdown-item";
        debugLink.href = "#";
        debugLink.innerText = windowTitle;
        debugListItem.append(debugLink);
        debugMenu.append(debugListItem);
        this.#windowContent = <HTMLElement>document.getElementById(fragmentId);
        
        
        debugLink.addEventListener("click", () => {
            if(!this.#window){
                this.#window = new WinBox({
                    title: windowTitle,
                    mount: this.#windowContent,
                    width: windowWidth + "px",
                    height: windowHeight + "px",
                    x: "right",
                    onclose: () => {
                        this.#window = null;
                    }
                });
            }
        });

        ppu.onVblank(() => {
            if(this.#window){
                this.update();
            }
        });
    }

    getWindowContent() : HTMLElement {
        return this.#windowContent;
    }

    abstract update() : void;
    
}