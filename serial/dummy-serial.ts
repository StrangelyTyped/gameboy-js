import Serial, {callback} from "./serial.js";

export default class DummySerial implements Serial {
    #registers = {
        data: 0,
        control: 0,
    };
    #callbacks : callback[] = [];

    tick(cycles : number){
        if((this.#registers.control & 0x81) === 0x81){
            this.#registers.control = 0x01;
            this.#registers.data = 0xFF;
            this.#callbacks.forEach(cb => cb());
        }
    }
    onTransfer(cb : callback){
        this.#callbacks.push(cb);
    }
    readRegister(addr : number){
        switch(addr){
            case 0xFF01:
                return this.#registers.data;
            case 0xFF02:
                return this.#registers.control;
            default:
                console.warn("Serial read unexpected register", addr);
        }
        return 0;
    }
    writeRegister(addr : number, val : number){
        switch(addr){
            case 0xFF01:
                this.#registers.data = val;
                break;
            case 0xFF02:
                this.#registers.control = val;
                break;
            default:
                console.warn("Serial write unexpected register", addr, val);
        }
    }
}