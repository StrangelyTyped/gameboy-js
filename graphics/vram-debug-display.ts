import MMU from "../memory/mmu.js";
import PixelProcessingUnit from "./ppu.js";
import WinBox from "https://unpkg.com/winbox@0.2.0/src/js/winbox.js";
import CanvasRenderer from "./canvas-renderer.js";


export default class VRamDebugDisplay {
    #vramViewer : WinBox | null = null;
    constructor(mmu : MMU, ppu : PixelProcessingUnit){
        const vramViewerButton = <HTMLElement>document.getElementById("debug-show-vram-viewer");
        const vramViewerContent = <HTMLElement>document.getElementById("debug-vram-viewer-content");
        const debugCanvasRenderer = new CanvasRenderer(<HTMLCanvasElement>document.getElementById("vram-canvas"));
        const scrollX = <HTMLElement>document.getElementById("debug-vram-scrollx");
        const scrollY = <HTMLElement>document.getElementById("debug-vram-scrolly");
        const bgTileMap = <HTMLElement>document.getElementById("debug-vram-bgtilemap");
        const winTileMap = <HTMLElement>document.getElementById("debug-vram-wintilemap");
        const tileData = <HTMLElement>document.getElementById("debug-vram-tiledata");

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
        
        vramViewerButton.addEventListener("click", () => {
            if(!this.#vramViewer){
                this.#vramViewer = new WinBox({
                    title: "VRAM Viewer",
                    mount: vramViewerContent,
                    width: "300px",
                    height: "650px",
                    x: "right",
                    onclose: () => {
                        this.#vramViewer = null;
                    }
                });
            }
        });

        ppu.onVblank(() => {
            if(this.#vramViewer){
                const tileMap = parseInt((<HTMLInputElement>document.querySelector("input[name=vram-map]:checked")).value) || -1;
                const tileBank = parseInt((<HTMLInputElement>document.querySelector("input[name=vram-bank]:checked")).value) || -1;
                ppu.debugRenderVram(debugCanvasRenderer, tileMap, tileBank);
                scrollX.innerText = mmu.read(0xFF43).toString();
                scrollY.innerText = mmu.read(0xFF42).toString();
                const lcdc = mmu.read(0xFF40);
                bgTileMap.innerText = lcdc & 0x08 ? "9800" : "9C00";
                winTileMap.innerText = lcdc & 0x40 ? "9800" : "9C00";
                tileData.innerText = lcdc & 0x10 ? "8800" : "8000";
            }
        });
    }

    
    
}