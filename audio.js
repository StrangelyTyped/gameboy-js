
class ToneSweepAudioChannel {
    #registerBase;
    #registerData;
    constructor(registerBase){
        this.#registerBase = registerBase;
        this.#registerData = {
            sweep: 0,
            soundLength: 0,
            waveDuty: 0,
            volumeEnvelope: 0,
            frequency: 0,
            counterConsecutive: 0,
        }
    }
    readRegister(addr){
        switch(addr){
            case this.#registerBase + 0:
                return this.#registerData.sweep;
            case this.#registerBase + 1:
                return this.#registerData.waveDuty << 6;
            case this.#registerBase + 2:
                return this.#registerData.volumeEnvelope;
            case this.#registerBase + 4:
                return this.#registerData.counterConsecutive << 6;
        }
        return 0xFF;
    }
    writeRegister(addr, val){
        switch(addr){
            case this.#registerBase + 0:
                this.#registerData.sweep = val;
                break;
            case this.#registerBase + 1:
                //this.#registerData.waveDuty << 6;
                break;
            case this.#registerBase + 2:
                this.#registerData.volumeEnvelope;
                break;
            case this.#registerBase + 3:
                break;
            case this.#registerBase + 4:
                this.#registerData.counterConsecutive << 6;
                break;
        }
    }
}

class WaveAudioChannel {
    #registerData;
    constructor(){
        this.#registerData = {
            channelOn: false,
            soundLength: 0,
            outputLevel: 0,
            frequency: 0,
            counterConsecutive: 0,
        }

    }
    readRegister(addr){
        return 0xFF
    }
    writeRegister(addr, val){
    }
    readWaveRam(addr){
        return 0;
    }
    writeWaveRam(addr, val){

    }
}

class NoiseAudioChannel {
    readRegister(addr){
        return 0xFF;
    }
    writeRegister(addr, val){

    }
}

export default class AudioController {
    #channels;
    #registerData;
    constructor(){ 
        this.#channels = [
            new ToneSweepAudioChannel(0xFF10),
            new ToneSweepAudioChannel(0xFF15),
            new WaveAudioChannel(),
            new NoiseAudioChannel()
        ];
        this.#registerData = {
            channelControl: 0,
            channelOutput: 0,
            soundEnabled: false //FF26 bit 7
        }
    }

    readRegister(k){
        if(k >= 0xFF10 && k <= 0xFF14) {
            return this.#channels[0].readRegister(k);
        } else if(k >= 0xFF16 && k <= 0xFF19) {
            return this.#channels[1].readRegister(k);
        } else if(k >= 0xFF1A && k <= 0xFF1E) {
            return this.#channels[2].readRegister(k);
        } else if (k >= 0xFF20 && k <= 0xFF23) {
            return this.#channels[3].readRegister(k);
        } else if(k === 0xFF24) {
            return this.#registerData.channelControl;
        } else if(k === 0xFF25) {
            return this.#registerData.channelOutput;
        } else if(k === 0xFF26) {
            //TODO: bits 0-3
            return this.#registerData.soundEnabled ? 0x80 : 0x00;
        } else if(k >= 0xFF30 && k <= 0xFF3F) {
            return this.#channels[2].readWaveRam(k);
        } else {
            console.warn("Audio read unexpected register", k)
        }
    }
    writeRegister(k, v){
        if(k >= 0xFF10 && k <= 0xFF14) {
            this.#channels[0].writeRegister(k, v);
        } else if(k >= 0xFF16 && k <= 0xFF19) {
            this.#channels[1].writeRegister(k, v);
        } else if(k >= 0xFF1A && k <= 0xFF1E) {
            this.#channels[2].writeRegister(k, v);
        } else if (k >= 0xFF20 && k <= 0xFF23) {
            this.#channels[3].writeRegister(k, v);
        } else if(k === 0xFF24) {
            this.#registerData.channelControl = v;
        } else if(k === 0xFF25) {
            this.#registerData.channelOutput = v;
        } else if(k === 0xFF26) {
            this.#registerData.soundEnabled = (v & 0x80);
        } else if(k >= 0xFF30 && k <= 0xFF3F) {
            this.#channels[2].writeWaveRam(k, v);
        }else{
            console.warn("Audio write unexpected register", k, v)
        }
    }
    tick(cycles){

    }
}

