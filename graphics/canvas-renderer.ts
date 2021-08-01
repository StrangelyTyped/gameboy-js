import { Renderer } from "./graphics.js";

export default class CanvasRenderer implements Renderer {
    #canvas;
    #imageData;
    constructor(canvasElem : HTMLCanvasElement) {
        this.#canvas = <CanvasRenderingContext2D>canvasElem.getContext('2d');
        this.#imageData = this.#canvas.createImageData(canvasElem.width, 1);
        this.#imageData.data.fill(0xFF);;
    }
    setPixel(x: number, colour: number): void {
        this.#imageData.data.fill(colour, x * 4, (x * 4) + 3);
    }
    renderToLine(y: number): void {
        this.#canvas.putImageData(this.#imageData, 0, y);
    }
}