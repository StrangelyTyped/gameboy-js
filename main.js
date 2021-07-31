
import JoypadKeyboard from "./joypad-keyboard.js";
import Timer from "./timer.js";
import Serial from "./serial.js";
import Audio from "./audio.js";
import MMU from "./mmu.js";
import GraphicsPipeline from "./graphics.js";

import cpu from "./cpu.js";

import { FpsCounter, loadBlob } from "./utils.js"

async function initialize(){
    const mmu = new MMU();
    cpu.setMmu(mmu);
    const bios = await loadBlob("roms/gb_bios.bin");
    mmu.mapBootRom(bios);
    const rom = await loadBlob("roms/Super Mario Land (JUE) (V1.1) [!].gb");
    mmu.loadCartridge(rom);
    window.addEventListener("beforeunload", () => mmu.saveRam());

    const gpu = new GraphicsPipeline(document.getElementById("screen"));
    mmu.mapGpuMemory(gpu);
    cpu.registerGpuCallbacks(gpu);

    const joypad = new JoypadKeyboard();
    mmu.mapJoypad(joypad);
    cpu.registerJoypadCallbacks(joypad);

    const timer = new Timer();
    mmu.mapTimer(timer);
    cpu.registerTimerCallbacks(timer);

    const serial = new Serial();
    mmu.mapSerial(serial);
    cpu.registerSerialCallbacks(serial);

    const audio = new Audio();
    // initialized / mapped later
    document.getElementById("volume").addEventListener("input", (e) =>{
        audio.setVolume(e.target.value);
    });
    audio.setVolume(document.getElementById("volume").value);

    const frameTime = document.getElementById("frametime");
    const fps = document.getElementById("fpsCounter");

    const browserFps = new FpsCounter();
    const gpuFps = new FpsCounter();
    let waitingForVsync = true;
    gpu.onVblank(() => {
        gpuFps.update();
        fps.innerText = browserFps.getCount() + "/" + gpuFps.getCount();
        waitingForVsync = false;
    })

    function run(elapsed){
        const tickStart = performance.now();
        waitingForVsync = true;
        // If we run for more than 32ms of emulated CPU cycles then something's gone wrong, back off
        let targetCycles = 4194.304 * Math.min(32, elapsed);
        while(waitingForVsync && targetCycles > 0){
            const simulatedCycles = cpu.tick();
            gpu.tick(simulatedCycles);
            timer.tick(simulatedCycles);
            serial.tick(simulatedCycles);
            audio.tick(simulatedCycles);
            targetCycles -= simulatedCycles;
        }
        requestAnimationFrame(run);
        const rtElapsed = performance.now() - tickStart;
        frameTime.innerText = Math.round(rtElapsed);
        browserFps.update();
        fps.innerText = browserFps.getCount() + "/" + gpuFps.getCount();
    }
    const beginButton = document.getElementById("begin");
    beginButton.addEventListener("click", async () => {
        
        await audio.initialize();
        mmu.mapAudio(audio);

        requestAnimationFrame(run);
        beginButton.style.display = "none";
    })
    
}
initialize();
