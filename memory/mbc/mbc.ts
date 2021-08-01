export type MBCSaveRAMCallback = () => void;
export default interface MBC {
    romWrite(addr : number, val : number) : void;
}