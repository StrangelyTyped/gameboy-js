import FrameSequencer from "./frame-sequencer.js";
import FrequencySweep from "./frequency-sweep.js";
import LengthCounter from "./length-counter.js";
import RotatingAudioBuffer from "./rotating-audio-buffer.js";
import { AudioChannel } from "./utils.js";
import VolumeEnvelope from "./volume-envelope.js";

export default class ToneSweepAudioChannel implements AudioChannel {
    #registerBase;
    #registerData = {
        waveDuty: 0,
        counterEnabled: 0,
    };
    #buffer;
    #lengthCounter;
    #volumeEnvelope;
    #frequencySweep;
    #hasFrequencySweep;
    constructor(registerBase : number, hasFreqSweep : boolean, audioContext : AudioContext, frameSequencer : FrameSequencer){
        this.#buffer = new RotatingAudioBuffer(audioContext);
        this.#registerBase = registerBase;

        this.#lengthCounter = new LengthCounter(64);
        frameSequencer.add256HzComponent(this.#lengthCounter);
        this.#volumeEnvelope = new VolumeEnvelope();
        frameSequencer.add64HzComponent(this.#volumeEnvelope);
        this.#frequencySweep = new FrequencySweep();
        frameSequencer.add128HzComponent(this.#frequencySweep);
        this.#hasFrequencySweep = hasFreqSweep;

    }
    tick(cycles: number): void {
          
    }
    getOutputNode(){
        return this.#buffer.getOutputNode();
    }
    readRegister(addr : number){
        switch(addr){
            case this.#registerBase + 0:
                if(!this.#hasFrequencySweep){
                    return 0xFF;
                }
                return this.#frequencySweep.getRegister() | 0x80;
            case this.#registerBase + 1:
                return (this.#registerData.waveDuty << 6) | 0x3F;
            case this.#registerBase + 2:
                return this.#volumeEnvelope.getRegister(); // no mask
            case this.#registerBase + 3:
                return 0xFF; // Frequency low, write-only
            case this.#registerBase + 4:
                return (this.#registerData.counterEnabled << 6) | 0xBF;
        }
        return 0xFF;
    }
    writeRegister(addr : number, val : number){
        switch(addr){
            case this.#registerBase + 0:
                if(this.#hasFrequencySweep){
                    this.#frequencySweep.setRegister(val);
                }
                break;
            case this.#registerBase + 1:
            {
                this.#registerData.waveDuty = (val & 0xB0) >> 6;
                this.#lengthCounter.setLength(val & 0x3F);
                break;
            }
            case this.#registerBase + 2:
            {
                this.#volumeEnvelope.setRegister(val);
                break;
            }
            case this.#registerBase + 3:
                this.#frequencySweep.setFrequency((this.#frequencySweep.getFrequency() & 0x700) | (val & 0xFF));
                break;
            case this.#registerBase + 4:
                this.#registerData.counterEnabled = (val & 0x40);
                this.#lengthCounter.setCounterEnabled(this.#registerData.counterEnabled !== 0);
                this.#frequencySweep.setFrequency((this.#frequencySweep.getFrequency() & 0xFF) | ((val & 0x7) << 8));
                
                if(val & 0x80){
                    this.#frequencySweep.trigger();
                    this.#volumeEnvelope.trigger();
                    this.#lengthCounter.trigger();
                }
                break;
        }
    }

    isEnabled(){
        return this.#lengthCounter.isChannelEnabled() && this.#frequencySweep.isChannelEnabled();
    }
}