import { makeBuffer } from "../../utils.js";

export type PersistenceFactory = (cartridgeName : string, ramBankCount : number) => RamPersistence;

export interface RamPersistence {
    loadRamBanks() : Uint8Array[];
    saveRamBanks(banks : Uint8Array[]) : void;
}

export abstract class RamPersistenceBase implements RamPersistence {
    #cartridgeName;
    #bankCount;
    constructor(cartridgeName : string, ramBankCount : number){
        this.#cartridgeName = cartridgeName;
        this.#bankCount = ramBankCount;
    }

    abstract readDataFromStore(cartridgeName : string) : string;
    abstract writeDataToStore(cartridgeName : string, data : string) : void;
    
    loadRamBanks() : Uint8Array[]{
        let banks : Uint8Array[] = [];
        try {
            const bankData = <number[][]>(JSON.parse(this.readDataFromStore(this.#cartridgeName)) || []);
            banks = bankData.map(bank => {
                const newBank = makeBuffer(0x2000);
                newBank.set(bank, 0);
                return newBank;
            });
        } catch (e){}
        while(banks.length < this.#bankCount){
            banks.push(makeBuffer(0x2000));
        }
        return banks;
    }
    saveRamBanks(banks : Uint8Array[]){
        this.writeDataToStore(this.#cartridgeName, JSON.stringify(banks.map(bank => Array.from(bank))));
    }
}