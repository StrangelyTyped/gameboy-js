import bios from "./gb_bios.mjs";
import mario from './cputest-06.mjs';

import mmu from "./mmu.js";
import gpu from "./graphics.js";

import cpu from "./cpu.js";

import { FpsCounter } from "./utils.js"


mmu.mapBootRom(bios);
mmu.loadCartridge(mario);

gpu.setCanvas(document.getElementById("screen"));
mmu.mapGpuMemory(gpu);

const frameTime = document.getElementById("frametime");
const fps = document.getElementById("fpsCounter");

let cpuRemainder = 0;
const browserFps = new FpsCounter();
const gpuFps = new FpsCounter();
gpu.onVblank(() => {
    gpuFps.update();
    fps.innerText = browserFps.getCount() + "/" + gpuFps.getCount();
})
cpu.registerGpuCallbacks(gpu);

function run(elapsed = 0){
    const tickStart = performance.now();
    //console.log("Tick");
    // This is _Very_ much not the correct timing...
    let targetCycles = (4194.304 * Math.min(16.74, elapsed)) + cpuRemainder;
    while(targetCycles > 0){
        const elapsed = cpu.tick();
        gpu.tick(elapsed);
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
