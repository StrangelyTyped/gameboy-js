import {readString, makeBuffer, MemoryMappable} from "../utils.js";
import MBC from "./mbc/mbc.js";
import MBC1 from "./mbc/mbc1.js";
import MBC3 from "./mbc/mbc3.js";
import RomOnlyMbc from "./mbc/rom-only-mbc.js";
import Memory from "./memory.js";
import MMUBankMapping from "./mmu-bank-mapping.js";
import { PersistenceFactory, RamPersistence } from "./persistence/ram-persistence.js";

class MemoryBanks {
    bootRom = makeBuffer(0x100);
    bootRom2 : Uint8Array | null = null;
    // rom / nvEram: additional banks provisioned when cartridge type set
    // 0xFF for open-bus until a cartridge is mapped
    rom = [makeBuffer(0x4000).fill(0xFF), makeBuffer(0x4000).fill(0xFF)];
    vram = [makeBuffer(0x2000), makeBuffer(0x2000)];
    nvEram = [makeBuffer(0x2000)];
    // CGB 8 banks
    wram = [makeBuffer(0x1000), makeBuffer(0x1000), makeBuffer(0x1000), makeBuffer(0x1000),
            makeBuffer(0x1000), makeBuffer(0x1000), makeBuffer(0x1000), makeBuffer(0x1000)];
    oam = makeBuffer(0x9F);
    hram = makeBuffer(0x7E);
    interruptFlagRegister = 0;
    interruptEnableRegister = 0;
}

export default class MMU implements Memory {
    #persistenceFactory;
    #ramPersistence : RamPersistence | null = null;
    #banks = new MemoryBanks();
    #activeBanks = new MMUBankMapping();
    #mbc : MBC = new RomOnlyMbc(); // Will overrite with real one before it gets used
    #romBankCount = 2;
    #ramBankCount = 1;
    #colorMode = true;

    #ppu : MemoryMappable | null = null;
    #joypad : MemoryMappable | null = null;
    #timer : MemoryMappable | null = null;
    #serial : MemoryMappable | null = null;
    #audio : MemoryMappable | null = null;
    constructor(persistenceFactory : PersistenceFactory){
        this.#persistenceFactory = persistenceFactory;
        this.setCartridgeType(0, 0, 0);
    }

    readVram(bank : number, addr : number){
        return this.#banks.vram[bank][addr - 0x8000];;
    }

    read(addr : number){
        addr &= 0xFFFF;
        switch(addr & 0xF000){
            case 0x0000:
                if(this.#activeBanks.boot){
                    if(addr < 0x100){
                        return this.#banks.bootRom[addr];
                    } else if (this.#banks.bootRom2 !== null && addr >= 0x200 && addr < 0x900){
                        return this.#banks.bootRom2[addr - 0x200];
                    }
                }
            case 0x1000:
            case 0x2000:
            case 0x3000:
                return this.#banks.rom[this.#activeBanks.rom][addr];
            case 0x4000:
            case 0x5000:
            case 0x6000:
            case 0x7000:
                return this.#banks.rom[this.#activeBanks.rom2][addr - 0x4000];
            case 0x8000:
            case 0x9000:
                return this.#banks.vram[this.#activeBanks.vram][addr - 0x8000];
            case 0xA000:
            case 0xB000:
                return this.#banks.nvEram[this.#activeBanks.nvEram][addr - 0xA000];
            case 0xC000:
                return this.#banks.wram[this.#activeBanks.wram][addr - 0xC000];
            case 0xD000:
                return this.#banks.wram[this.#activeBanks.wram2][addr - 0xD000];
            case 0xE000:
                return this.#banks.wram[this.#activeBanks.wram][addr - 0xE000];
            case 0xF000:
                switch(addr & 0x0F00){
                    case 0x0E00:
                        return this.#banks.oam[addr - 0xFE00];
                    case 0x0F00:
                        if(addr === 0xFFFF){
                            //interrupt enable register
                            return this.#banks.interruptEnableRegister;
                        }else if(addr >= 0xFF80){
                            //HRAM
                            return this.#banks.hram[addr - 0xFF80];
                        }else{
                            //IO Registers
                            // TODO
                            if(addr === 0xFF0F){
                                // interrupt flag register
                                return this.#banks.interruptFlagRegister;
                            } else if((addr >= 0xFF40 && addr <= 0xFF4B) || (addr >= 0xFF51 && addr <= 0xFF55) || (addr >= 0xFF68 && addr <= 0xFF6C)){
                                if(this.#ppu){
                                    return this.#ppu.readRegister(addr);
                                }
                                return 0x9F;
                            } else if(addr >= 0xFF10 && addr <= 0xFF3F){
                                //Sound device
                                if(this.#audio){
                                    return this.#audio.readRegister(addr);
                                }
                                return 0xFF;
                            } else if(addr >= 0xFF04 && addr <= 0xFF07){
                                if(this.#timer){
                                    return this.#timer.readRegister(addr);
                                }
                                return 0x80;
                            } else if(addr >= 0xFF01 && addr <= 0xFF02){
                                // Serial transfer
                                if(this.#serial){
                                    return this.#serial.readRegister(addr);
                                }
                                return 0;
                            } else if(addr ===  0xFF00){
                                // joypad
                                if(this.#joypad){
                                    return this.#joypad.readRegister(addr);
                                }
                                return 0x8;
                            } else if(addr == 0xFF4F){
                                if(this.isColorMode()){
                                    return this.#activeBanks.vram | 0xFE;
                                }
                            } else if(addr == 0xFF70){
                                if(this.isColorMode()){
                                    return this.#activeBanks.wram2;
                                }
                            } else if(addr === 0xFF7F){
                                // No idea what this is - not documented
                            } else{
                                console.warn("Unhandled IO Register read", addr);
                            }
                        }
                        return 0xFF;
                    default:
                        return this.#banks.wram[this.#activeBanks.wram2][addr - 0xF000];
                }
        }
        return 0xFF;
    }

    write(addr : number, val : number) {
        addr &= 0xFFFF;
        switch(addr & 0xF000){
            case 0x0000:
            case 0x1000:
            case 0x2000:
            case 0x3000:
            case 0x4000:
            case 0x5000:
            case 0x6000:
            case 0x7000:
                this.#mbc.romWrite(addr, val);
                break;
            case 0x8000:
            case 0x9000:
                this.#banks.vram[this.#activeBanks.vram][addr - 0x8000] = val;
                break;
            case 0xA000:
            case 0xB000:
                this.#banks.nvEram[this.#activeBanks.nvEram][addr - 0xA000] = val;
                break;
            case 0xC000:
                this.#banks.wram[this.#activeBanks.wram][addr - 0xC000] = val;
                break;
            case 0xD000:
                this.#banks.wram[this.#activeBanks.wram2][addr - 0xD000] = val;
                break;
            case 0xE000:
                this.#banks.wram[this.#activeBanks.wram][addr - 0xE000] = val;
                break;
            case 0xF000:
                switch(addr & 0x0F00){
                    case 0x0E00:
                        this.#banks.oam[addr - 0xFE00] = val;
                        break;
                    case 0x0F00:
                        if(addr === 0xFFFF){
                            //interrupt enable register
                            this.#banks.interruptEnableRegister = val;
                        } if(addr >= 0xFF80){
                            //HRAM
                            this.#banks.hram[addr - 0xFF80] = val;
                        }else{
                            //IO Registers
                            if((addr >= 0xFF40 && addr <= 0xFF4B) || (addr >= 0xFF51 && addr <= 0xFF55) || (addr >= 0xFF68 && addr <= 0xFF6C)){
                                if(this.#ppu){
                                    this.#ppu.writeRegister(addr, val);
                                }
                            } else if(addr >= 0xFF10 && addr <= 0xFF3F){
                                // Sound device
                                if(this.#audio){
                                    this.#audio.writeRegister(addr, val);
                                }
                            } else if(addr === 0xFF4C){
                                this.#colorMode = (val & 0x80) !== 0;
                            } else if(addr === 0xFF0F){
                                // interrupt flag register
                                this.#banks.interruptFlagRegister = val;
                            } else if(addr >= 0xFF04 && addr <= 0xFF07){
                                if(this.#timer){
                                    this.#timer.writeRegister(addr, val);
                                }
                            } else if(addr >= 0xFF01 && addr <= 0xFF02){
                                // Serial transfer
                                if(this.#serial){
                                    this.#serial.writeRegister(addr, val);
                                }
                            } else if(addr ===  0xFF00){
                                // joypad
                                if(this.#joypad){
                                    this.#joypad.writeRegister(addr, val);
                                }
                            } else if(addr == 0xFF4F){
                                if(this.isColorMode()){
                                    this.#activeBanks.vram = (val & 0x1);
                                }
                            } else if(addr == 0xFF70){
                                if(this.isColorMode()){
                                    this.#activeBanks.wram2 = (val & 0x7) || 1;
                                }
                            } else if(addr === 0xFF50){
                                console.warn("Boot rom unmap");
                                this.#activeBanks.boot = false;
                            } else if(addr === 0xFF7F){
                                // No idea what this is - not documented
                            }else{
                                console.warn("Unhandled IO Register write", addr, val);
                            }
                        }
                        break;
                    default:
                        this.#banks.wram[this.#activeBanks.wram2][addr - 0xF000] = val;
                }
        }
    }

    setCartridgeType(cartTypeId : number, romTypeId : number, ramTypeId : number, cartridgeName = "UNKNOWN"){
        switch(romTypeId){
            case 0x00:
            case 0x01:
            case 0x02:
            case 0x03:
            case 0x04:
            case 0x05:
            case 0x06:
            case 0x07:
            case 0x08:
                this.#romBankCount = 2 << romTypeId;
                break;
            case 0x52:
                this.#romBankCount = 72;
                break;
            case 0x53:
                this.#romBankCount = 80;
                break;
            case 0x54:
                this.#romBankCount = 96;
                break;
            default:
                this.#romBankCount = 2;
                console.warn("Unknown ROM type ID", romTypeId);
        }
        while(this.#banks.rom.length < this.#romBankCount){
            this.#banks.rom.push(makeBuffer(0x4000).fill(0xFF));
        }
        switch(ramTypeId){
            case 0x00:
                this.#ramBankCount = 0;
                break;
            case 0x02:
                this.#ramBankCount = 1;
                break;
            case 0x03:
                this.#ramBankCount = 4;
                break;
            case 0x04:
                this.#ramBankCount = 16;
                break;
            case 0x05:
                this.#ramBankCount = 8;
                break;
            default:
                this.#ramBankCount = 2;
                console.warn("Unknown RAM type ID", ramTypeId);
        }
        
        let hasPersistentRam = false;
        const saveRam = () => this.saveRam();
        switch(cartTypeId){
            case 0x00:
                this.#mbc = new RomOnlyMbc();
                break;
            case 0x01:
            case 0x02:
            case 0x03:
                hasPersistentRam = cartTypeId === 0x3;
                this.#mbc = new MBC1(this.#activeBanks, this.#romBankCount, this.#ramBankCount, saveRam);
                break;
            case 0x0F:
            case 0x10:
            case 0x11:
            case 0x12:
            case 0x13:
            {
                hasPersistentRam = (cartTypeId === 0x10 || cartTypeId === 0x13);
                let hasRtc = (cartTypeId === 0x0F || cartTypeId === 0x10);
                this.#mbc = new MBC3(this.#activeBanks, this.#romBankCount, this.#ramBankCount, saveRam, hasRtc);
                break;
            }
            default:
                console.warn("Unimplemented MBC type", cartTypeId);
                //this.#mbc = new RomOnlyMbc(this.#activeBanks);
                throw new Error();
        }

        if(hasPersistentRam){
            this.#ramPersistence = this.#persistenceFactory(cartridgeName, this.#ramBankCount);
            this.#banks.nvEram = this.#ramPersistence.loadRamBanks();
        }
        while(this.#banks.nvEram.length < this.#ramBankCount){
            this.#banks.nvEram.push(makeBuffer(0x2000));
        }
    
    }
    
    saveRam(){
        if(this.#ramPersistence !== null){
            this.#ramPersistence.saveRamBanks(this.#banks.nvEram)
        }
    }
    read16(addr : number){
        return this.read(addr) | (this.read(addr + 1) << 8);
    }
    
    write16(addr : number, val : number){
        this.write(addr, val & 0xFF);
        this.write(addr + 1, (val & 0xFF00) >> 8);
    }

    isColorMode() : boolean {
        return this.#colorMode;
    }
    
    mapRomBank(index : number, data : ArrayLike<number>){
        const bank = makeBuffer(0x4000);
        bank.set(data, 0);
        if(index === 0){
            this.setCartridgeType(data[0x147], data[0x148], data[0x149], readString(data, 0x0134, 11));
        }
        this.#banks.rom[index] = bank;
    }
    mapBootRom(data : ArrayLike<number>){
        if(data.length > 0x100){
            if(data.length !== 0x900){
                console.warn("Unexpected Boot ROM size, expected 2304 bytes, got", data.length);
            }
            this.#banks.bootRom2 = makeBuffer(0x700).fill(0xFF);
            this.#banks.bootRom2.set(Array.prototype.slice.call(data, 0x200, 0x900), 0);
        }else if(data.length !== 0x100){
            console.warn("Unexpected Boot ROM size, expected 256 bytes, got", data.length);
        }
        this.#banks.bootRom.set(Array.prototype.slice.call(data, 0, 0x100), 0);
        this.#activeBanks.boot = true;
    }
    loadCartridge(data : ArrayLike<number>){
        for(let i = 0, j = 0; i < data.length; i+=0x4000, j++){
            this.mapRomBank(j, Array.prototype.slice.apply(data, [i, i+0x4000]))
        }
    }
    mapGraphics(ppu : MemoryMappable){
        this.#ppu = ppu;
    }
    mapJoypad(joypad : MemoryMappable){
        this.#joypad = joypad;
    }
    mapTimer(timer : MemoryMappable){
        this.#timer = timer;
    }
    mapSerial(serial : MemoryMappable){
        this.#serial = serial;
    }
    mapAudio(audio : MemoryMappable){
        this.#audio = audio;
    }
}
