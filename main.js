import bios from "./gb_bios.mjs";
import rom from './mario1.mjs';

import JoypadKeyboard from "./joypad-keyboard.js";
import Timer from "./timer.js";
import mmu from "./mmu.js";
import GraphicsPipeline from "./graphics.js";

import cpu from "./cpu.js";

import { FpsCounter } from "./utils.js"


mmu.mapBootRom(bios);
mmu.loadCartridge(rom);

const gpu = new GraphicsPipeline(document.getElementById("screen"));
mmu.mapGpuMemory(gpu);
cpu.registerGpuCallbacks(gpu);

const joypad = new JoypadKeyboard();
mmu.mapJoypad(joypad);
cpu.registerJoypadCallbacks(joypad);

const timer = new Timer();
mmu.mapTimer(timer);
cpu.registerTimerCallbacks(timer);

const frameTime = document.getElementById("frametime");
const fps = document.getElementById("fpsCounter");

const browserFps = new FpsCounter();
const gpuFps = new FpsCounter();
gpu.onVblank(() => {
    gpuFps.update();
    fps.innerText = browserFps.getCount() + "/" + gpuFps.getCount();
})


let cpuRemainder = 0;
function run(elapsed = 0){
    const tickStart = performance.now();
    //console.log("Tick");
    // This is _Very_ much not the correct timing...
    let targetCycles = (4194.304 * Math.min(16.74, elapsed)) + cpuRemainder;
    while(targetCycles > 0){
        const elapsed = cpu.tick();
        gpu.tick(elapsed);
        timer.tick(elapsed);
        targetCycles -= elapsed;
    }
    cpuRemainder = targetCycles;
    requestAnimationFrame(run);
    const rtElapsed = performance.now() - tickStart;
    frameTime.innerText = Math.round(rtElapsed);
    browserFps.update();
    fps.innerText = browserFps.getCount() + "/" + gpuFps.getCount();
}
run();
