import { getBankMask } from "../../utils.js";
import MMUBankMapping from "../mmu-bank-mapping.js";
import MBC, { MBCSaveRAMCallback } from "./mbc.js";

export default class MBC3 implements MBC {
    #activeBanks;
    #registers = {
        ramEnable: 0,
        romBankNo: 1,
        ramBankNo: 0,
    };
    #romBankCount;
    #ramBankCount;
    #saveRamFunc;
    constructor(activeBanks : MMUBankMapping, romBanks : number, ramBanks : number, saveRamFunc : MBCSaveRAMCallback, hasRtc : boolean){
        this.#activeBanks = activeBanks;
        this.#romBankCount = romBanks;
        this.#ramBankCount = ramBanks;
        this.#saveRamFunc = saveRamFunc;
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
                this.#registers.romBankNo = (val & 0xFF) || 0x1;
                this.#activeBanks.rom2 = this.#registers.romBankNo & getBankMask(this.#romBankCount);
                break;
            case 0x4000:
            case 0x5000:
                // RAM bank no / RTC register select
                this.#registers.ramBankNo = (val & 0x3);
                this.#activeBanks.nvEram = this.#registers.ramBankNo & getBankMask(this.#ramBankCount);
                break;
            case 0x6000:
            case 0x7000:
                // RTC latch
                break;
        }
        return val;
    }
}
