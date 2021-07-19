import mmu from "./mmu.js";
const memory = mmu.memory;
export function memoryRead16(idx){
    return memory[idx] | memory[idx + 1] << 8;
}

export function memoryWrite16(idx, val){
    memory[idx] = val & 0xFF;
    memory[idx + 1] = (val & 0xFF00) >> 8;
}

export function uint8ToInt8(val){
    return val > 127 ? val - 256 : val;
}