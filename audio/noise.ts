import { applyVolumeEnvelope, AudioChannel, VolumeEnvelopeParams } from "./utils.js";

const noiseFreqTable = [
    8,
    16,
    32,
    48,
    64,
    80,
    96,
    112
];

export default class NoiseAudioChannel implements AudioChannel {
    #registerData = {
        soundLength: 0,
        volumeEnvelope: new VolumeEnvelopeParams(),

        frequency: 0,
        stepMode: 0,
        frequencyRegister: 0,
        counterEnabled: 0,
    };
    #audioContext;
    #noiseGenerator;
    #lengthLimiter;
    #gainNode;
    #nodeParams : {
        noiseFrequency : AudioParam,
        noiseStepMode : AudioParam,
        lengthStopAt : AudioParam,
    };
    constructor(audioContext : AudioContext){
        this.#audioContext = audioContext;
        this.#noiseGenerator = new AudioWorkletNode(audioContext, "noise-generator");
        const volumeBias = new GainNode(audioContext);
        volumeBias.gain.value = 0.5;
        this.#noiseGenerator.connect(volumeBias);
        this.#lengthLimiter = new AudioWorkletNode(audioContext, "length-counter");
        volumeBias.connect(this.#lengthLimiter);
        this.#gainNode = new GainNode(audioContext);
        this.#lengthLimiter.connect(this.#gainNode);

        this.#nodeParams = {
            noiseFrequency: <AudioParam>this.#noiseGenerator.parameters.get("frequency"),
            noiseStepMode: <AudioParam>this.#noiseGenerator.parameters.get("stepMode"),
            lengthStopAt: <AudioParam>this.#lengthLimiter.parameters.get("stopAt"),
        };
    }
    readRegister(addr : number){
        switch(addr){
            case 0xFF20:
                return this.#registerData.soundLength;
            case 0xFF21:
                return this.#registerData.volumeEnvelope.registerValue;
            case 0xFF22:
                return this.#registerData.frequencyRegister;
            case 0xFF23:
                return this.#registerData.counterEnabled << 6;
        }
        return 0xFF;
    }
    writeRegister(addr : number, val : number){
        switch(addr){
            case 0xFF20:
            {
                this.#registerData.soundLength = val & 0x3F;
                this.#applySoundLength(this.#registerData.soundLength);
                break;
            }
            case 0xFF21:
            {
                this.#registerData.volumeEnvelope.setRegister(val);
                this.#applyVolumeEnvelope(this.#registerData.volumeEnvelope);
                break;
            }
            case 0xFF22:
            {
                this.#registerData.frequencyRegister = val;
                this.#registerData.stepMode = (val & 0x8) >> 3;
                const s = (val & 0xF0) >> 4;
                const r = (val & 0x7);
                this.#registerData.frequency = 4194304 / (noiseFreqTable[r] << s);
                
                this.#nodeParams.noiseFrequency.value = this.#registerData.frequency;
                this.#nodeParams.noiseStepMode.value = this.#registerData.stepMode;
                break;
            }
            case 0xFF23:
                this.#registerData.counterEnabled = (val & 0x40) >> 6;
                
                if(val & 0x80){
                    this.#applyVolumeEnvelope(this.#registerData.volumeEnvelope);
                    this.#applySoundLength(this.#registerData.soundLength);
                    //TODO: more
                }
                break;
        }
    }
    getOutputNode(){
        //return null;
        return this.#gainNode;
    }
    #applySoundLength(soundLength : number){
        if(this.#registerData.counterEnabled){
            this.#nodeParams.lengthStopAt.value = this.#audioContext.currentTime + ((64 - soundLength) / 256);
        } else {
            this.#nodeParams.lengthStopAt.value = 0;
        }
    }
    #applyVolumeEnvelope(volumeEnvelope : VolumeEnvelopeParams){
        applyVolumeEnvelope(volumeEnvelope, this.#gainNode, this.#audioContext);
    }
}
