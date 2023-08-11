import { getBankMask } from "../../utils.js";
import MMUBankMapping from "../mmu-bank-mapping.js";
import MBC, { MBCSaveRAMCallback } from "./mbc.js";

export default class MBC5 implements MBC{
    #activeBanks;
    #registers = {
        ramEnable: 0,
        romBankNoLow: 1,
	romBankNoHigh: 0,
	ramBankNo: 0,
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
        this.#activeBanks.rom2 = (this.#registers.romBankNoLow | (this.#registers.romBankNoHigh << 8)) & getBankMask(this.#romBankCount);
        this.#activeBanks.rom = 0;
        this.#activeBanks.nvEram = this.#registers.ramBankNo & getBankMask(this.#ramBankCount);
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
		this.#registers.romBankNoLow = (val & 0xFF);
	        this.#setBanks();
		break;
            case 0x3000:
                this.#registers.romBankNoHigh = (val & 0x1);
                this.#setBanks();
                break;
            case 0x4000:
            case 0x5000:
                // RAM bank no / upper bits of ROM bank no
                this.#registers.ramBankNo = (val & 0xF);
                this.#setBanks();
                break;
        }
        return val;
    }
}
