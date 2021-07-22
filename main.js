import bios from "./gb_bios.mjs";
import rom from './mario1.mjs';

import JoypadKeyboard from "./joypad-keyboard.js";
import Timer from "./timer.js";
import Serial from "./serial.js";
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

const serial = new Serial();
mmu.mapSerial(serial);
cpu.registerSerialCallbacks(serial);

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

function run(){
    const tickStart = performance.now();
    waitingForVsync = true;
    while(waitingForVsync){
        const elapsed = cpu.tick();
        gpu.tick(elapsed);
        timer.tick(elapsed);
        serial.tick(elapsed);
    }
    requestAnimationFrame(run);
    const rtElapsed = performance.now() - tickStart;
    frameTime.innerText = Math.round(rtElapsed);
    browserFps.update();
    fps.innerText = browserFps.getCount() + "/" + gpuFps.getCount();
}
run();
