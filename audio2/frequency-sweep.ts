import { FrameSequenced } from "./frame-sequencer";

export default class FrequencySweep implements FrameSequenced {
    #realFrequency = 0;

    #period = 0;
    #direction = 0;
    #step = 0;

    #registerValue = 0;

    #sweepEnabled = false;
    #shadowFrequency = 0;
    #sweepTimer = 0;

    #channelEnabled = true;

    setFrequency(val : number){
        this.#realFrequency;
    }

    getFrequency() : number {
        return this.#realFrequency;
    }

    setRegister(val : number){
        this.#registerValue = val;
        this.#period = (val & 0x70) >> 4;
        this.#direction = (val & 0x8) >> 3;
        this.#step = (val & 0x7);
    }

    getRegister() : number {
        return this.#registerValue;
    }

    isChannelEnabled() : boolean {
        return this.#channelEnabled;
    }

    trigger() : void {
        this.#channelEnabled = true;

        this.#shadowFrequency = this.#realFrequency;
        this.#sweepTimer = this.#period || 8;
        this.#sweepEnabled = (this.#period !== 0 || this.#step !== 0);
        if(this.#step !== 0){
            // overflow check
            this.#calculateFrequencyStep();
        }
    }

    #calculateFrequencyStep(){
        const newFreq = this.#shadowFrequency + ((this.#shadowFrequency >> this.#step) * (this.#direction ? 1 : -1));
        if(newFreq >= 2048 || newFreq < 0){
            this.#channelEnabled = false;
        }
        return newFreq;
    }

    onFrameSequenceTrigger() : void {
        if(this.#sweepTimer > 0){
            this.#sweepTimer--;
        }
        if(this.#sweepTimer === 0){
            this.#sweepTimer = this.#period || 8;
            if(this.#sweepEnabled && this.#period !== 0){
                const newFreq = this.#calculateFrequencyStep();
                if(newFreq >= 0 && newFreq < 2048 && this.#step !== 0){
                    this.#shadowFrequency = newFreq;
                    this.#realFrequency = newFreq;
                    this.#calculateFrequencyStep();   
                }
            }
        }
    }
}