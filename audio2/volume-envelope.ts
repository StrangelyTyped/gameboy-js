import { FrameSequenced } from "./frame-sequencer";

export default class VolumeEnvelope implements FrameSequenced {
    #initial = 0;
    #direction = 0;
    #period = 0;

    #registerValue = 0;

    #periodTimer = 0;
    #currentVolume = 0xF;

    setRegister(val : number){
        this.#registerValue = val;
        this.#initial = (val & 0xF0) >> 4;
        this.#direction = (val & 0x8) >> 3;
        this.#period = (val & 0x7);
    }

    getRegister() : number {
        return this.#registerValue;
    }

    getVolume() {
        return this.#currentVolume;
    }

    trigger() : void {
        this.#periodTimer = this.#period;
        this.#currentVolume = this.#initial;
    }

    onFrameSequenceTrigger(): void {
        if(this.#period === 0){
            return;
        }
        if(this.#periodTimer > 0){
            this.#periodTimer--;
        }
        if(this.#periodTimer === 0){
            this.#periodTimer = this.#period;

            if(this.#direction && this.#currentVolume < 0xF) {
                this.#currentVolume++;
            }else if(this.#direction === 0 && this.#currentVolume > 0){
                this.#currentVolume--;
            }
        }
    }

}