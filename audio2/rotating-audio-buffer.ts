export default class RotatingAudioBuffer {
    #outputNode;
    #buffers : AudioBuffer[] = [];
    #channels : AudioBufferSourceNode[] = [];
    constructor(audioContext : AudioContext){
        this.#outputNode = audioContext.createGain();
        for(let i = 0; i < 4; i++){
            const node = audioContext.createBufferSource();
            this.#channels.push(node);
            node.connect(this.#outputNode);
            const buffer = audioContext.createBuffer(1, (audioContext.sampleRate / 60), audioContext.sampleRate);
            this.#buffers.push(buffer);
            node.buffer = buffer;
        }
    }

    getOutputNode() : AudioNode {
        return this.#outputNode;
    }
}