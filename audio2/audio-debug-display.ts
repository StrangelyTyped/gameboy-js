import MMU from "../memory/mmu.js";
import PixelProcessingUnit from "../graphics/ppu.js";
import DebugWindow from "../debug-window.js";
import AudioController from "./audio-controller.js";


export default class AudioDebugDisplay extends DebugWindow {
    #ppu;
    #mmu;
    #audio;
    #displayElements : Record<string, HTMLElement> = {};
    constructor(mmu : MMU, ppu : PixelProcessingUnit, audio : AudioController){
        super(ppu, "Audio Channels", 650, 300, "debug-audio-channels-content");
        this.#ppu = ppu;
        this.#mmu = mmu;
        this.#audio = audio;

        this.#displayElements = {
            pan1: <HTMLInputElement>document.getElementById("audio-ch1-pan"),
            pan2: <HTMLInputElement>document.getElementById("audio-ch2-pan"),
            pan3: <HTMLInputElement>document.getElementById("audio-ch3-pan"),
            pan4: <HTMLInputElement>document.getElementById("audio-ch4-pan"),
        }

        for(let i = 0; i < 4; i++){
            const enableSwitch = <HTMLInputElement>document.getElementById("audio-ch" + (i + 1) + "-enabled");
            enableSwitch.addEventListener("input", (e) =>{
                audio.debugSetChannelEnabled(i, enableSwitch.checked);
            });
        }
    }
        

    update() {
        const pan = this.#mmu.read(0xFF25);
        (<HTMLInputElement>this.#displayElements.pan1).value = (((pan & 0x1) ? 1 : 0) + ((pan & 0x10) ? -1 : 0)).toString();
        (<HTMLInputElement>this.#displayElements.pan2).value = (((pan & 0x2) ? 1 : 0) + ((pan & 0x20) ? -1 : 0)).toString();
        (<HTMLInputElement>this.#displayElements.pan3).value = (((pan & 0x4) ? 1 : 0) + ((pan & 0x40) ? -1 : 0)).toString();
        (<HTMLInputElement>this.#displayElements.pan4).value = (((pan & 0x8) ? 1 : 0) + ((pan & 0x80) ? -1 : 0)).toString();
    }
    

    
    
}