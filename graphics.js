import {uint8ToInt8} from "./memory-utils.js";

const registerNames = {
    0xFF40: "LCD Control",
    0xFF41: "LCD Status",
    0xFF42: "Scroll Y",
    0xFF43: "Scroll X",
    0xFF44: "LCD Y",
    0xFF45: "LCD Y Compare",
    0xFF46: "OAM DMA",
    0xFF47: "BG Palettte Data",
    0xFF48: "Object Palette 0 Data",
    0xFF49: "Object Palette 1 Data",
    0xFF4A: "Window Y",
    0xFF4B: "Window X",
};

const colours = [
    0xFF,
    0xC0,
    0x80,
    0x00
];

const screenScanW = 170;
const screenScanH = 154;
const screenW = 160;
const screenH = 144;

const MODE_SEARCH_OAM = 2;
const MODE_DRAW_LINE = 3;
const MODE_HBLANK = 0;
const MODE_VBLANK = 1;

let logRegisters = false;

function buildPaletteMap(palette){
    return [
        palette & 0x3,
        (palette >> 2) & 0x3,
        (palette >> 4) & 0x3,
        (palette >> 6) & 0x3,
    ];
}

export default class GraphicsPipeline {
    #canvas;
    #imageData;
    #mmu;
    #registerData;
    #tickCounter = 0;
    #scanlineParams;
    #callbacks = {
        lyc: [],
        hblank: [],
        vblank: [],
        oam: [],
    };
    #layerBuffers;
    #debugCanvas;
    #debugData;
    constructor(canvasElem){
        this.#registerData = {
            control: 0,
            y: 0,
            scrollX: 0,
            scrollY: 0,
            windowX: 0,
            windowY: 0,
            yCompare: 0,
            bgPalette: 0,
            bgPaletteMap: buildPaletteMap(0),
            obj0Palette: 0,
            obj0PaletteMap: buildPaletteMap(0),
            obj1Palette: 0,
            obj1PaletteMap: buildPaletteMap(0),
            interruptFlags: 0,
            mode: MODE_SEARCH_OAM,
        };
        this.#scanlineParams = {
            scrollX: 0,
            scrollY: 0,
            windowX: 0,
            windowY: 0,
        };
        this.#layerBuffers = {
            bg: new Array(screenW).fill(0),
            win: new Array(screenW).fill(0),
            obj: new Array(screenW).fill(0),
            objFlags: new Array(screenW).fill(0),
        }

        this.#canvas = canvasElem.getContext('2d');
        this.#imageData = this.#canvas.createImageData(screenW, 1);
        this.#imageData.data.fill(0xFF);

        const debugCanvas = document.getElementById("bgmap");
        if(debugCanvas){
            this.#debugCanvas = debugCanvas.getContext("2d");
            this.#debugData = this.#debugCanvas.getImageData(0, 0, 256, 256);
            this.#debugData.data.fill(0xff);
        }
    }
    onLyc(callback){
        this.#callbacks.lyc.push(callback);
    }
    onOam(callback){
        this.#callbacks.oam.push(callback);
    }
    onVblank(callback){
        this.#callbacks.vblank.push(callback);
    }
    onHblank(callback){
        this.#callbacks.hblank.push(callback);
    }
    
    mapMemory(mmu){
        this.#mmu = mmu;
    }
    readRegister(register){
        if(logRegisters){
            console.warn("GPU read register", registerNames[register])
        }
        switch(register){
            case 0xFF40:
                return this.#registerData.control;
            case 0xFF41:
                return this.#registerData.interruptFlags & 0xF8 | 
                    (this.#registerData.y === this.#registerData.yCompare ? 0x4 : 0x0) | 
                    this.#registerData.mode;
            case 0xFF42:
                return this.#registerData.scrollY;
            case 0xFF43:
                return this.#registerData.scrollX;
            case 0xFF44:
                return this.#registerData.y;
            case 0xFF45:
                return this.#registerData.yCompare;
            // 0xFF46 - OAM DMA
            case 0xFF47:
                return this.#registerData.bgPalette;
            case 0xFF48:
                return this.#registerData.obj0Palette;
            case 0xFF49:
                return this.#registerData.obj1Palette;
            case 0xFF4A:
                return this.#registerData.windowY;
            case 0xFF4B:
                return this.#registerData.windowX;
            default:
                console.warn("Unhandled GPU register read", registerNames[register]);
        }
        return 0;
    }
    writeRegister(register, v){
        if(logRegisters){
            console.warn("GPU Write register", registerNames[register], v)
        }
        switch(register){
            case 0xFF40:
                this.#registerData.control = v;
                break;
            case 0xFF41:
                this.#registerData.interruptFlags = v;
                break;
            case 0xFF42:
                this.#registerData.scrollY = v;
                break;
            case 0xFF43:
                this.#registerData.scrollX = v;
                break;
            // 0xFF44: y
            case 0xFF45:
                this.#registerData.yCompare = v;
                break;
            case 0xFF46:
            {
                // OAM DMA transfer
                // v is the source address high byte
                // This is supposed to take 160 cycles but we'll see
                const sourceBase = (v << 8);
                for(let i = 0; i < 0xA0; i++){
                    this.#mmu.write(0xFE00 + i, this.#mmu.read(sourceBase + i));
                }
                break;
            }
            case 0xFF47:
                this.#registerData.bgPalette = v;
                this.#registerData.bgPaletteMap = buildPaletteMap(v);
                break;
            case 0xFF48:
                this.#registerData.obj0Palette = v;
                this.#registerData.obj0PaletteMap = buildPaletteMap(v);
                break;
            case 0xFF49:
                this.#registerData.obj1Palette = v;
                this.#registerData.obj1PaletteMap = buildPaletteMap(v);
                break;
            case 0xFF4A:
                this.#registerData.windowY = v;
                break;
            case 0xFF4B:
                this.#registerData.windowX = v;
                break;
            default:
                console.warn("Unhandled GPU register write", registerNames[register], v);
        }
    }
    #findSpritesForY(y){
        const spritesForRow = [];
        const spriteHeight = (this.#registerData.control & 0x4 ? 16 : 8);
    
        for(let i = 0; i < 0xA0; i+=4){
            const spriteY = this.#mmu.read(0xFE00 + i) - 16;
            if(spriteY <= y && y - spriteY < spriteHeight){
                spritesForRow.push({
                    x: this.#mmu.read(0xFE00 + i + 1) - 8,
                    y: spriteY,
                    tileId: this.#mmu.read(0xFE00 + i + 2),
                    flags: this.#mmu.read(0xFE00 + i + 3),
                });
                if(spritesForRow.length === 10){
                    break;
                }
            }
        }
        spritesForRow.sort((a, b) => a.x - b.x);
        return spritesForRow;
    }
    #readTile(buffer, bufferX, basePtr){
        const b0 = this.#mmu.read(basePtr);
        const b1 = this.#mmu.read(basePtr + 1);
        for(let i = Math.max(0, -bufferX); i < 8 && (bufferX + i) < buffer.length; i++){
            const p0 = (b0 & (1 << (7 - i))) ? 1 : 0;
            const p1 = (b1 & (1 << (7 - i))) ? 2 : 0;
            buffer[bufferX + i] = p0 | p1;
        }
    }
    #fillBgLayer(){        
        const bgTileDataAddressingMode = (this.#registerData.control & 0x10) ? 1 : 0;
        const bgTileData = bgTileDataAddressingMode ? 0x8000 : 0x9000;
        const bgTileMap = (this.#registerData.control & 0x08) ? 0x9C00 : 0x9800;

        const y = this.#registerData.y;
        const bgY = (y + this.#scanlineParams.scrollY % 256);
        const buffer = this.#layerBuffers.bg;
        buffer.fill(0);
        const xTileShift = this.#scanlineParams.scrollX % 8;

        for(let x = -xTileShift; x < screenW; x+=8){
            const xTileOffs = ((x + this.#scanlineParams.scrollX)%256);
            let bgTileId = this.#mmu.read(bgTileMap + (32 * Math.floor(bgY/8)) + Math.floor(xTileOffs/8));
            if(!bgTileDataAddressingMode){
                bgTileId = uint8ToInt8(bgTileId);
            }
            const tileBase = bgTileData + (bgTileId * 16);
            this.#readTile(buffer, x, tileBase + ((bgY % 8) * 2));
        }
    }
    #fillWinLayer(){
        // window -1 for 'no window here'
        const y = this.#registerData.y;
        const windowY = this.#scanlineParams.windowY;
        const buffer = this.#layerBuffers.win;

        if(y < windowY){
            buffer.fill(-1);
            return;
        }

        const windowX = this.#scanlineParams.windowX - 7;

        const tileDataAddressingMode = (this.#registerData.control & 0x10) ? 1 : 0;
        const tileData = tileDataAddressingMode ? 0x8000 : 0x9000;
        const tileMap = (this.#registerData.control & 0x40) ? 0x9C00 : 0x9800;

        buffer.fill(-1, 0, Math.max(windowX, 0));

        for(let x = windowX; x < screenW; x+=8){
            if(x < 0){
                continue;
            }
            let tileId = this.#mmu.read(tileMap + (32 * Math.floor((y - windowY)/8)) + Math.floor((x - windowX)/8));
            if(!tileDataAddressingMode){
                tileId = uint8ToInt8(tileId);
            }
            const tileBase = tileData + (tileId * 16);
            this.#readTile(buffer, x, tileBase + (((y - windowY) % 8) * 2));
        }
    }
    #fillSpriteLayer(){
        const y = this.#registerData.y;
        const buffer = this.#layerBuffers.obj;
        const flagBuffer = this.#layerBuffers.objFlags;
        buffer.fill(0);
        flagBuffer.fill(0);

        const sprites = this.#findSpritesForY(y);
        if(!sprites.length){
            return;
        }
        for(let i = 0; i < sprites.length; i++){
            const x = Math.max(0, sprites[i].x);
            if(x  >= buffer.length){
                break;
            }
            
            // flipY
            let yOfsInSprite = y - sprites[i].y;
            if(sprites[i].flags & 0x40){
                yOfsInSprite = ((this.#registerData.control & 0x4) ? 16 : 8) - (yOfsInSprite + 1);
            }
            
            const tileBase = 0x8000 + (sprites[i].tileId * 16) + (yOfsInSprite * 2);

            const b0 = this.#mmu.read(tileBase);
            const b1 = this.#mmu.read(tileBase + 1);
            const startingX = x - sprites[i].x;
            const flipX = sprites[i].flags & 0x20;
            
            for(let readIdx = startingX, writeIdx = 0; readIdx < 8 && (x + writeIdx) < buffer.length; readIdx++, writeIdx++){
                if(buffer[x + writeIdx] !== 0){
                    continue;
                }
                const readI = flipX ? readIdx : (7 - readIdx);
                const p0 = (b0 & (1 << readI)) ? 1 : 0;
                const p1 = (b1 & (1 << readI)) ? 2 : 0;
                buffer[x + writeIdx] = p0 | p1;
                flagBuffer[x + writeIdx] = sprites[i].flags;
            }
        }
    }
    #draw(){
        const bgEnabled = this.#registerData.control & 0x1;
        const windowEnabled = (this.#registerData.control & 0x21) == 0x21;
        const spritesEnabled = this.#registerData.control & 0x2;

        const y = this.#registerData.y;
        if(bgEnabled){
            this.#fillBgLayer();
        }
        if(windowEnabled){
            this.#fillWinLayer();
        }
        if(spritesEnabled){
            this.#fillSpriteLayer();
        }

        const bgPalette = this.#registerData.bgPaletteMap;
        const spritePalette = [this.#registerData.obj0PaletteMap, this.#registerData.obj1PaletteMap];

        const imageData = this.#imageData;
        for(let x = 0; x < screenW; x++){
            const bgPix = this.#layerBuffers.bg[x];
            const winPix = this.#layerBuffers.win[x];
            const spritePix = this.#layerBuffers.obj[x];
            const spriteFlags = this.#layerBuffers.objFlags[x];
            let pixel = 0;
            if(spritesEnabled && spritePix){
                if(spriteFlags & 0x80 && winPix > 0){
                    pixel = bgPalette[winPix];
                } else if(spriteFlags & 0x80 && bgPix != 0){
                    pixel = bgPalette[bgPix];
                } else {
                    pixel = spritePalette[spriteFlags & 0x10 >> 4][spritePix];
                }
            } else if(windowEnabled && winPix !== -1){
                pixel = bgPalette[winPix];
            } else if(bgEnabled) {
                pixel = bgPalette[bgPix];
            }
            imageData.data.fill(colours[pixel], x * 4, (x * 4) + 3);
        }
        
        this.#canvas.putImageData(imageData, 0, y);
    }

    #debugDrawBgMap(){
        if(!this.#debugCanvas){
            return;
        }
        const bgTileDataAddressingMode = (this.#registerData.control & 0x10) ? 1 : 0;
        const bgTileData = bgTileDataAddressingMode ? 0x8000 : 0x9000;
        const bgTileMap = (this.#registerData.control & 0x08) ? 0x9C00 : 0x9800;
        const buffer = this.#debugData.data;
        for(let y = 0; y < 256; y++){
            for(let x = 0; x < 256; x+=8){
                let bgTileId = this.#mmu.read(bgTileMap + (32 * Math.floor(y/8)) + Math.floor(x/8));
                if(!bgTileDataAddressingMode){
                    bgTileId = uint8ToInt8(bgTileId);
                }
                const tileBase = bgTileData + (bgTileId * 16);
                const basePtr = tileBase + ((y % 8) * 2);

                const b0 = this.#mmu.read(basePtr);
                const b1 = this.#mmu.read(basePtr + 1);
                for(let i = 0; i < 8; i++){
                    const p0 = (b0 & (1 << (7 - i))) ? 1 : 0;
                    const p1 = (b1 & (1 << (7 - i))) ? 2 : 0;
                    const colour = colours[this.#registerData.bgPaletteMap[p0 | p1]];
                    buffer[((y * 256) + x + i) * 4] = colour;
                    buffer[((y * 256) + x + i) * 4 + 1] = colour;
                    buffer[((y * 256) + x + i) * 4 + 2] = colour;
                }
            }
        }
        this.#debugCanvas.putImageData(this.#debugData, 0, 0);
    }

    #setMode(mode){
        this.#registerData.mode = mode;
        switch(mode){
            case MODE_SEARCH_OAM:
            {
                const oamInterruptEnabled = (this.#registerData.interruptFlags & 0x20) > 0
                this.#callbacks.oam.forEach(cb => cb(oamInterruptEnabled));
                break;
            }
            case MODE_DRAW_LINE:
                this.#scanlineParams.scrollX = this.#registerData.scrollX;
                this.#scanlineParams.scrollY = this.#registerData.scrollY;
                this.#scanlineParams.windowX = this.#registerData.windowX;
                this.#scanlineParams.windowY = this.#registerData.windowY;
                break;
            case MODE_HBLANK:
            {
                const hblankInterruptEnabled = (this.#registerData.interruptFlags & 0x8) > 0;
                this.#callbacks.hblank.forEach(cb => cb(hblankInterruptEnabled));
                break;
            }
            case MODE_VBLANK:
            {
                const vblankInterruptEnabled = (this.#registerData.interruptFlags & 0x10) > 0;
                this.#callbacks.vblank.forEach(cb => cb(vblankInterruptEnabled));
                break;
            }
        }
    }

    #incrementY(){
        this.#registerData.y++;
        if(this.#registerData.y === this.#registerData.yCompare){
            const lycInterruptEnabled = (this.#registerData.interruptFlags & 0x40) > 0;
            this.#callbacks.lyc.forEach(cb => cb(lycInterruptEnabled));
        }
    }

    tick(cycles){
        if(!(this.#registerData.control & 0x80)){
            // LCD disabled
            return;
        }
        this.#tickCounter += cycles;
        let running = true;
        while(running){
            switch(this.#registerData.mode){
                case MODE_SEARCH_OAM:
                    if(this.#tickCounter > 80){
                        this.#tickCounter -= 80;
                        this.#setMode(MODE_DRAW_LINE);
                    }else{
                        running = false;
                    }
                    break;
                case MODE_DRAW_LINE:
                    if(this.#tickCounter > 180){
                        this.#tickCounter -= 180;
                        this.#setMode(MODE_HBLANK);
                        this.#draw();
                    } else {
                        running = false;
                    }
                    break;
                case MODE_HBLANK:
                    if(this.#tickCounter > 196){
                        this.#tickCounter -= 196;
                        this.#incrementY();
                        if(this.#registerData.y >= screenH){
                            this.#setMode(MODE_VBLANK);
                        } else {
                            this.#setMode(MODE_SEARCH_OAM);
                        }
                    } else {
                        running = false;
                    }
                    break;
                case MODE_VBLANK:
                    if(this.#tickCounter > 456){
                        this.#tickCounter -= 456;
                        this.#incrementY();
                        if(this.#registerData.y >= screenScanH){
                            this.#registerData.y = 0;
                            this.#setMode(MODE_SEARCH_OAM);
                            this.#debugDrawBgMap();
                        }
                    } else {
                        running = false;
                    }
                    break;
            }
        }
    }
}
