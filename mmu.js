function getBankMask(bankCount){
    let bankMask = 0;
    const bankBits = Math.ceil(Math.log2(bankCount));
    for(let i = 0; i < bankBits; i++){
        bankMask |= (1 << i);
    }
    return bankMask;
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
    constructor(activeBanks, romBanks, ramBanks){
        this.#activeBanks = activeBanks;
        this.#registers = {
            ramEnable: 0,
            romBankNoLow: 1,
            ramBankRomBankNoHigh: 0,
            bankMode: 0
        };
        this.#romBankCount = romBanks;
        this.#ramBankCount = ramBanks;
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
        }
    }
    romWrite(addr, v){
        switch(addr & 0xF000){
            case 0x0000:
            case 0x1000:
                //RAM enable
                // We don't need to worry about actually disabling ram - it's not hardware
                this.#registers.ramEnable = (v & 0xF) == 0xA ? 1 : 0;
                break;
            case 0x2000:
            case 0x3000:
                //ROM Bank no
                //TODO: docs say the 1F mask should be proportionate to number of available banks
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

function makeBuffer(size){
    return new Array(size).fill(0);
}

class MMU {
    #banks;
    #activeBanks;
    #mbc;
    #romBankCount;
    #ramBankCount;

    #gpu;
    #joypad;
    #timer;
    #serial;
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
        this.memory = new Proxy(this, {
            get: (target, k) => this.read(k),
            set: (target, k, v) => {
                this.write(k, v);
                return true;
            }
        });
        this.setCartridgeType(0, 0, 0);
    }

    read(k){
        k &= 0xFFFF;
        switch(k & 0xF000){
            case 0x0000:
                if(k < 0x100 && this.#activeBanks.boot){
                    return this.#banks.bootRom[k];
                }
            case 0x1000:
            case 0x2000:
            case 0x3000:
                return this.#banks.rom[this.#activeBanks.rom][k];
            case 0x4000:
            case 0x5000:
            case 0x6000:
            case 0x7000:
                return this.#banks.rom[this.#activeBanks.rom2][k - 0x4000];
            case 0x8000:
            case 0x9000:
                return this.#banks.vram[this.#activeBanks.vram][k - 0x8000];
            case 0xA000:
            case 0xB000:
                return this.#banks.nvEram[this.#activeBanks.nvEram][k - 0xA000];
            case 0xC000:
                return this.#banks.wram[this.#activeBanks.wram][k - 0xC000];
            case 0xD000:
                return this.#banks.wram[this.#activeBanks.wram2][k - 0xD000];
            case 0xE000:
                return this.#banks.wram[this.#activeBanks.wram][k - 0xE000];
            case 0xF000:
                switch(k & 0x0F00){
                    case 0x0E00:
                        return this.#banks.oam[k - 0xFE00];
                    case 0x0F00:
                        if(k === 0xFFFF){
                            //interrupt enable register
                            return this.#banks.interruptEnableRegister;
                        }else if(k >= 0xFF80){
                            //HRAM
                            return this.#banks.hram[k - 0xFF80];
                        }else{
                            //IO Registers
                            // TODO
                            if(k === 0xFF0F){
                                // interrupt flag register
                                return this.#banks.interruptFlagRegister;
                            } else if(k >= 0xFF40 && k <= 0xFF4B){
                                return this.#gpu.readRegister(k);
                            } else if(k >= 0xFF30 && k <= 0xFF3F){
                                //wave ram
                                return 0;
                            } else if(k >= 0xFF10 && k <= 0xFF26){
                                //Sound device, ignore for now
                            } else if(k >= 0xFF04 && k <= 0xFF07){
                                if(this.#timer){
                                    return this.#timer.readRegister(k);
                                }
                                return 0x80;
                            } else if(k >= 0xFF01 && k <= 0xFF02){
                                // Serial transfer
                                if(this.#serial){
                                    return this.#serial.readRegister(k);
                                }
                                return 0;
                            } else if(k ===  0xFF00){
                                // joypad
                                if(this.#joypad){
                                    return this.#joypad.readRegister(k);
                                }
                                return 0x8;
                            } else if(k === 0xFF7F){
                                // No idea what this is - not documented
                            }else{
                                console.warn("Unhandled IO Register read", k);
                            }
                        }
                        return 0;
                    default:
                        return this.#banks.wram[this.#activeBanks.wram2][k - 0xF000];
                }
        }
    }

    write(k, v) {
        k &= 0xFFFF;
        switch(k & 0xF000){
            case 0x0000:
            case 0x1000:
            case 0x2000:
            case 0x3000:
            case 0x4000:
            case 0x5000:
            case 0x6000:
            case 0x7000:
                this.#mbc.romWrite(k, v);
                break;
            case 0x8000:
            case 0x9000:
                this.#banks.vram[this.#activeBanks.vram][k - 0x8000] = v;
                break;
            case 0xA000:
            case 0xB000:
                this.#banks.nvEram[this.#activeBanks.nvEram][k - 0xA000] = v;
                break;
            case 0xC000:
                this.#banks.wram[this.#activeBanks.wram][k - 0xC000] = v;
                break;
            case 0xD000:
                this.#banks.wram[this.#activeBanks.wram2][k - 0xD000] = v;
                break;
            case 0xE000:
                this.#banks.wram[this.#activeBanks.wram][k - 0xE000] = v;
                break;
            case 0xF000:
                switch(k & 0x0F00){
                    case 0x0E00:
                        this.#banks.oam[k - 0xFE00] = v;
                        break;
                    case 0x0F00:
                        if(k === 0xFFFF){
                            //interrupt enable register
                            this.#banks.interruptEnableRegister = v;
                        } if(k >= 0xFF80){
                            //HRAM
                            this.#banks.hram[k - 0xFF80] = v;
                        }else{
                            //IO Registers
                            if(k >= 0xFF40 && k <= 0xFF4B){
                                this.#gpu.writeRegister(k, v);
                            } else if(k >= 0xFF30 && k <= 0xFF3F){
                                //wave ram
                            } else if(k === 0xFF0F){
                                // interrupt flag register
                                this.#banks.interruptFlagRegister = v;
                            } else if(k >= 0xFF10 && k <= 0xFF26){
                                //Sound device, ignore for now
                            } else if(k >= 0xFF04 && k <= 0xFF07){
                                if(this.#timer){
                                    this.#timer.writeRegister(k, v);
                                }
                            } else if(k >= 0xFF01 && k <= 0xFF02){
                                // Serial transfer
                                if(this.#serial){
                                    this.#serial.writeRegister(k, v);
                                }
                            } else if(k ===  0xFF00){
                                // joypad
                                if(this.#joypad){
                                    this.#joypad.writeRegister(k, v);
                                }
                            } else if(k === 0xFF50){
                                console.warn("Boot rom unmap");
                                this.#activeBanks.boot = false;
                            } else if(k === 0xFF7F){
                                // No idea what this is - not documented
                            }else{
                                console.warn("Unhandled IO Register write", k, v);
                            }
                        }
                        break;
                    default:
                        this.#banks.wram[this.#activeBanks.wram2][k - 0xF000] = v;
                }
        }
    }

    setCartridgeType(cartTypeId, romTypeId, ramTypeId){
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
        while(this.#banks.nvEram < this.#ramBankCount){
            this.#banks.nvEram.push(makeBuffer(0x2000));
        }
        switch(cartTypeId){
            case 0x00:
                this.#mbc = new RomOnlyMbc(this.#activeBanks);
                break;
            case 0x01:
            case 0x02:
            case 0x03:
                this.#mbc = new MBC1(this.#activeBanks, this.#romBankCount, this.#ramBankCount);
                break;
            default:
                console.warn("Unimplemented MBC type", cartTypeId);
                this.#mbc = new RomOnlyMbc(this.#activeBanks);
        }
    }
    read16(idx){
        return this.read(idx) | (this.read(idx + 1) << 8);
    }
    
    write16(idx, val){
        this.write(idx, val & 0xFF);
        this.write(idx + 1, (val & 0xFF00) >> 8);
    }
    
    mapRomBank(index, data){
        if(data.length != 0x4000){
            const pad = new Array(0x4000 - data.length);
            data = data.concat(pad);
        }
        if(index === 0){
            this.setCartridgeType(data[0x147], data[0x148], data[0x149]);
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
        gpu.mapMemory(this.memory);
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
}

export default new MMU();