const audioModules = [
    "audio/square-wave-oscillator.js",
    "audio/length-counter.js",
    "audio/noise-generator.js",
];

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

function applyVolumeEnvelope(volumeEnvelope, gainNode, audioContext){
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

class ToneSweepAudioChannel {
    #registerBase;
    #registerData;
    #audioContext;
    #oscillatorParameters;
    #oscillator;
    #lengthLimiter;
    #gainNode;
    constructor(registerBase, audioContext){
        this.#audioContext = audioContext;
        this.#oscillator = new AudioWorkletNode(audioContext, "square-wave-oscillator");
        this.#lengthLimiter = new AudioWorkletNode(audioContext, "length-counter");
        this.#oscillator.connect(this.#lengthLimiter);
        this.#gainNode = new GainNode(audioContext);
        this.#lengthLimiter.connect(this.#gainNode);

        this.#oscillatorParameters = {
            dutyCycle: this.#oscillator.parameters.get("dutyCycleMode"),
            frequency: this.#oscillator.parameters.get("frequency"),
        };
        this.#registerBase = registerBase;
        this.#registerData = {
            frequencySweep: {
                time: 0,
                direction: 0,
                step: 0
            },
            sweepRegister: 0,

            soundLength: 0,
            waveDuty: 0,
            volumeEnvelope: {
                initial: 0,
                direction: 0,
                step: 0
            },
            volumeEnvelopeRegister: 0,

            frequency: 0,
            counterEnabled: 0,
        };
    }
    getOutputNode(){
        return this.#gainNode;
    }
    readRegister(addr){
        switch(addr){
            case this.#registerBase + 0:
                return this.#registerData.sweepRegister;
            case this.#registerBase + 1:
                return this.#registerData.waveDuty << 6;
            case this.#registerBase + 2:
                return this.#registerData.volumeEnvelopeRegister;
            case this.#registerBase + 4:
                return this.#registerData.counterEnabled << 6;
        }
        return 0xFF;
    }
    writeRegister(addr, val){
        switch(addr){
            case this.#registerBase + 0:
                this.#registerData.sweepRegister = val;
                const frequencySweep = {
                    time: (val & 0x70) >> 4,
                    direction: (val & 0x8) >> 3,
                    step: (val & 0x7),
                }
                this.#applyFrequencySweep(frequencySweep);
                this.#registerData.frequencySweep = frequencySweep;
                break;
            case this.#registerBase + 1:
            {
                this.#registerData.waveDuty = (val & 0xB0) >> 6;
                this.#oscillatorParameters.dutyCycle.value = this.#registerData.waveDuty;
                this.#registerData.soundLength = val & 0x3F;
                this.#applySoundLength(this.#registerData.soundLength);
                break;
            }
            case this.#registerBase + 2:
            {
                this.#registerData.volumeEnvelopeRegister = val;
                const volumeEnvelope = {
                    initial: (val & 0xF0) >> 4,
                    direction: (val & 0x8) >> 3,
                    step: (val & 0x7),
                };
                this.#applyVolumeEnvelope(volumeEnvelope);
                this.#registerData.volumeEnvelope = volumeEnvelope;
                break;
            }
            case this.#registerBase + 3:
                this.#registerData.frequency = (this.#registerData.frequency & 0x700) | (val & 0xFF);
                this.#oscillatorParameters.frequency.value = 131072/(2048-this.#registerData.frequency);
                break;
            case this.#registerBase + 4:
                this.#registerData.counterEnabled = (val & 0x40) >> 6;
                this.#registerData.frequency = (this.#registerData.frequency & 0xFF) | ((val & 0x7) << 8);
                this.#oscillatorParameters.frequency.value = 131072/(2048-this.#registerData.frequency);
                
                if(val & 0x80){
                    this.#applyVolumeEnvelope(this.#registerData.volumeEnvelope);
                    this.#applyFrequencySweep(this.#registerData.frequencySweep);
                    this.#applySoundLength(this.#registerData.soundLength);
                    //TODO: more
                }
                break;
        }
    }
    #applySoundLength(soundLength){
        if(this.#registerData.counterEnabled){
            this.#lengthLimiter.parameters.get("stopAt").value = this.#audioContext.currentTime + ((64 - soundLength) / 256);
        } else {
            this.#lengthLimiter.parameters.get("stopAt").value = 0;
        }
    }
    #applyFrequencySweep(frequencySweep){
        if(frequencySweep.step && frequencySweep.time){
            frequencySweep.initial = this.#registerData.frequency;
            this.#oscillatorParameters.frequency.cancelScheduledValues(this.#audioContext.currentTime);
            let frequency = frequencySweep.initial;
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
    #applyVolumeEnvelope(volumeEnvelope){
        applyVolumeEnvelope(volumeEnvelope, this.#gainNode, this.#audioContext);
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
            counterEnabled: 0,
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
    getOutputNode(){
        return null;
    }
}

class NoiseAudioChannel {
    #registerData;
    #audioContext;
    #noiseGenerator;
    #lengthLimiter;
    #gainNode;
    constructor(audioContext){
        this.#audioContext = audioContext;
        this.#noiseGenerator = new AudioWorkletNode(audioContext, "noise-generator");
        this.#lengthLimiter = new AudioWorkletNode(audioContext, "length-counter");
        this.#noiseGenerator.connect(this.#lengthLimiter);
        this.#gainNode = new GainNode(audioContext);
        this.#lengthLimiter.connect(this.#gainNode);

        this.#registerData = {
            soundLength: 0,
            volumeEnvelope: {
                initial: 0,
                direction: 0,
                step: 0
            },
            volumeEnvelopeRegister: 0,

            frequency: 0,
            stepMode: 0,
            frequencyRegister: 0,
            counterEnabled: 0,
        };
    }
    readRegister(addr){
        switch(addr){
            case 0xFF20:
                return this.#registerData.soundLength;
            case 0xFF21:
                return this.#registerData.volumeEnvelopeRegister;
            case 0xFF22:
                return this.#registerData.frequencyRegister;
            case 0xFF23:
                return this.#registerData.counterEnabled << 6;
        }
        return 0xFF;
    }
    writeRegister(addr, val){
        switch(addr){
            case 0xFF20:
            {
                this.#registerData.soundLength = val & 0x3F;
                this.#applySoundLength(this.#registerData.soundLength);
                break;
            }
            case 0xFF21:
            {
                this.#registerData.volumeEnvelopeRegister = val;
                const volumeEnvelope = {
                    initial: (val & 0xF0) >> 4,
                    direction: (val & 0x8) >> 3,
                    step: (val & 0x7),
                };
                this.#applyVolumeEnvelope(volumeEnvelope);
                this.#registerData.volumeEnvelope = volumeEnvelope;
                break;
            }
            case 0xFF22:
            {
                this.#registerData.frequencyRegister = val;
                this.#registerData.stepMode = (val & 0x8) >> 3;
                const s = (val & 0xF0) >> 4;
                const r = (val & 0x7);
                this.#registerData.frequency = noiseFreqTable[r] << s;
                this.#noiseGenerator.parameters.get("frequency").value = this.#registerData.frequency;
                this.#noiseGenerator.parameters.get("stepMode").value = this.#registerData.stepMode;
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
        return this.#gainNode;
    }
    #applySoundLength(soundLength){
        if(this.#registerData.counterEnabled){
            this.#lengthLimiter.parameters.get("stopAt").value = this.#audioContext.currentTime + ((64 - soundLength) / 256);
        } else {
            this.#lengthLimiter.parameters.get("stopAt").value = 0;
        }
    }
    #applyVolumeEnvelope(volumeEnvelope){
        applyVolumeEnvelope(volumeEnvelope, this.#gainNode, this.#audioContext);
    }
}

export default class AudioController {
    #channels;
    #registerData;
    #audioContext;
    #gateNodes;
    #masterGainLeft;
    #masterGainRight;
    #masterGainOutput;
    #masterVolume = 1;
    constructor(){ 

        this.#channels = [];

        this.#registerData = {
            channelControl: 0,
            channelOutput: 0,
            soundEnabled: false //FF26 bit 7
        };


        
    }

    async initialize(){
        this.#audioContext = new AudioContext();

        for(const audioModule of audioModules){
            await this.#audioContext.audioWorklet.addModule(audioModule);
        }

        this.#channels = [
            new ToneSweepAudioChannel(0xFF10, this.#audioContext),
            new ToneSweepAudioChannel(0xFF15, this.#audioContext),
            new WaveAudioChannel(),
            new NoiseAudioChannel(this.#audioContext)
        ];

        // We need to achieve stereo output from these mono sources
        // each channel can be sent to none, one, or both sides of the output
        // Let's build a pair of gain nodes for each channel for gating
        // then a pair of gain nodes for left/right overall
        // then combine those two into stereo output

        this.#gateNodes = [];

        this.#masterGainLeft = this.#audioContext.createGain();
        this.#masterGainRight = this.#audioContext.createGain();

        for(let i = 0; i < this.#channels.length; i++){
            const gateNodes = [
                this.#audioContext.createGain(),
                this.#audioContext.createGain(),
            ];
            this.#gateNodes.push(gateNodes);
            const output = this.#channels[i].getOutputNode();
            if(!output){
                console.warn("Channel",i,"disabled due in hardware implementation");
                continue;
            }
            output.connect(gateNodes[0]);
            output.connect(gateNodes[1]);
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
            // Don't bother to implement the Vin bits
            this.#registerData.channelControl = v;
            // SO2 = left, SO1 = right
            this.#masterGainLeft.gain.value = ((v & 0x70) >> 4) / 7;
            this.#masterGainRight.gain.value = (v & 0x7) / 7;
        } else if(k === 0xFF25) {
            this.#registerData.channelOutput = v;
            // Ch 1
            for(let i = 0; i < 4; i++){
                this.#gateNodes[i][0].gain.value = (v & (0x10 << i)) >> (4 + i);
                this.#gateNodes[i][1].gain.value = (v & (0x1 << i)) >> i;
            }
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
    setVolume(level){
        this.#masterVolume = level;
        if(this.#masterGainOutput){
            this.#masterGainOutput.gain.value = level;
        }
    }
}

