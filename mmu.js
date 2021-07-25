function getBankMask(bankCount){
    let bankMask = 0;
    const bankBits = Math.ceil(Math.log2(bankCount));
    for(let i = 0; i < bankBits; i++){
        bankMask |= (1 << i);
    }
    return bankMask;
}

function readString(data, startIdx, maxLength){
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

class RamPersistence{
    #cartridgeName;
    #bankCount;
    constructor(cartridgeName, ramBankCount){
        this.#cartridgeName = cartridgeName;
        this.#bankCount = ramBankCount;
    }
    loadRamBanks(){
        let banks = [];
        try {
            banks = JSON.parse(window.localStorage.getItem(this.#cartridgeName)) || [];
        } catch (e){}
        while(banks.length < this.#bankCount){
            banks.push(makeBuffer(0x2000));
        }
        return banks;
    }
    saveRamBanks(banks){
        window.localStorage.setItem(this.#cartridgeName, JSON.stringify(banks));
    }
}

class RomOnlyMbc {
    constructor(activeBanks){}
    romWrite(addr, v){
        console.warn("ROM Write on RomOnlyMbc", addr, "=", v);
        return v;
    }
}
class MBC1 {
    #activeBanks;
    #registers;
    #romBankCount;
    #ramBankCount;
    #saveRamFunc;
    constructor(activeBanks, romBanks, ramBanks, saveRamFunc){
        this.#activeBanks = activeBanks;
        this.#registers = {
            ramEnable: 0,
            romBankNoLow: 1,
            ramBankRomBankNoHigh: 0,
            bankMode: 0
        };
        this.#romBankCount = romBanks;
        this.#ramBankCount = ramBanks;
        this.#saveRamFunc = saveRamFunc;
    }
    setBanks(){
        if(this.#registers.bankMode === 0){
            this.#activeBanks.rom2 = (this.#registers.romBankNoLow | (this.#registers.ramBankRomBankNoHigh << 5)) & getBankMask(this.#romBankCount);
            this.#activeBanks.nvEram = 0;
            this.#activeBanks.rom = 0;
        } else {
            if(this.#ramBankCount > 1){
                this.#activeBanks.nvEram = this.#registers.ramBankRomBankNoHigh & getBankMask(this.#ramBankCount);
            }else{
                this.#activeBanks.rom = this.#registers.ramBankRomBankNoHigh & getBankMask(this.#romBankCount);
            }
            this.#activeBanks.rom2 = this.#registers.romBankNoLow & getBankMask(this.#romBankCount);
        }
    }
    romWrite(addr, v){
        switch(addr & 0xF000){
            case 0x0000:
            case 0x1000:
                //RAM enable
                this.#registers.ramEnable = (v & 0xF) == 0xA ? 1 : 0;
                if(!this.#registers.ramEnable){
                    this.#saveRamFunc();
                }
                break;
            case 0x2000:
            case 0x3000:
                //ROM Bank no
                this.#registers.romBankNoLow = (v & 0x1F) || 0x1;
                this.setBanks();
                break;
            case 0x4000:
            case 0x5000:
                // RAM bank no / upper bits of ROM bank no
                this.#registers.ramBankRomBankNoHigh = (v & 0x3);
                this.setBanks();
                break;
            case 0x6000:
            case 0x7000:
                // ROM/RAM mode select
                // in mode 0 both bank registers affect rom2
                // in mode 1 the low register affects rom2 and the high register affects 
                // either nvEram or rom depending on configuration

                this.#registers.bankMode = v & 0x1;
                this.setBanks();
                break;
        }
        return v;
    }
}

class MBC3 {
    #activeBanks;
    #registers;
    #romBankCount;
    #ramBankCount;
    #saveRamFunc;
    constructor(activeBanks, romBanks, ramBanks, saveRamFunc, hasRtc){
        this.#activeBanks = activeBanks;
        this.#registers = {
            ramEnable: 0,
            romBankNo: 1,
            ramBankNo: 0,
        };
        this.#romBankCount = romBanks;
        this.#ramBankCount = ramBanks;
        this.#saveRamFunc = saveRamFunc;
    }
    romWrite(addr, v){
        switch(addr & 0xF000){
            case 0x0000:
            case 0x1000:
                //RAM enable
                this.#registers.ramEnable = (v & 0xF) == 0xA ? 1 : 0;
                if(!this.#registers.ramEnable){
                    this.#saveRamFunc();
                }
                break;
            case 0x2000:
            case 0x3000:
                //ROM Bank no
                this.#registers.romBankNo = (v & 0xFF) || 0x1;
                this.#activeBanks.rom2 = this.#registers.romBankNo & getBankMask(this.#romBankCount);
                break;
            case 0x4000:
            case 0x5000:
                // RAM bank no / RTC register select
                this.#registers.ramBankNo = (v & 0x3);
                this.#activeBanks.nvEram = this.#registers.ramBankNo & getBankMask(this.#ramBankCount);
                break;
            case 0x6000:
            case 0x7000:
                // RTC latch
                break;
        }
        return v;
    }
}

function makeBuffer(size){
    return new Array(size).fill(0);
}

export default class MMU {
    #banks;
    #activeBanks;
    #mbc;
    #romBankCount;
    #ramBankCount;

    #gpu;
    #joypad;
    #timer;
    #serial;
    #audio;
    constructor(){
        this.#banks = {
            bootRom: makeBuffer(0x100),
            // rom / nvEram: additional banks provisioned when cartridge type set
            // 0xFF for open-bus until a cartridge is mapped
            rom: [makeBuffer(0x4000).fill(0xFF), makeBuffer(0x4000).fill(0xFF)],
            vram: [ makeBuffer(0x2000)],
            nvEram: [makeBuffer(0x2000)],
            // CGB 8 banks
            wram: [makeBuffer(0x1000), makeBuffer(0x1000), makeBuffer(0x1000), makeBuffer(0x1000),
                   makeBuffer(0x1000), makeBuffer(0x1000), makeBuffer(0x1000), makeBuffer(0x1000)],
            oam: makeBuffer(0x9F),
            hram: makeBuffer(0x7E),
            interruptFlagRegister: 0,
            interruptEnableRegister: 0,
        };
        this.#activeBanks = {
            boot: true,
            rom: 0,
            rom2: 1,
            vram: 0,
            nvEram: 0,
            wram: 0,
            wram2: 1,
        };

        this.setCartridgeType(0, 0, 0);
    }

    read(addr){
        addr &= 0xFFFF;
        switch(addr & 0xF000){
            case 0x0000:
                if(addr < 0x100 && this.#activeBanks.boot){
                    return this.#banks.bootRom[addr];
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
                            } else if(addr >= 0xFF40 && addr <= 0xFF4B){
                                return this.#gpu.readRegister(addr);
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
    }

    write(addr, val) {
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
                            if(addr >= 0xFF40 && addr <= 0xFF4B){
                                this.#gpu.writeRegister(addr, val);
                            } else if(addr >= 0xFF10 && addr <= 0xFF3F){
                                // Sound device
                                if(this.#audio){
                                    this.#audio.writeRegister(addr, val);
                                }
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

    setCartridgeType(cartTypeId, romTypeId, ramTypeId, cartridgeName = "UNKNOWN"){
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
        while(this.#banks.rom < this.#romBankCount){
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
        
        const ramPersistence = new RamPersistence(cartridgeName, this.#ramBankCount);
        let hasPersistentRam = false;
        const saveRam = () => ramPersistence.saveRamBanks(this.#banks.nvEram);
        const dummySaveRam = () => {};
        switch(cartTypeId){
            case 0x00:
                this.#mbc = new RomOnlyMbc(this.#activeBanks);
                break;
            case 0x01:
            case 0x02:
            case 0x03:
                hasPersistentRam = cartTypeId === 0x3;
                this.#mbc = new MBC1(this.#activeBanks, this.#romBankCount, this.#ramBankCount, hasPersistentRam ? saveRam : dummySaveRam);
                break;
            case 0x0F:
            case 0x10:
            case 0x11:
            case 0x12:
            case 0x13:
            {
                hasPersistentRam = (cartTypeId === 0x10 || cartTypeId === 0x13);
                let hasRtc = (cartTypeId === 0x0F || cartTypeId === 0x10);
                this.#mbc = new MBC3(this.#activeBanks, this.#romBankCount, this.#ramBankCount, hasPersistentRam ? saveRam : dummySaveRam, hasRtc);
                break;
            }
            default:
                console.warn("Unimplemented MBC type", cartTypeId);
                //this.#mbc = new RomOnlyMbc(this.#activeBanks);
                throw new Error();
        }

        if(hasPersistentRam){
            this.#banks.nvEram = ramPersistence.loadRamBanks();
            this.saveRam = saveRam;
        } else {
            this.saveRam = dummySaveRam;
        }
        while(this.#banks.nvEram < this.#ramBankCount){
            this.#banks.nvEram.push(makeBuffer(0x2000));
        }
    
    }
    saveRam(){}
    read16(addr){
        return this.read(addr) | (this.read(addr + 1) << 8);
    }
    
    write16(addr, val){
        this.write(addr, val & 0xFF);
        this.write(addr + 1, (val & 0xFF00) >> 8);
    }
    
    mapRomBank(index, data){
        if(data.length != 0x4000){
            const pad = new Array(0x4000 - data.length);
            data = data.concat(pad);
        }
        if(index === 0){
            this.setCartridgeType(data[0x147], data[0x148], data[0x149], readString(data, 0x0134, 11));
        }
        this.#banks.rom[index] = data;
    }
    mapBootRom(data){
        this.#banks.bootRom = data;
    }
    loadCartridge(data){
        for(let i = 0, j = 0; i < data.length; i+=0x4000, j++){
            this.mapRomBank(j, data.slice(i, i+0x4000))
        }
    }
    mapGpuMemory(gpu){
        gpu.mapMemory(this);
        this.#gpu = gpu;
    }
    mapJoypad(joypad){
        this.#joypad = joypad;
    }
    mapTimer(timer){
        this.#timer = timer;
    }
    mapSerial(serial){
        this.#serial = serial;
    }
    mapAudio(audio){
        this.#audio = audio;
    }
}
