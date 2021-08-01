import MBC from "./mbc.js";

export default class RomOnlyMbc implements MBC {
    constructor(){}
    romWrite(addr : number, val : number){
        console.warn("ROM Write on RomOnlyMbc", addr, "=", val);
    }
}