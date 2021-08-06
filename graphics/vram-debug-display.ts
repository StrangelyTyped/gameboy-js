import MMU from "../memory/mmu.js";
import PixelProcessingUnit from "./ppu.js";
import DebugWindow from "../debug-window.js";
import CanvasRenderer from "./canvas-renderer.js";


export default class VRamDebugDisplay extends DebugWindow {
    #ppu;
    #mmu;
    #debugCanvasRenderer;
    #displayElements : Record<string, HTMLElement>;
    constructor(mmu : MMU, ppu : PixelProcessingUnit){
        super(ppu, "VRAM Viewer", 300, 650, "debug-vram-viewer-content");
        this.#ppu = ppu;
        this.#mmu = mmu;
        this.#debugCanvasRenderer = new CanvasRenderer(<HTMLCanvasElement>this.getWindowContent().querySelector("canvas"));
        this.#displayElements = {
            scrollX: <HTMLElement>this.getWindowContent().querySelector("[data-display-var=scrollx]"),
            scrollY: <HTMLElement>this.getWindowContent().querySelector("[data-display-var=scrolly]"),
            bgTileMap: <HTMLElement>this.getWindowContent().querySelector("[data-display-var=bgtilemap]"),
            winTileMap: <HTMLElement>this.getWindowContent().querySelector("[data-display-var=wintilemap]"),
            tileData: <HTMLElement>this.getWindowContent().querySelector("[data-display-var=tiledata]"),
        }

        const highlightBg = <HTMLInputElement>document.getElementById("vram-highlight-bg");
        const highlightWin = <HTMLInputElement>document.getElementById("vram-highlight-win");
        const highlightSprite = <HTMLInputElement>document.getElementById("vram-highlight-sprite");

        highlightBg.addEventListener("input", (e) => {
            ppu.debugSetHighlightBg(highlightBg.checked);
        });
        highlightWin.addEventListener("input", (e) => {
            ppu.debugSetHighlightWin(highlightWin.checked);
        });
        highlightSprite.addEventListener("input", (e) => {
            ppu.debugSetHighlightSprite(highlightSprite.checked);
        });
    }
        

    update() {
        const tileMap = parseInt((<HTMLInputElement>this.getWindowContent().querySelector("input[name=vram-map]:checked")).value) || -1;
        const tileBank = parseInt((<HTMLInputElement>this.getWindowContent().querySelector("input[name=vram-bank]:checked")).value) || -1;
        this.#ppu.debugRenderVram(this.#debugCanvasRenderer, tileMap, tileBank);
        this.#displayElements.scrollX.innerText = this.#mmu.read(0xFF43).toString();
        this.#displayElements.scrollY.innerText = this.#mmu.read(0xFF42).toString();
        const lcdc = this.#mmu.read(0xFF40);
        this.#displayElements.bgTileMap.innerText = lcdc & 0x08 ? "9C00" : "9800";
        this.#displayElements.winTileMap.innerText = lcdc & 0x40 ? "9C00" : "9800";
        this.#displayElements.tileData.innerText = lcdc & 0x10 ? "8000" : "8800";
    }
    

    
    
}