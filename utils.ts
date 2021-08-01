export class FpsCounter {
    #frameTimes : number[] = [];
    update(){
        const now = performance.now();
        this.#frameTimes.unshift(now);
        while(this.#frameTimes.length && now - this.#frameTimes[this.#frameTimes.length - 1] > 1000){
            this.#frameTimes.pop();
        }
    }
    getCount(){
        return this.#frameTimes.length;
    }
}


export function uint8ToInt8(val : number){
    return val > 127 ? val - 256 : val;
}

export async function loadBlob(path : string){
    const response = await fetch(path);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
}

export function getBankMask(bankCount : number){
    let bankMask = 0;
    const bankBits = Math.ceil(Math.log2(bankCount));
    for(let i = 0; i < bankBits; i++){
        bankMask |= (1 << i);
    }
    return bankMask;
}

export function readString(data : ArrayLike<number>, startIdx : number, maxLength : number){
    let str = "";
    for(let i = startIdx; i < startIdx + maxLength; i++){
        let byte = data[i];
        if(i === 0){
            break;
        }
        str += String.fromCharCode(byte);
    }
    return str;
}

export function makeBuffer(size : number){
    return new Uint8Array(size).fill(0);
}

export interface MemoryMappable {
    readRegister(addr : number) : number;
    writeRegister(addr : number, val : number) : void;
}

export interface Clocked {
    tick(cycles : number) : void;
}
