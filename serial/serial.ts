import { Clocked, MemoryMappable } from "../utils.js";

export type callback = () => any;

export default interface Serial extends MemoryMappable, Clocked {
    onTransfer(cb : callback) : void;
}