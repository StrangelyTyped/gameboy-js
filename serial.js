export default class Serial {
    #registers;
    #callbacks = [];
    #cycleCounters;
    constructor(){
        this.#registers = {
            data: 0,
            control: 0,
        }
    }
    tick(cycles){
        if((this.#registers.control & 0x81) === 0x81){
            this.#registers.control = 0x01;
            this.#registers.data = 0xFF;
            this.#callbacks.forEach(cb => cb());
        }
    }
    onTransfer(cb){
        this.#callbacks.push(cb);
    }
    readRegister(k){
        switch(k){
            case 0xFF01:
                return this.#registers.data;
            case 0xFF02:
                return this.#registers.control;
            default:
                console.warn("Serial read unexpected register", k);
        }
        return 0;
    }
    writeRegister(k, v){
        switch(k){
            case 0xFF01:
                this.#registers.data = v;
                break;
            case 0xFF02:
                this.#registers.control = v;
                break;
            default:
                console.warn("Serial write unexpected register", k, v);
        }
    }
}