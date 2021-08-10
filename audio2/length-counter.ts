import { FrameSequenced } from "./frame-sequencer";

export default class LengthCounter implements FrameSequenced {
    #lengthLimit;
    #lengthCounter;
    #enabled = false;
    constructor(lengthLimit : number) {
        this.#lengthLimit = lengthLimit;
        this.#lengthCounter = lengthLimit;
    }

    trigger(){
        if(this.#lengthCounter === 0){
            this.#lengthCounter = this.#lengthLimit;
        }
    }

    setLength(length : number){
        this.#lengthCounter = Math.min(this.#lengthLimit, length);
    }

    setCounterEnabled(enabled : boolean){
        this.#enabled = enabled;
    }

    isChannelEnabled() : boolean {
        return this.#lengthCounter > 0;
    }

    onFrameSequenceTrigger(): void {
        if(this.#enabled && this.#lengthCounter > 0){
            this.#lengthCounter--;
        }
    }

}