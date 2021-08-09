export default interface Memory  {
    read(addr : number) : number;
    write(addr : number, val : number) : void;
    read16(addr : number) : number;
    write16(addr : number, val : number) : void;
}