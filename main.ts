
import JoypadKeyboard from "./joypad/joypad-keyboard.js";
import Timer from "./timer.js";
import Serial from "./serial/dummy-serial.js";
import AudioController from "./audio/audio-controller.js";
import MMU from "./memory/mmu.js";
import LocalStorageRamPersistence from "./memory/persistence/localstorage-persistence.js";
import PixelProcessingUnit from "./graphics/ppu.js";
import CanvasRenderer from "./graphics/canvas-renderer.js";

import CPU from "./cpu/cpu.js";
import SpeedManager from "./cpu/speed-mgr.js";

import { FpsCounter, loadBlob } from "./utils.js"
import VRamDebugDisplay from "./graphics/vram-debug-display.js";
import AudioDebugDisplay from "./audio/audio-debug-display.js";
import Registers from "./cpu/cpu-registers.js";

let bootRom : string | null = null;
let romPath = "roms/Super Mario Land (JUE) (V1.1) [!].gb";
const params = new URLSearchParams(window.location.search);
if(params.has("rom")){
    romPath = <string>params.get("rom");
}
if(params.has("bootrom")){
    bootRom = <string>params.get("bootrom");
}

async function initialize(){
    const mmu = new MMU(LocalStorageRamPersistence);
    const cpuRegisters = new Registers();
    const cpuSpeedManager = new SpeedManager();
    const cpu = new CPU(mmu, cpuRegisters, cpuSpeedManager);

    mmu.mapSpeedManager(cpuSpeedManager);

    const rom = await loadBlob(romPath);
    mmu.loadCartridge(rom);

    if(bootRom){
        const bios = await loadBlob(bootRom);
        mmu.mapBootRom(bios);
    } else {
        cpuRegisters.initPostBoot(mmu.isColorMode());
    }
    
    window.addEventListener("beforeunload", () => mmu.saveRam());

    const renderer = new CanvasRenderer(<HTMLCanvasElement>document.getElementById("screen"));
    const ppu = new PixelProcessingUnit(mmu, renderer);
    mmu.mapGraphics(ppu);
    cpu.registerGpuCallbacks(ppu);

    const joypad = new JoypadKeyboard();
    mmu.mapJoypad(joypad);
    cpu.registerJoypadCallbacks(joypad);

    const timer = new Timer();
    mmu.mapTimer(timer);
    cpu.registerTimerCallbacks(timer);

    const serial = new Serial();
    mmu.mapSerial(serial);
    cpu.registerSerialCallbacks(serial);

    const audio = new AudioController();
    // initialized / mapped later
    const volumeSlider = <HTMLInputElement>document.getElementById("volume");
    volumeSlider.addEventListener("input", (e) =>{
        audio.setVolume(parseFloat(volumeSlider.value));
    });
    audio.setVolume(parseFloat(volumeSlider.value));

    const frameTime = <HTMLElement>document.getElementById("frametime");
    const fps = <HTMLElement>document.getElementById("fpsCounter");

    const browserFps = new FpsCounter();
    const gpuFps = new FpsCounter();
    let waitingForVsync = true;
    ppu.onVblank(() => {
        gpuFps.update();
        fps.innerText = browserFps.getCount() + "/" + gpuFps.getCount();
        waitingForVsync = false;
    });

    new VRamDebugDisplay(mmu, ppu);
    new AudioDebugDisplay(mmu, ppu, audio);

    let paused = false;
    let initialised = false;
    function run(elapsed : number){
        requestAnimationFrame(run);
        if(paused){
            return;
        }
        const tickStart = performance.now();
        waitingForVsync = true;
        // If we run for more than 32ms of emulated CPU cycles then something's gone wrong, back off
        let targetCycles = 4194.304 * Math.min(32, elapsed);
        while(waitingForVsync && targetCycles > 0){
            const simulatedCycles = cpu.tick();
            const singleSpeedCycles = simulatedCycles / cpuSpeedManager.modifier();
            ppu.tick(singleSpeedCycles);
            timer.tick(simulatedCycles);
            serial.tick(simulatedCycles);
            audio.tick(singleSpeedCycles);
            targetCycles -= singleSpeedCycles;
        }

        const rtElapsed = performance.now() - tickStart;
        frameTime.innerText = Math.round(rtElapsed).toString();
        browserFps.update();
        fps.innerText = browserFps.getCount() + "/" + gpuFps.getCount();
    }
    const beginButton = <HTMLElement>document.getElementById("begin");
    beginButton.addEventListener("click", async () => {
        if(!initialised){
            initialised = true;
            await audio.initialize();
            mmu.mapAudio(audio);

            requestAnimationFrame(run);
        } else {
            paused = !paused;
        }
        beginButton.innerText = paused ? "Resume" : "Pause";
    })
    
}
initialize();
