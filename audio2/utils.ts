import { Clocked, MemoryMappable } from "../utils.js";


export interface AudioChannel extends MemoryMappable, Clocked {
    getOutputNode() : AudioNode;
    isEnabled() : boolean;
}