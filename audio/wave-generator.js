
function processWaveSample(sample, volumeMode){
    sample = sample >> (volumeMode - 1);
    sample = (sample / 7.5) - 1;
    return sample;
}

class WaveGenerator extends AudioWorkletProcessor {
    #waveIndex = 0;
    #waveClocks = 0;
    process (inputs, outputs, parameters) {
        const volumeMode = parameters.volumeMode;

        if(volumeMode === 0 || !parameters.enabled){
            return;
        }
        const output = outputs[0];
        const frequency = parameters.frequency[0];

        const waveTable = [];
        for(let i = 0; i < 16; i++){
            waveTable.push(processWaveSample((parameters["wave"+i] & 0xF0) >> 4, volumeMode));
            waveTable.push(processWaveSample(parameters["wave"+i] & 0xF, volumeMode));
        }
        
        const tickPeriod = sampleRate / frequency;

        output.forEach(channel => {
            for (let i = 0; i < channel.length; i++) {
               this.#waveClocks++;
               while(this.#waveClocks >= tickPeriod){
                   this.#waveClocks -= tickPeriod;
                   this.#waveIndex = (this.#waveIndex + 1) % waveTable.length;
               }
               channel[i] = waveTable[this.#waveIndex];
            }
        });
        return true;
    }

    static get parameterDescriptors () {
        const params = [{
            name: "frequency",
            defaultValue: 0,
            minValue: 0,
            maxValue: 65536,
            automationRate: "k-rate"
        },{
            name: "enabled",
            defaultValue: 0,
            minValue: 0,
            maxValue: 1,
            automationRate: "k-rate"
        },{
            name: "volumeMode",
            defaultValue: 0,
            minValue: 0,
            maxValue: 3,
            automationRate: "k-rate"
        }];
        for(let i = 0; i < 16; i++){
            params.push({
                name: "wave"+i,
                defaultValue: 0,
                minValue: 0,
                maxValue: 255,
                automationRate: "k-rate"
            });
        }
        return params;
    }
  }
  
  registerProcessor('wave-generator', WaveGenerator);