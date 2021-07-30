export default class Timer {
    #registers;
    #callbacks = [];
    #cycleCounters;
    #timerFreq;
    constructor(){
        this.#registers = {
            divider: 0,
            counter: 0,
            modulo: 0,
            control: 0,
        }
        this.#cycleCounters = {
            divider: 0,
            timer: 0,
        }
        this.writeRegister(0xFF07, 0);
    }
    tick(cycles){
        this.#cycleCounters.divider += cycles;
        while(this.#cycleCounters.divider > 16384){
            this.#cycleCounters.divider -= 16384;
            this.#registers.divider = (this.#registers.divider + 1) & 0xFF;
        }
        if(this.#registers.control & 0x4){
            this.#cycleCounters.timer += cycles;
            while(this.#cycleCounters.timer > this.#timerFreq){
                this.#cycleCounters.timer -= this.#timerFreq;
                this.#registers.counter++;
                if(this.#registers.counter > 0xFF){
                    this.#registers.counter = this.#registers.modulo;
                    this.#callbacks.forEach(cb => cb());
                }
            }
        }
    }
    onCounterOverflow(cb){
        this.#callbacks.push(cb);
    }
    readRegister(k){
        switch(k){
            case 0xFF04:
                return this.#registers.divider;
            case 0xFF05:
                return this.#registers.counter;
            case 0xFF06:
                return this.#registers.modulo;
            case 0xFF07:
                return this.#registers.control;
            default:
                console.warn("Timer read unexpected register", k);
        }
        return 0;
    }
    writeRegister(k, v){
        switch(k){
            case 0xFF04:
                this.#registers.divider = 0;
                break;
            case 0xFF05:
                this.#registers.counter = v;
                break;
            case 0xFF06:
                this.#registers.modulo = v;
                break;
            case 0xFF07:
                this.#registers.control = v & 0x7;
                switch(v & 0x3){
                    case 0:
                        this.#timerFreq = 1024;
                        break;
                    case 1:
                        this.#timerFreq = 16;
                        break;
                    case 2:
                        this.#timerFreq = 64;
                        break;
                    case 3:
                        this.#timerFreq = 256;
                        break;
                }
                break;
            default:
                console.warn("Timer write unexpected register", k, v);
        }
    }
}