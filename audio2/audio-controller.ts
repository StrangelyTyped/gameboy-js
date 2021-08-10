import { Clocked, MemoryMappable } from "../utils.js";
import FrameSequencer from "./frame-sequencer.js";
import NoiseAudioChannel from "./noise-channel.js";
import ToneSweepAudioChannel from "./tone-sweep-channel.js";
import { AudioChannel } from "./utils.js";
import WaveAudioChannel from "./wave-channel.js";


export default class AudioController implements MemoryMappable, Clocked {
    #channels : AudioChannel[] = [];
    #registerData = {
        channelControl: 0,
        channelOutput: 0,
        soundEnabled: false //FF26 bit 7
    };
    #audioContext : AudioContext | null = null;
    #debugGateNodes : GainNode[] = [];
    #panGateNodes : GainNode[][] = [];
    #masterGainLeft : GainNode | null = null;
    #masterGainRight : GainNode | null = null;
    #masterGainOutput : GainNode | null = null;
    #masterVolume = 1;

    #frameSequencer = new FrameSequencer();

    async initialize(){
        this.#audioContext = new AudioContext();

        this.#channels = [
            new ToneSweepAudioChannel(0xFF10, true, this.#audioContext, this.#frameSequencer),
            new ToneSweepAudioChannel(0xFF15, false, this.#audioContext, this.#frameSequencer),

            new WaveAudioChannel(0xFF1A, this.#audioContext, this.#frameSequencer),
            new NoiseAudioChannel(0xFF20, this.#audioContext, this.#frameSequencer)
        ];

        // We need to achieve stereo output from these mono sources
        // each channel can be sent to none, one, or both sides of the output
        // Let's build a pair of gain nodes for each channel for gating
        // then a pair of gain nodes for left/right overall
        // then combine those two into stereo output

        this.#panGateNodes = [];

        this.#masterGainLeft = this.#audioContext.createGain();
        this.#masterGainRight = this.#audioContext.createGain();

        for(let i = 0; i < this.#channels.length; i++){
            const debugGate = this.#audioContext.createGain();
            const gateNodes = [
                this.#audioContext.createGain(),
                this.#audioContext.createGain(),
            ];
            this.#debugGateNodes.push(debugGate);
            this.#panGateNodes.push(gateNodes);
            const output = this.#channels[i].getOutputNode();
            if(!output){
                console.warn("Channel",i,"disabled by hardware implementation");
                continue;
            }
            output.connect(debugGate);
            debugGate.connect(gateNodes[0]);
            debugGate.connect(gateNodes[1]);
            gateNodes[0].connect(this.#masterGainLeft);
            gateNodes[1].connect(this.#masterGainRight);
        }

        const merger = this.#audioContext.createChannelMerger(2);
        this.#masterGainLeft.connect(merger, 0, 0);
        this.#masterGainRight.connect(merger, 0, 1);
        this.#masterGainOutput = this.#audioContext.createGain();
        this.#masterGainOutput.gain.value = this.#masterVolume;
        merger.connect(this.#masterGainOutput);
        this.#masterGainOutput.connect(this.#audioContext.destination);
    }


    readRegister(addr : number){
        if(addr >= 0xFF10 && addr <= 0xFF14) {
            return this.#channels[0].readRegister(addr);
        } else if(addr >= 0xFF16 && addr <= 0xFF19) {
            return this.#channels[1].readRegister(addr);
        } else if(addr >= 0xFF1A && addr <= 0xFF1E) {
            return this.#channels[2].readRegister(addr);
        } else if (addr >= 0xFF20 && addr <= 0xFF23) {
            return this.#channels[3].readRegister(addr);
        } else if(addr === 0xFF24) {
            return this.#registerData.channelControl;
        } else if(addr === 0xFF25) {
            return this.#registerData.channelOutput;
        } else if(addr === 0xFF26) {
            //TODO: bits 0-3
            return this.#registerData.soundEnabled ? 0x80 : 0x00;
        } else if(addr >= 0xFF30 && addr <= 0xFF3F) {
            return (<WaveAudioChannel>this.#channels[2]).readWaveRam(addr);
        } else {
            console.warn("Audio read unexpected register", addr)
        }
        return 0;
    }
    writeRegister(addr : number, val : number){
        if(addr >= 0xFF10 && addr <= 0xFF14) {
            this.#channels[0].writeRegister(addr, val);
        } else if(addr >= 0xFF16 && addr <= 0xFF19) {
            this.#channels[1].writeRegister(addr, val);
        } else if(addr >= 0xFF1A && addr <= 0xFF1E) {
            this.#channels[2].writeRegister(addr, val);
        } else if (addr >= 0xFF20 && addr <= 0xFF23) {
            this.#channels[3].writeRegister(addr, val);
        } else if(addr === 0xFF24) {
            // Don't bother to implement the Vin bits
            this.#registerData.channelControl = val;
            // SO2 = left, SO1 = right
            (<GainNode>this.#masterGainLeft).gain.value = ((val & 0x70) >> 4) / 7;
            (<GainNode>this.#masterGainRight).gain.value = (val & 0x7) / 7;
        } else if(addr === 0xFF25) {
            this.#registerData.channelOutput = val;
            for(let i = 0; i < 4; i++){
                this.#panGateNodes[i][0].gain.value = (val & (0x10 << i)) >> (4 + i);
                this.#panGateNodes[i][1].gain.value = (val & (0x1 << i)) >> i;
            }
        } else if(addr === 0xFF26) {
            this.#registerData.soundEnabled = (val & 0x80) !== 0;
        } else if(addr >= 0xFF30 && addr <= 0xFF3F) {
            (<WaveAudioChannel>this.#channels[2]).writeWaveRam(addr, val);
        }else{
            console.warn("Audio write unexpected register", addr, val)
        }
    }
    debugSetChannelEnabled(channelId : number, enabled : boolean){
        this.#debugGateNodes[channelId].gain.value = (enabled ? 1 : 0);
    }
    tick(cycles : number){
        this.#frameSequencer.tick(cycles);
        this.#channels.forEach(channel => channel.tick(cycles));
    }
    setVolume(level : number){
        this.#masterVolume = level;
        if(this.#masterGainOutput){
            this.#masterGainOutput.gain.value = level;
        }
    }
}

