

class WaveGenerator extends AudioWorkletProcessor {
    #waveIndex = 0;
    #waveClocks = 0;
    #lastTime = 0;
    process (inputs, outputs, parameters) {
        if(!parameters.enabled[0]){
            return true;
        }
        if(parameters.resetAt[0] !== 0 && this.#lastTime !== 0 && parameters.resetAt[0] > this.#lastTime && parameters.resetAt[0] < currentTime){
            this.#waveClocks = 0;
            this.#waveIndex = 0;
        }
        this.#lastTime = currentTime;
        
        const output = outputs[0];
        const frequency = parameters.frequency[0]*32;

        const waveTable = [];
        for(let i = 0; i < 32; i++){
            waveTable.push(parameters["wave"+i][0]);
        }
        
        const tickPeriod = sampleRate / frequency;
        output.forEach(channel => {
            for (let i = 0; i < channel.length; i++) {
               channel[i] = waveTable[this.#waveIndex];

               this.#waveClocks++;
               while(this.#waveClocks >= tickPeriod){
                   this.#waveClocks -= tickPeriod;
                   this.#waveIndex = (this.#waveIndex + 1) % waveTable.length;
               }
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
            name: "resetAt",
            defaultValue: 0,
            automationRate: "k-rate"
        }];
        for(let i = 0; i < 32; i++){
            params.push({
                name: "wave"+i,
                defaultValue: 0,
                minValue: -1,
                maxValue: 1,
                automationRate: "k-rate"
            });
        }
        return params;
    }
  }
  
  registerProcessor('wave-generator', WaveGenerator);