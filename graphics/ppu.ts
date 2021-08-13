import { GraphicsCallback, Renderer } from "./graphics.js";
import {Clocked, MemoryMappable, uint8ToInt8, makeBuffer} from "../utils.js";
import MMU from "../memory/mmu.js";

const colours = [
    0xFFFFFF,
    0xC0C0C0,
    0x808080,
    0x000000
];

const altColours = [
    0xFFCCCC,
    0xC09999,
    0x803e3e,
    0x450000,
]

const screenScanW = 170;
const screenScanH = 154;
const screenW = 160;
const screenH = 144;

enum PPUMode {
    MODE_SEARCH_OAM = 2,
    MODE_DRAW_LINE = 3,
    MODE_HBLANK = 0,
    MODE_VBLANK = 1,
}

function buildPaletteMap(palette : number){
    return [
        palette & 0x3,
        (palette >> 2) & 0x3,
        (palette >> 4) & 0x3,
        (palette >> 6) & 0x3,
    ];
}

const defaultColorPaletteMap = [
    0x000000,
    0x000000,
    0x000000,
    0x000000,
];

const colorFactor = 0xFF/0x1F;
function gbcColorToRgb(colorLo : number, colorHi : number){
    const r = colorLo & 0x1F;
    const g = ((colorLo & 0xE0) >> 5) | ((colorHi & 0x3) << 3);
    const b = (colorHi & 0x7C) >> 2;
    return (Math.round(r * colorFactor) << 16) | (Math.round(g * colorFactor) << 8) | Math.round(b * colorFactor);
}

function buildColorPaletteMap(paletteBuffer : Uint8Array, startIdx : number){
    return [
        gbcColorToRgb(paletteBuffer[startIdx + 0], paletteBuffer[startIdx + 1]),
        gbcColorToRgb(paletteBuffer[startIdx + 2], paletteBuffer[startIdx + 3]),
        gbcColorToRgb(paletteBuffer[startIdx + 4], paletteBuffer[startIdx + 5]),
        gbcColorToRgb(paletteBuffer[startIdx + 6], paletteBuffer[startIdx + 7]),
    ];
}

export default class PixelProcessingUnit implements MemoryMappable, Clocked {
    #renderer;
    #mmu : MMU;
    #registerData = {
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
        cgbOamPriority: 0,

        colorBgPalettes: makeBuffer(0x40),
        colorBgPaletteIdx: 0,
        colorBgPaletteMaps: new Array(8).fill(defaultColorPaletteMap),
        colorObjPalettes: makeBuffer(0x40),
        colorObjPaletteIdx: 0,
        colorObjPaletteMaps: new Array(8).fill(defaultColorPaletteMap),
        
        interruptFlags: 0,
        mode: PPUMode.MODE_SEARCH_OAM,
        windowRenderY: -1, // internal
        windowActive: false, // internal

        cgbHdmaSource: 0,
        cgbHdmaDest: 0,
    };
    #tickCounter = 0;
    #scanlineParams = {
        scrollX: 0,
        scrollY: 0,
        windowX: 0,
        windowY: 0,
    };
    #callbacks = {
        lyc: <GraphicsCallback[]>[],
        hblank: <GraphicsCallback[]>[],
        vblank: <GraphicsCallback[]>[],
        oam: <GraphicsCallback[]>[],
    };
    #layerBuffers = {
        bg: makeBuffer(screenW).fill(0),
        bgFlags: makeBuffer(screenW).fill(0),
        win: makeBuffer(screenW).fill(0),
        winFlags: makeBuffer(screenW).fill(0),
        obj: makeBuffer(screenW).fill(0),
        objFlags: makeBuffer(screenW).fill(0),
    };
    #debug = {
        highlightBg: false,
        highlightWin: false,
        highlightSprite: false,
    };

    constructor(mmu : MMU, renderer : Renderer){
        this.#renderer = renderer;
        this.#mmu = mmu;
    }

    onLyc(callback : GraphicsCallback){
        this.#callbacks.lyc.push(callback);
    }
    onOam(callback : GraphicsCallback){
        this.#callbacks.oam.push(callback);
    }
    onVblank(callback : GraphicsCallback){
        this.#callbacks.vblank.push(callback);
    }
    onHblank(callback : GraphicsCallback){
        this.#callbacks.hblank.push(callback);
    }
    
    readRegister(addr : number){
        switch(addr){
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
            case 0xFF51:
            case 0xFF52:
            case 0xFF53:
            case 0xFF54:
                return 0xFF; //CGB HDMA
            case 0xFF55:
                return 0xFF;
            case 0xFF68:
                return this.#registerData.colorBgPaletteIdx;
            case 0xFF69:
                return this.#registerData.colorBgPalettes[this.#registerData.colorBgPaletteIdx & 0x3F];
            case 0xFF6A:
                return this.#registerData.colorObjPaletteIdx;
            case 0xFF6B:
                return this.#registerData.colorObjPalettes[this.#registerData.colorObjPaletteIdx & 0x3F];
            case 0xFF6C:
                return this.#registerData.cgbOamPriority;
            default:
                console.warn("Unhandled GPU register read", addr);
        }
        return 0;
    }
    writeRegister(addr : number, val : number){
        switch(addr){
            case 0xFF40:
                this.#registerData.control = val;
                break;
            case 0xFF41:
                this.#registerData.interruptFlags = val;
                break;
            case 0xFF42:
                this.#registerData.scrollY = val;
                break;
            case 0xFF43:
                this.#registerData.scrollX = val;
                break;
            // 0xFF44: y
            case 0xFF45:
                this.#registerData.yCompare = val;
                break;
            case 0xFF46:
            {
                // OAM DMA transfer
                // v is the source address high byte
                // This is supposed to take 160 cycles but we'll see
                const sourceBase = (val << 8);
                for(let i = 0; i < 0xA0; i++){
                    this.#mmu.write(0xFE00 + i, this.#mmu.read(sourceBase + i));
                }
                break;
            }
            case 0xFF47:
                this.#registerData.bgPalette = val;
                this.#registerData.bgPaletteMap = buildPaletteMap(val);
                break;
            case 0xFF48:
                this.#registerData.obj0Palette = val;
                this.#registerData.obj0PaletteMap = buildPaletteMap(val);
                break;
            case 0xFF49:
                this.#registerData.obj1Palette = val;
                this.#registerData.obj1PaletteMap = buildPaletteMap(val);
                break;
            case 0xFF4A:
                this.#registerData.windowY = val;
                break;
            case 0xFF4B:
                this.#registerData.windowX = val;
                break;
            case 0xFF51:
                this.#registerData.cgbHdmaSource = (val << 8) | (this.#registerData.cgbHdmaSource & 0xFF);
                break;
            case 0xFF52:
                this.#registerData.cgbHdmaSource = (val & 0xF0) | (this.#registerData.cgbHdmaSource & 0xFF00);
                break;
            case 0xFF53:
                this.#registerData.cgbHdmaDest = (val << 8) | (this.#registerData.cgbHdmaDest & 0xFF);
                break;
            case 0xFF54:
                this.#registerData.cgbHdmaDest = (val & 0xF0) | (this.#registerData.cgbHdmaDest & 0x0F00) | 0x8000;
                break;
            case 0xFF55:
            {
                if(val & 0x80){
                    console.warn("Hblank HDMA invoked, unimplemented");
                    return;
                }
                const length = ((val & 0x7F) + 1) * 0x10;
                for(let i = 0; i < length; i++){
                    const dest = this.#registerData.cgbHdmaDest + i;
                    if(dest > 0x9FFF){
                        break;
                    }
                    this.#mmu.write(dest, this.#mmu.read(this.#registerData.cgbHdmaSource + i)); 
                }
                break;
            }
            case 0xFF68:
                this.#registerData.colorBgPaletteIdx = val;
                break;
            case 0xFF69:
            {
                const paletteIdx = this.#registerData.colorBgPaletteIdx & 0x3F;
                this.#registerData.colorBgPalettes[paletteIdx] = val;
                this.#registerData.colorBgPaletteMaps[Math.floor(paletteIdx / 8)] = buildColorPaletteMap(this.#registerData.colorBgPalettes, paletteIdx - (paletteIdx % 8));
                if(this.#registerData.colorBgPaletteIdx & 0x80){
                    this.#registerData.colorBgPaletteIdx++;
                }
                break;
            }
            case 0xFF6A:
                this.#registerData.colorObjPaletteIdx = val;
                break;
            case 0xFF6B:
            {
                const paletteIdx = this.#registerData.colorObjPaletteIdx & 0x3F;
                this.#registerData.colorObjPalettes[paletteIdx] = val;
                this.#registerData.colorObjPaletteMaps[Math.floor(paletteIdx / 8)] = buildColorPaletteMap(this.#registerData.colorObjPalettes, paletteIdx - (paletteIdx % 8));
                if(this.#registerData.colorObjPaletteIdx & 0x80){
                    this.#registerData.colorObjPaletteIdx++;
                }
                break;
            }
            case 0xFF6C:
                this.#registerData.cgbOamPriority = val & 0x1;
                break;
            default:
                console.warn("Unhandled GPU register write", addr, val);
        }
    }
    #findSpritesForY(y : number){
        const spritesForRow = [];
        const spriteHeight = (this.#registerData.control & 0x4) ? 16 : 8;
        const tileMask = (this.#registerData.control & 0x4) ? 0xFE : 0xFF;
    
        for(let i = 0; i < 0xA0; i+=4){
            const spriteY = this.#mmu.read(0xFE00 + i) - 16;
            if(spriteY <= y && y - spriteY < spriteHeight){
                spritesForRow.push({
                    x: this.#mmu.read(0xFE00 + i + 1) - 8,
                    y: spriteY,
                    tileId: this.#mmu.read(0xFE00 + i + 2) & tileMask,
                    flags: this.#mmu.read(0xFE00 + i + 3),
                });
                if(spritesForRow.length === 10){
                    break;
                }
            }
        }
        if(this.#registerData.cgbOamPriority || !this.#mmu.isColorMode()){
            spritesForRow.sort((a, b) => a.x - b.x);
        }
        return spritesForRow;
    }
    #readTile(buffer : Uint8Array, attrBuffer : Uint8Array, bufferX: number, basePtr: number, attrs : number){
        const vramBank = (attrs & 0x08) >> 3;
        const flipX = attrs & 0x20;
        const b0 = this.#mmu.readVram(vramBank, basePtr);
        const b1 = this.#mmu.readVram(vramBank, basePtr + 1);
        /*for(let i = Math.max(0, -bufferX); i < 8 && (bufferX + i) < buffer.length; i++){
            const p0 = (b0 & (1 << (7 - i))) ? 1 : 0;
            const p1 = (b1 & (1 << (7 - i))) ? 2 : 0;
            buffer[bufferX + i] = p0 | p1;
            attrBuffer[bufferX + i] = attrs;
        }*/

        
        for(let readIdx = Math.max(0, -bufferX), writeIdx = 0; readIdx < 8 && (bufferX + writeIdx) < buffer.length; readIdx++, writeIdx++){
            const readI = flipX ? readIdx : (7 - readIdx);
            const p0 = (b0 & (1 << readI)) ? 1 : 0;
            const p1 = (b1 & (1 << readI)) ? 2 : 0;
            buffer[bufferX + writeIdx] = p0 | p1;
            attrBuffer[bufferX + writeIdx] = attrs;
        }
        
    }
    #fillBgLayer(){   
        const colorMode = this.#mmu.isColorMode();
     
        const bgTileDataAddressingMode = (this.#registerData.control & 0x10) ? 1 : 0;
        const bgTileData = bgTileDataAddressingMode ? 0x8000 : 0x9000;
        const bgTileMap = (this.#registerData.control & 0x08) ? 0x9C00 : 0x9800;

        const y = this.#registerData.y;
        const bgY = (y + this.#scanlineParams.scrollY) % 256;
        const buffer = this.#layerBuffers.bg;
        const attrBuffer = this.#layerBuffers.bgFlags;
        buffer.fill(0);
        attrBuffer.fill(0);
        
        const xTileShift = this.#scanlineParams.scrollX % 8;

        for(let x = -xTileShift; x < screenW; x+=8){
            const xTileOffs = ((x + this.#scanlineParams.scrollX)%256);
            const tilePtr = bgTileMap + (32 * Math.floor(bgY/8)) + Math.floor(xTileOffs/8);
            let bgTileId = this.#mmu.readVram(0, tilePtr);
            const bgTileAttrs = colorMode ? this.#mmu.readVram(1, tilePtr) : 0;
            if(!bgTileDataAddressingMode){
                bgTileId = uint8ToInt8(bgTileId);
            }
            const tileBase = bgTileData + (bgTileId * 16);
            let yInTile = (bgY % 8);
            if(bgTileAttrs & 0x40){
                yInTile = 8 - yInTile;
            }
            this.#readTile(buffer, attrBuffer, x, tileBase + (yInTile * 2), bgTileAttrs);
        }
    }
    #fillWinLayer(){
        // window 0xFF for 'no window here'
        const colorMode = this.#mmu.isColorMode();

        const buffer = this.#layerBuffers.win;
        const attrBuffer = this.#layerBuffers.winFlags;

        const windowX = this.#scanlineParams.windowX - 7;

        if(!this.#registerData.windowActive || windowX > 166){ // not sure why 166 but roll with it
            buffer.fill(0xFF);
            return;
        }

        this.#registerData.windowRenderY++;
        const windowRenderY = this.#registerData.windowRenderY;

        
        const tileDataAddressingMode = (this.#registerData.control & 0x10) ? 1 : 0;
        const tileData = tileDataAddressingMode ? 0x8000 : 0x9000;
        const tileMap = (this.#registerData.control & 0x40) ? 0x9C00 : 0x9800;

        buffer.fill(-1, 0, Math.max(windowX, 0));

        for(let x = windowX; x < screenW; x+=8){
            if(x < 0){
                continue;
            }
            const tilePtr = tileMap + (32 * Math.floor(windowRenderY/8)) + Math.floor((x - windowX)/8);
            let tileId = this.#mmu.readVram(0, tilePtr);
            const tileAttrs = colorMode ? this.#mmu.readVram(1, tilePtr) : 0;
            if(!tileDataAddressingMode){
                tileId = uint8ToInt8(tileId);
            }
            const tileBase = tileData + (tileId * 16);
            let yInTile = (windowRenderY % 8);
            if(tileAttrs & 0x40){
                yInTile = 8 - yInTile;
            }
            this.#readTile(buffer, attrBuffer, x, tileBase + (yInTile * 2), tileAttrs);
        }
    }
    #fillSpriteLayer(){
        const colorMode = this.#mmu.isColorMode();
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
            const vramBank = (sprites[i].flags & 0x08) >> 3;

            const b0 = this.#mmu.readVram(vramBank, tileBase);
            const b1 = this.#mmu.readVram(vramBank, tileBase + 1);
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
                if(colorMode){
                    flagBuffer[x + writeIdx] = sprites[i].flags;
                }else{
                    flagBuffer[x + writeIdx] = (sprites[i].flags & 0xF0) | ((sprites[i].flags & 0x10) >> 4);
                }
            }
        }
    }
    #draw(){
        const colorMode = this.#mmu.isColorMode();
        const bgEnabled = colorMode || (this.#registerData.control & 0x1);
        const windowMask = colorMode ? 0x20 : 0x21;
        const windowEnabled = (this.#registerData.control & windowMask) === windowMask;
        const spritesEnabled = (this.#registerData.control & 0x2);

        const y = this.#registerData.y;
        if(bgEnabled){
            this.#fillBgLayer();
        }

        // Window housekeeping, happens regardless of enable flag apparently
        if(!this.#registerData.windowActive && this.#registerData.y === this.#scanlineParams.windowY){
            this.#registerData.windowActive = true;
            this.#registerData.windowRenderY = -1;
        }

        if(windowEnabled){
            this.#fillWinLayer();
        }
        if(spritesEnabled){
            this.#fillSpriteLayer();
        }

        //const bgPalette = this.#registerData.bgPaletteMap;
        //const spritePalette = [this.#registerData.obj0PaletteMap, this.#registerData.obj1PaletteMap];

        const bgPalettes = this.#registerData.colorBgPaletteMaps;
        const spritePalettes = this.#registerData.colorObjPaletteMaps;

        const bgColours = (this.#debug.highlightBg ? altColours : colours);
        const winColours = (this.#debug.highlightWin ? altColours : colours);
        const spriteColours = (this.#debug.highlightSprite ? altColours : colours);

        const masterPriorityEnabled = (this.#registerData.control & 0x1) || !colorMode;

        for(let x = 0; x < screenW; x++){
            const bgPix = this.#layerBuffers.bg[x];
            const bgFlags = this.#layerBuffers.bgFlags[x];
            const winPix = this.#layerBuffers.win[x];
            const winFlags = this.#layerBuffers.winFlags[x];
            const spritePix = this.#layerBuffers.obj[x];
            const spriteFlags = this.#layerBuffers.objFlags[x];
            let pixel = 0;
            if(spritesEnabled && spritePix){
                if(masterPriorityEnabled && ((spriteFlags & 0x80) || (winFlags & 0x80)) && windowEnabled && winPix !== 0 && winPix !== 0xFF){
                    //pixel = winColours[bgPalette[winPix]];
                    pixel = bgPalettes[winFlags & 0x7][winPix];
                } else if(masterPriorityEnabled && ((spriteFlags & 0x80) || (bgFlags & 0x80)) && bgEnabled && bgPix !== 0){
                    //pixel = colours[bgPalette[bgPix]];
                    pixel = bgPalettes[bgFlags & 0x7][bgPix];
                } else {
                    //pixel = spriteColours[spritePalette[(spriteFlags & 0x10) >> 4][spritePix]];
                    pixel = spritePalettes[spriteFlags & 0x7][spritePix];
                }
            } else if(windowEnabled && winPix !== 0xFF){
                //pixel = winColours[bgPalette[winPix]];
                pixel = bgPalettes[winFlags & 0x7][winPix];
            } else if(bgEnabled) {
                //pixel = bgColours[bgPalette[bgPix]];
                pixel = bgPalettes[bgFlags & 0x7][bgPix];
            }
            this.#renderer.setPixel(x, pixel);
        }
        this.#renderer.renderToLine(y);

    }

    debugRenderVram(renderer : Renderer, tileMapBankId : number, tileDataBankId : number){
        const bgTileDataAddressingMode = tileDataBankId === -1 ? ((this.#registerData.control & 0x10) ? 1 : 0) : tileDataBankId;
        const bgTileData = bgTileDataAddressingMode ? 0x8000 : 0x9000;
        const bgTileMap = tileMapBankId === -1 ? ((this.#registerData.control & 0x08) ? 0x9C00 : 0x9800) : tileMapBankId;
        for(let y = 0; y < 256; y++){
            const inViewportY = ((256 + y - this.#registerData.scrollY) % 256) >= 0 && ((256 + y - this.#registerData.scrollY) % 256) < screenH;
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
                    const inViewport = inViewportY && ((256 + x + i - this.#registerData.scrollX) % 256) >= 0 && ((256 + x + i - this.#registerData.scrollX) % 256) < screenW;

                    const p0 = (b0 & (1 << (7 - i))) ? 1 : 0;
                    const p1 = (b1 & (1 << (7 - i))) ? 2 : 0;
                    const colour = (inViewport ? altColours : colours)[this.#registerData.bgPaletteMap[p0 | p1]];
                    renderer.setPixel(x + i, colour);
                }
            }
            renderer.renderToLine(y);
        }
    }

    #setMode(mode : PPUMode){
        this.#registerData.mode = mode;
        switch(mode){
            case PPUMode.MODE_SEARCH_OAM:
            {
                const oamInterruptEnabled = (this.#registerData.interruptFlags & 0x20) > 0
                this.#callbacks.oam.forEach(cb => cb(oamInterruptEnabled));
                break;
            }
            case PPUMode.MODE_DRAW_LINE:
                this.#scanlineParams.scrollX = this.#registerData.scrollX;
                this.#scanlineParams.scrollY = this.#registerData.scrollY;
                this.#scanlineParams.windowX = this.#registerData.windowX;
                this.#scanlineParams.windowY = this.#registerData.windowY;
                break;
            case PPUMode.MODE_HBLANK:
            {
                const hblankInterruptEnabled = (this.#registerData.interruptFlags & 0x8) > 0;
                this.#callbacks.hblank.forEach(cb => cb(hblankInterruptEnabled));
                break;
            }
            case PPUMode.MODE_VBLANK:
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

    debugSetHighlightBg(enable : boolean){
        this.#debug.highlightBg = enable;
    }

    debugSetHighlightWin(enable : boolean){
        this.#debug.highlightWin = enable;
    }

    debugSetHighlightSprite(enable : boolean){
        this.#debug.highlightSprite = enable;
    }

    tick(cycles : number){
        if(!(this.#registerData.control & 0x80)){
            // LCD disabled
            return;
        }
        this.#tickCounter += cycles;
        let running = true;
        while(running){
            switch(this.#registerData.mode){
                case PPUMode.MODE_SEARCH_OAM:
                    if(this.#tickCounter > 80){
                        this.#tickCounter -= 80;
                        this.#setMode(PPUMode.MODE_DRAW_LINE);
                    }else{
                        running = false;
                    }
                    break;
                case PPUMode.MODE_DRAW_LINE:
                    if(this.#tickCounter > 180){
                        this.#tickCounter -= 180;
                        this.#setMode(PPUMode.MODE_HBLANK);
                        this.#draw();
                    } else {
                        running = false;
                    }
                    break;
                case PPUMode.MODE_HBLANK:
                    if(this.#tickCounter > 196){
                        this.#tickCounter -= 196;
                        this.#incrementY();
                        if(this.#registerData.y >= screenH){
                            this.#setMode(PPUMode.MODE_VBLANK);
                        } else {
                            this.#setMode(PPUMode.MODE_SEARCH_OAM);
                        }
                    } else {
                        running = false;
                    }
                    break;
                case PPUMode.MODE_VBLANK:
                    if(this.#tickCounter > 456){
                        this.#tickCounter -= 456;
                        this.#incrementY();
                        if(this.#registerData.y >= screenScanH){
                            this.#registerData.y = 0;
                            this.#registerData.windowActive = false;
                            this.#setMode(PPUMode.MODE_SEARCH_OAM);
                        }
                    } else {
                        running = false;
                    }
                    break;
            }
        }
    }
}
