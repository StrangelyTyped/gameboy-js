import { MemoryMappable } from "../utils";

export default class SpeedManager implements MemoryMappable {
    #currentlyDoubleSpeed = false;
    #speedChangeRequested = false;

    readRegister(addr: number): number {
        if(addr === 0xFF4D){
            return (this.#currentlyDoubleSpeed ? 0x80 : 0x00) | (this.#speedChangeRequested ? 0x01 : 0x00) | 0x7E;
        }
        return 0xFF;
    }
    writeRegister(addr: number, val: number): void {
        if(addr === 0xFF4D){
           this.#speedChangeRequested  = (val & 0x01) !== 0;
        }
    }

    stop() : void {
        if(this.#speedChangeRequested){
            this.#currentlyDoubleSpeed = !this.#currentlyDoubleSpeed;
            this.#speedChangeRequested = false;
        }
    }

    isDoubleSpeed() : boolean {
        return this.#currentlyDoubleSpeed;
    }

    modifier() : number {
        return this.#currentlyDoubleSpeed ? 2 : 1;
    }

}