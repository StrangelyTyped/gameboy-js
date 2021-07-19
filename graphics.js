import mmu from "./mmu.js";
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

class GraphicsPipeline {
    #canvas;
    #imageData;
    #memory;
    #registerData;
    #tickCounter;
    #callbacks;
    #layerBuffers;
    constructor(){
        this.#tickCounter = 0;
        this.#registerData = {
            control: 0,
            y: 0,
            // scroll-related registers can be modified at any time but only kick in at end of scan line (mode 0)
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
        this.#callbacks = {
            lyc: [],
            hblank: [],
            vblank: [],
            oam: [],
        };
        this.#layerBuffers = {
            bg: new Array(screenW).fill(0),
            win: new Array(screenW).fill(0),
            obj: new Array(screenW).fill(0),
            objFlags: new Array(screenW).fill(0),
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
    
    setCanvas(elem){
        this.#canvas = elem.getContext('2d');
        //this.#canvas.fillStyle = "rgba(0xFF, 0xFF, 0xFF, 0xFF)";
        //this.#canvas.fillRect(0, 0, screenW, screenH);
        this.#imageData = this.#canvas.createImageData(screenW, 1);
        this.#imageData.data.fill(0xFF);
    }
    mapMemory(memory){
        this.#memory = memory;
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
            case 0xFF45:
                this.#registerData.yCompare = v;
                break;
            case 0xFF46:
            {
                // OAM DMA transfer
                // v is the source address high byte
                // This is supposed to take 160 cycles but we'll see
                const sourceBase = (v << 8);
                for(let i = 0; i < 0x100; i++){
                    this.#memory[0xFE00 + i] = this.#memory[sourceBase + i];
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
    
        for(let i = 0; i < 0x100; i+=4){
            const spriteY = this.#memory[0xFE00 + i] - 16;
            if(spriteY <= y && y - spriteY < spriteHeight){
                spritesForRow.push({
                    x: this.#memory[0xFE00 + i + 1] - 8,
                    y: spriteY,
                    tileId: this.#memory[0xFE00 + i + 2],
                    flags: this.#memory[0xFE00 + i + 3],
                });
                if(spritesForRow.length === 10){
                    break;
                }
            }
        }
        spritesForRow.sort((a, b) => a.x - b.x);
        return spritesForRow;
    }
    #readTile(buffer, bufferX, basePtr, startingX = 0){
        const b0 = this.#memory[basePtr];
        const b1 = this.#memory[basePtr + 1];
        for(let i = startingX; i < 8 && (bufferX + i) < buffer.length; i++){
            const p0 = (b0 & (1 << (7-i))) ? 1 : 0;
            const p1 = (b1 & (1 << (7-i))) ? 2 : 0;
            buffer[bufferX + i] = p0 | p1;
        }
    }
    #fillBgLayer(){        
        const bgTileDataAddressingMode = (this.#registerData.control & 0x10) ? 1 : 0;
        const bgTileData = bgTileDataAddressingMode ? 0x8000 : 0x9000;
        const bgTileMap = (this.#registerData.control & 0x08) ? 0x9C00 : 0x9800;

        const y = this.#registerData.y;
        const bgY = (y + this.#registerData.scrollY % 256);
        const buffer = this.#layerBuffers.bg;
        buffer.fill(0);
        for(let x = 0; x < screenW; x+=8){
            let bgTileId = this.#memory[bgTileMap + (32 * Math.floor(bgY/8)) + Math.floor(((x + this.#registerData.scrollX)%256)/8)];
            if(!bgTileDataAddressingMode){
                bgTileId = uint8ToInt8(bgTileId);
            }
            const tileBase = bgTileData + (bgTileId * 16);
            this.#readTile(buffer, x, tileBase + ((bgY % 8) * 2))
        }
    }
    #fillWinLayer(){
        // window -1 for 'no window here'
        this.#layerBuffers.win.fill(-1);
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
        for(let x = 0, i = 0; x < buffer.length && i < sprites.length; x++){
            if(x < sprites[i].x){
                continue;
            }
            //TODO: flipY / flipX
            const tileBase = 0x8000 + (sprites[i].tileId * 16) + ((y - sprites[i].y) * 2);
            this.#readTile(buffer, x, tileBase, x - sprites[i].x);
            flagBuffer.fill(sprites[i].flags, x, Math.min(x + 8, buffer.length));
            x += 7;
            i++;
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
        const spritePalette = [this.#registerData.obj0PaletteMap, this.#registerData.obj0PaletteMap];

        const imageData = this.#imageData;
        for(let x = 0; x < screenW; x++){
            const bgPix = this.#layerBuffers.bg[x];
            const winPix = this.#layerBuffers.win[x];
            const spritePix = this.#layerBuffers.obj[x];
            const spriteFlags = this.#layerBuffers.objFlags[x];
            let pixel = 0;
            if(spritesEnabled && spritePix){
                //todo flag 7
                pixel = spritePalette[spriteFlags & 0x10 >> 4][spritePix];
            } else if(windowEnabled && winPix !== -1){
                pixel = bgPalette[winPix];
            } else if(bgEnabled) {
                pixel = bgPalette[bgPix];
            }
            imageData.data.fill(colours[pixel], x * 4, (x * 4) + 3);
        }
        
        this.#canvas.putImageData(imageData, 0, y);
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
                        this.#registerData.mode = MODE_DRAW_LINE; 
                    }else{
                        running = false;
                    }
                    break;
                case MODE_DRAW_LINE:
                    if(this.#tickCounter > 180){
                        this.#tickCounter -= 180;
                        this.#registerData.mode = MODE_HBLANK;
                        const hblankInterruptEnabled = (this.#registerData.interruptFlags & 0x8) > 0
                        this.#callbacks.hblank.forEach(cb => cb(hblankInterruptEnabled));
                        this.#draw();
                    } else {
                        running = false;
                    }
                    break;
                case MODE_HBLANK:
                    if(this.#tickCounter > 196){
                        this.#tickCounter -= 196;
                        this.#registerData.y++;
                        if(this.#registerData.y === this.#registerData.lyc){
                            const lycInterruptEnabled = (this.#registerData.interruptFlags & 0x40) > 0
                            this.#callbacks.lyc.forEach(cb => cb(lycInterruptEnabled));
                        }
                        if(this.#registerData.y >= screenH){
                            this.#registerData.mode = MODE_VBLANK;
                            const vblankInterruptEnabled = (this.#registerData.interruptFlags & 0x10) > 0
                            this.#callbacks.vblank.forEach(cb => cb(vblankInterruptEnabled));
                        } else {
                            this.#registerData.mode = MODE_SEARCH_OAM;
                        }
                    } else {
                        running = false;
                    }
                    break;
                case MODE_VBLANK:
                    if(this.#tickCounter > 456){
                        this.#tickCounter -= 456;
                        this.#registerData.y++;
                        if(this.#registerData.y >= screenScanH){
                            this.#registerData.y = 0;
                            this.#registerData.mode = MODE_SEARCH_OAM;
                        }
                    } else {
                        running = false;
                    }
                    break;
            }
        }
    }
}

export default new GraphicsPipeline();