const dutyCycleMap = [
    0.125,
    0.25,
    0.5,
    0.75
];


class SquareWaveOscillator extends AudioWorkletProcessor {

    process (inputs, outputs, parameters) {
        const output = outputs[0];
        const frequency = parameters.frequency[0];
        const dutyCycleMode = parameters.dutyCycleMode[0];
        const dutyCycle = dutyCycleMap[dutyCycleMode];
        const cycleLength = sampleRate / frequency;

        output.forEach(channel => {
            for (let i = 0; i < channel.length; i++) {
                // a number from 0...cycleLength
                const cyclePos = (currentFrame + i) % cycleLength;

                channel[i] = ((cyclePos / cycleLength) < dutyCycle) ? -0.5 : 0.5;
            }
        });
        return true;
    }

    static get parameterDescriptors () {
        return [{
            name: "frequency",
            defaultValue: 0,
            minValue: 0,
            maxValue: 131072,
            automationRate: "k-rate"
        },{
            // Maps to register values
            // 0 = 12.5%
            // 1 = 25%
            // 2 = 50%
            // 3 = 75%
            name: "dutyCycleMode",
            defaultValue: 2,
            minValue: 0,
            maxValue: 3,
            automationRate: "k-rate"
        }];
    }
  }
  
  registerProcessor('square-wave-oscillator', SquareWaveOscillator);