import { applyVolumeEnvelope, AudioChannel, VolumeEnvelopeParams } from "./utils.js";

class FrequencySweepParams {
    time = 0;
    direction = 0;
    step = 0;
    registerValue = 0;
    setRegister(val : number){
        this.registerValue = this.registerValue;
        this.time = (val & 0x70) >> 4;
        this.direction = (val & 0x8) >> 3;
        this.step = (val & 0x7);
    }
}

export default class ToneSweepAudioChannel implements AudioChannel {
    #registerBase;
    #registerData = {
        frequencySweep: new FrequencySweepParams(),

        soundLength: 0,
        waveDuty: 0,
        volumeEnvelope: new VolumeEnvelopeParams(),

        frequency: 0,
        counterEnabled: 0,
    };
    #audioContext;
    #nodeParams : {
        oscillatorDutyCycle : AudioParam,
        oscillatorFrequency : AudioParam,
        lengthStopAt : AudioParam
    };
    #oscillator;
    #lengthLimiter;
    #gainNode;
    constructor(registerBase : number, audioContext : AudioContext){
        this.#audioContext = audioContext;
        this.#oscillator = new AudioWorkletNode(audioContext, "square-wave-oscillator");
        const volumeBias = new GainNode(audioContext);
        volumeBias.gain.value = 0.5;
        this.#oscillator.connect(volumeBias);
        this.#lengthLimiter = new AudioWorkletNode(audioContext, "length-counter");
        volumeBias.connect(this.#lengthLimiter);
        this.#gainNode = new GainNode(audioContext);
        this.#lengthLimiter.connect(this.#gainNode);

        this.#nodeParams = {
            oscillatorDutyCycle: <AudioParam>this.#oscillator.parameters.get("dutyCycleMode"),
            oscillatorFrequency: <AudioParam>this.#oscillator.parameters.get("frequency"),
            lengthStopAt: <AudioParam>this.#lengthLimiter.parameters.get("stopAt"),
        };
        this.#registerBase = registerBase;
    }
    getOutputNode(){
        //return null;
        return this.#gainNode;
    }
    readRegister(addr : number){
        switch(addr){
            case this.#registerBase + 0:
                return this.#registerData.frequencySweep.registerValue;
            case this.#registerBase + 1:
                return this.#registerData.waveDuty << 6;
            case this.#registerBase + 2:
                return this.#registerData.volumeEnvelope.registerValue;
            case this.#registerBase + 4:
                return this.#registerData.counterEnabled << 6;
        }
        return 0xFF;
    }
    writeRegister(addr : number, val : number){
        switch(addr){
            case this.#registerBase + 0:
                this.#registerData.frequencySweep.setRegister(val);
                this.#applyFrequencySweep(this.#registerData.frequencySweep);
                break;
            case this.#registerBase + 1:
            {
                this.#registerData.waveDuty = (val & 0xB0) >> 6;
                this.#nodeParams.oscillatorDutyCycle.value = this.#registerData.waveDuty;
                this.#registerData.soundLength = val & 0x3F;
                this.#applySoundLength(this.#registerData.soundLength);
                break;
            }
            case this.#registerBase + 2:
            {
                this.#registerData.volumeEnvelope.setRegister(val);
                this.#applyVolumeEnvelope(this.#registerData.volumeEnvelope);
                break;
            }
            case this.#registerBase + 3:
                this.#registerData.frequency = (this.#registerData.frequency & 0x700) | (val & 0xFF);
                this.#nodeParams.oscillatorFrequency.value = 131072/(2048-this.#registerData.frequency);
                break;
            case this.#registerBase + 4:
                this.#registerData.counterEnabled = (val & 0x40) >> 6;
                this.#registerData.frequency = (this.#registerData.frequency & 0xFF) | ((val & 0x7) << 8);
                this.#nodeParams.oscillatorFrequency.value = 131072/(2048-this.#registerData.frequency);
                
                if(val & 0x80){
                    this.#applyVolumeEnvelope(this.#registerData.volumeEnvelope);
                    this.#applyFrequencySweep(this.#registerData.frequencySweep);
                    this.#applySoundLength(this.#registerData.soundLength);
                    //TODO: more
                }
                break;
        }
    }
    #applySoundLength(soundLength : number){
        if(this.#registerData.counterEnabled){
            this.#nodeParams.lengthStopAt.value = this.#audioContext.currentTime + ((64 - soundLength) / 256);
        } else {
            this.#nodeParams.lengthStopAt.value = 0;
        }
    }
    #applyFrequencySweep(frequencySweep : FrequencySweepParams){
        if(frequencySweep.step && frequencySweep.time){
            this.#nodeParams.oscillatorFrequency.cancelScheduledValues(this.#audioContext.currentTime);
            let frequency = this.#registerData.frequency;
            let i = 0;
            const direction = (frequencySweep.direction ? 1 : -1);
            /*while(frequency >= 1 && frequency <= 2047){
                this.#oscillatorParameters.frequency.setValueAtTime(frequency, this.#audioContext.currentTime + ((i * frequencySweep.time) / 128));
                i++;
                frequency = frequency + (direction * (frequency/Math.pow(2, frequencySweep.step)));
            }
            this.#oscillatorParameters.frequency.setValueAtTime(0, this.#audioContext.currentTime + ((i * frequencySweep.time) / 128));*/
        }
    }
    #applyVolumeEnvelope(volumeEnvelope : VolumeEnvelopeParams){
        applyVolumeEnvelope(volumeEnvelope, this.#gainNode, this.#audioContext);
    }
}