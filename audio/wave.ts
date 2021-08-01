import { makeBuffer } from "../utils.js";
import { AudioChannel } from "./utils.js";


function processWaveSample(sample : number, volumeMode : number){
    sample = sample >> (volumeMode - 1);
    sample = (sample / 7.5) - 1;
    //sample *= 0.5;
    return sample;
}

export default class WaveAudioChannel implements AudioChannel {
    #registerData = {
        channelOn: false,
        soundLength: 0,
        volumeMode: 0,
        frequency: 0,
        counterEnabled: 0,
    };
    #audioContext;
    #wave;
    #waveRam = makeBuffer(16).fill(0);
    #lengthLimiter;
    #gainNode;
    #nodeParams : {
        waveEnabled : AudioParam,
        waveFrequency : AudioParam,
        waveResetAt : AudioParam,
        waveData : AudioParam[],
        lengthStopAt : AudioParam,
    };
    constructor(audioContext : AudioContext){
        this.#audioContext = audioContext;
        this.#wave = new AudioWorkletNode(audioContext, "wave-generator");
        const volumeBias = new GainNode(audioContext);
        volumeBias.gain.value = 0.5;
        this.#wave.connect(volumeBias);
        this.#lengthLimiter = new AudioWorkletNode(audioContext, "length-counter");
        volumeBias.connect(this.#lengthLimiter);
        this.#gainNode = new GainNode(audioContext);
        this.#lengthLimiter.connect(this.#gainNode);

        this.#nodeParams = {
            waveEnabled: <AudioParam>this.#wave.parameters.get("enabled"),
            waveFrequency: <AudioParam>this.#wave.parameters.get("frequency"),
            waveResetAt: <AudioParam>this.#wave.parameters.get("resetAt"),
            waveData: [],
            lengthStopAt: <AudioParam>this.#lengthLimiter.parameters.get("stopAt"),
        };
        for(let i = 0; i < 32; i++){
            this.#nodeParams.waveData.push(<AudioParam>this.#wave.parameters.get("wave"+i));
        }
    }
    readRegister(addr : number){
        switch(addr){
            case 0xFF1A:
                return this.#registerData.channelOn ? 0x80 : 0x00;
            case 0xFF1B:
                return this.#registerData.soundLength;
            case 0xFF1C:
                return this.#registerData.volumeMode << 5;
            case 0xFF1D:
                return this.#registerData.frequency & 0xFF;
            case 0xFF1E:
                return this.#registerData.counterEnabled ? 0x40 : 0x00;
        }
        return 0xFF;
    }
    writeRegister(addr : number, val : number){
        switch(addr){
            case 0xFF1A:
                this.#registerData.channelOn = (val & 0x80) > 0;
                this.#nodeParams.waveEnabled.value = (this.#registerData.channelOn ? 1 : 0);
                break;
            case 0xFF1B:
            {
                this.#registerData.soundLength = val & 0xFF;
                this.#applySoundLength(this.#registerData.soundLength);
                break;
            }
            case 0xFF1C:
            {
                this.#registerData.volumeMode = (val & 0x60) >> 5;
                this.#updateWaveTable();
                break;
            }
            case 0xFF1D:
                this.#registerData.frequency = (this.#registerData.frequency & 0x700) | (val & 0xFF);
                this.#nodeParams.waveFrequency.value = 65536/(2048-this.#registerData.frequency);
                break;
            case 0xFF1E:
                this.#registerData.counterEnabled = (val & 0x40) >> 6;
                this.#registerData.frequency = (this.#registerData.frequency & 0xFF) | ((val & 0x7) << 8);
                this.#nodeParams.waveFrequency.value = 65536/(2048-this.#registerData.frequency);
                
                if(val & 0x80){
                    this.#applySoundLength(this.#registerData.soundLength);
                    this.#nodeParams.waveResetAt.value = this.#audioContext.currentTime;
                }
                break;
        }
    }
    #updateWaveTable(){
        for(let i = 0, j = 0; i < 16; i++, j+=2){
            const sample1 = processWaveSample((this.#waveRam[i] & 0xF0) >> 4, this.#registerData.volumeMode);
            const sample2 = processWaveSample(this.#waveRam[i] & 0xF, this.#registerData.volumeMode);
            this.#nodeParams.waveData[j].value = sample1;
            this.#nodeParams.waveData[j + 1].value = sample1;
        }
    }
    readWaveRam(addr : number){
        return this.#waveRam[addr - 0xFF30];
    }
    writeWaveRam(addr : number, val : number){
        this.#waveRam[addr - 0xFF30] = val;
        this.#updateWaveTable();
    }
    getOutputNode(){
        //return null;
        return this.#gainNode;
    }
    #applySoundLength(soundLength : number){
        if(this.#registerData.counterEnabled){
            this.#nodeParams.lengthStopAt.value = this.#audioContext.currentTime + ((256 - soundLength) / 256);
        } else {
            this.#nodeParams.lengthStopAt.value = 0;
        }
    }
}