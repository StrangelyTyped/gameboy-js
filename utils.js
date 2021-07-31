export class FpsCounter {
    #frameTimes = [];
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


export function uint8ToInt8(val){
    return val > 127 ? val - 256 : val;
}

export async function loadBlob(path){
    const response = await fetch(path);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
}