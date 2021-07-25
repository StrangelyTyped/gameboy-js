class LengthCounter extends AudioWorkletProcessor {

    process (inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        const stopAt = parameters.stopAt[0];

        output.forEach((channel, idx) => {
            if(stopAt === 0 || stopAt > currentTime){
                channel.set(input[idx], 0);
            }
        });
        return true;
    }

    static get parameterDescriptors () {
        return [{
            name: "stopAt",
            defaultValue: 0,
            automationRate: "k-rate"
        }];
    }
  }
  
  registerProcessor('length-counter', LengthCounter);