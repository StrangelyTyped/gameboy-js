import { Clocked } from "../utils";

export interface FrameSequenced {
    onFrameSequenceTrigger() : void;
}

export default class FrameSequencer implements Clocked {
    #components256Hz : FrameSequenced[] = [];
    #components128Hz : FrameSequenced[] = [];
    #components64Hz : FrameSequenced[] = [];

    #phase = 0;

    #cycleCount = 0;

    add256HzComponent(component : FrameSequenced) {
        this.#components256Hz.push(component);
    }
    add128HzComponent(component : FrameSequenced) {
        this.#components128Hz.push(component);
    }
    add64HzComponent(component : FrameSequenced) {
        this.#components64Hz.push(component);
    }

    getPhase() : number {
        return this.#phase;
    }

    tick(cycles : number): void {
        this.#cycleCount += cycles;
        while(this.#cycleCount > 8192){
            this.#cycleCount -= 8192;
            this.#advance();
        }
    }

    #advance(){
        this.#phase = (this.#phase + 1) % 8;
        if((this.#phase % 2) === 0){
            this.#notify(this.#components256Hz);
        }
        if((this.#phase % 4) === 2){
            this.#notify(this.#components128Hz);
        }
        if(this.#phase === 7){
            this.#notify(this.#components64Hz);
        }
    }

    #notify(components : FrameSequenced[]){
        components.forEach(component => component.onFrameSequenceTrigger());
    }

}