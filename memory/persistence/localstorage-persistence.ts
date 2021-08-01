import { RamPersistence, RamPersistenceBase } from "./ram-persistence.js";

class LocalStorageRamPersistence extends RamPersistenceBase {
    readDataFromStore(cartridgeName : string){
        return window.localStorage.getItem(cartridgeName) || "";
    }
    writeDataToStore(cartridgeName : string, data : string){
        window.localStorage.setItem(cartridgeName, data);
    }
}

export default (cartridgeName : string, ramBankCount : number) => new LocalStorageRamPersistence(cartridgeName, ramBankCount);