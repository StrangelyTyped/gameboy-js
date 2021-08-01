export interface Renderer {
    setPixel(x : number, colour : number) : void;
    renderToLine(y : number) : void;
}

export type GraphicsCallback = (interruptEnabled : boolean) => any;