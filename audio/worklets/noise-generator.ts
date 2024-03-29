class NoiseGenerator extends AudioWorkletProcessor {
    #state = 0x7FFF;
    #stepCount = 0;
    process (inputs, outputs, parameters) {
        const output = outputs[0];
        const stepMode = parameters.stepMode[0];
        const frequency = parameters.frequency[0];
        if(!frequency){
            return true;
        }

        // can we step the shift register every n cycles or do we need to step the shift register n times every cycle?
        // if we need to support both, how do we keep track
        const stepCycles = sampleRate / frequency;

        let state;
        output.forEach(channel => {
            state = this.#state;
            for (let i = 0; i < channel.length; i++) {
                channel[i] = (state & 0x1) ? -0.5 : 0.5;
                this.#stepCount++;
                if(this.#stepCount > stepCycles){
                    this.#stepCount -= stepCycles;
                    // advance
                    // the low two bits (0 and 1) are XORed, all bits are shifted right by one, and the result of the XOR is put into the now-empty high bit
                    // If stepMode is 1, the XOR result is ALSO put into bit 6 AFTER the shift
                    const newBit = (state & 1) ^ ((state & 2) >> 1);
                    state = (state >> 1) | (newBit << 14);
                    if(stepMode){
                        state = (state & 0xFFBF) | (newBit << 5);
                    }
                }
            }
        });
        this.#state = state;
        return true;
    }

    static get parameterDescriptors () {
        return [{
            name: "frequency",
            defaultValue: 0,
            minValue: 0,
            maxValue: 524288,
            automationRate: "k-rate"
        },{
            name: "stepMode",
            defaultValue: 0,
            minValue: 0,
            maxValue: 1,
            automationRate: "k-rate"
        }];
    }
  }
  
  registerProcessor('noise-generator', NoiseGenerator);