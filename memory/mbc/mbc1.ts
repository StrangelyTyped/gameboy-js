import { getBankMask } from "../../utils.js";
import MMUBankMapping from "../mmu-bank-mapping.js";
import MBC, { MBCSaveRAMCallback } from "./mbc.js";

export default class MBC1 implements MBC{
    #activeBanks;
    #registers = {
        ramEnable: 0,
        romBankNoLow: 1,
        ramBankRomBankNoHigh: 0,
        bankMode: 0
    };
    #romBankCount;
    #ramBankCount;
    #saveRamFunc;
    constructor(activeBanks : MMUBankMapping, romBanks : number, ramBanks : number, saveRamFunc : MBCSaveRAMCallback){
        this.#activeBanks = activeBanks;
        this.#romBankCount = romBanks;
        this.#ramBankCount = ramBanks;
        this.#saveRamFunc = saveRamFunc;
    }
    #setBanks(){
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
    romWrite(addr : number, val : number){
        switch(addr & 0xF000){
            case 0x0000:
            case 0x1000:
                //RAM enable
                this.#registers.ramEnable = (val & 0xF) == 0xA ? 1 : 0;
                if(!this.#registers.ramEnable){
                    this.#saveRamFunc();
                }
                break;
            case 0x2000:
            case 0x3000:
                //ROM Bank no
                this.#registers.romBankNoLow = (val & 0x1F) || 0x1;
                this.#setBanks();
                break;
            case 0x4000:
            case 0x5000:
                // RAM bank no / upper bits of ROM bank no
                this.#registers.ramBankRomBankNoHigh = (val & 0x3);
                this.#setBanks();
                break;
            case 0x6000:
            case 0x7000:
                // ROM/RAM mode select
                // in mode 0 both bank registers affect rom2
                // in mode 1 the low register affects rom2 and the high register affects 
                // either nvEram or rom depending on configuration

                this.#registers.bankMode = val & 0x1;
                this.#setBanks();
                break;
        }
        return val;
    }
}