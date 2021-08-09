import Memory from "./memory.js";

export default class DummyMemory implements Memory {
    #memory = new Uint8Array(0x10000).fill(0xFF);

    read(addr: number): number {
        return this.#memory[addr];
    }
    write(addr: number, val: number): void {
        this.#memory[addr] = val;
    }
    read16(addr: number): number {
        return this.read(addr) | (this.read(addr + 1) << 8);
    }
    write16(addr: number, val: number): void {
        this.write(addr, val & 0xFF);
        this.write(addr + 1, (val & 0xFF00) >> 8);
    }

}