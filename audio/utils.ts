import { MemoryMappable } from "../utils.js";

export class VolumeEnvelopeParams {
    initial = 0;
    direction = 0;
    step = 0;
    registerValue = 0;
    setRegister(val : number){
        this.registerValue = val;
        this.initial = (val & 0xF0) >> 4;
        this.direction = (val & 0x8) >> 3;
        this.step = (val & 0x7);
    }
}

export function applyVolumeEnvelope(volumeEnvelope : VolumeEnvelopeParams, gainNode : GainNode, audioContext : AudioContext){
    if(volumeEnvelope.step){
        gainNode.gain.cancelScheduledValues(audioContext.currentTime);
        let volume = volumeEnvelope.initial;
        let i = 0;
        while(volume >= 0 && volume <= 0xF){
            gainNode.gain.setValueAtTime(volume / 0x0F, audioContext.currentTime + ((i * volumeEnvelope.step) / 64));
            i++;
            volume += (volumeEnvelope.direction ? 1 : -1);
        }
    }else{
        gainNode.gain.value = (volumeEnvelope.initial / 0x0F);
    }
}

export interface AudioChannel extends MemoryMappable {
    getOutputNode() : AudioNode;
}