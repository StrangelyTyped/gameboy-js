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