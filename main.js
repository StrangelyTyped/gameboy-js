import bios from "./gb_bios.mjs";
import rom from './mario1.mjs';

import JoypadKeyboard from "./joypad-keyboard.js";
import Timer from "./timer.js";
import Serial from "./serial.js";
import Audio from "./audio.js";
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

const audio = new Audio();
mmu.mapAudio(audio);

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
requestAnimationFrame(run);
