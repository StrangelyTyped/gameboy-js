import { Clocked } from "./utils.js";

type callback = () => any;

export default class Timer implements Clocked {
    #registers = {
        divider: 0,
        counter: 0,
        modulo: 0,
        control: 0,
    };
    #callbacks : callback[] = [];
    #cycleCounters = {
        divider: 0,
        timer: 0,
    };
    #timerFreq = 0;
    constructor(){
        this.writeRegister(0xFF07, 0);
    }
    tick(cycles : number){
        this.#cycleCounters.divider += cycles;
        while(this.#cycleCounters.divider > 256){
            this.#cycleCounters.divider -= 256;
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
    onCounterOverflow(cb : callback){
        this.#callbacks.push(cb);
    }
    readRegister(addr : number){
        switch(addr){
            case 0xFF04:
                return this.#registers.divider;
            case 0xFF05:
                return this.#registers.counter;
            case 0xFF06:
                return this.#registers.modulo;
            case 0xFF07:
                return this.#registers.control;
            default:
                console.warn("Timer read unexpected register", addr);
        }
        return 0;
    }
    writeRegister(addr : number, val : number){
        switch(addr){
            case 0xFF04:
                this.#registers.divider = 0;
                break;
            case 0xFF05:
                this.#registers.counter = val;
                break;
            case 0xFF06:
                this.#registers.modulo = val;
                break;
            case 0xFF07:
                this.#registers.control = val & 0x7;
                switch(val & 0x3){
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
                console.warn("Timer write unexpected register", addr, val);
        }
    }
}