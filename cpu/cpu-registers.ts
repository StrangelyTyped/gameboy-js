export enum RegisterNames {
    A,
    B,
    C,
    D,
    E,
    F,
    H,
    L,
    PC,
    SP
}

export default class Registers {
    values = new Array(10).fill(0);

    get A(){
        return this.values[RegisterNames.A];
    }
    set A(val){
        this.values[RegisterNames.A] = val & 0xFF;
    }

    get B(){
        return this.values[RegisterNames.B];
    }
    set B(val){
        this.values[RegisterNames.B] = val & 0xFF;
    }

    get C(){
        return this.values[RegisterNames.C];
    }
    set C(val){
        this.values[RegisterNames.C] = val & 0xFF;
    }

    get D(){
        return this.values[RegisterNames.D];
    }
    set D(val){
        this.values[RegisterNames.D] = val & 0xFF;
    }

    get E(){
        return this.values[RegisterNames.E];
    }
    set E(val){
        this.values[RegisterNames.E] = val & 0xFF;
    }

    get F(){
        return this.values[RegisterNames.F];
    }
    set F(val){
        this.values[RegisterNames.F] = val & 0xF0;
    }

    get H(){
        return this.values[RegisterNames.H];
    }
    set H(val){
        this.values[RegisterNames.H] = val & 0xFF;
    }

    get L(){
        return this.values[RegisterNames.L];
    }
    set L(val){
        this.values[RegisterNames.L] = val & 0xFF;
    }

    get PC(){
        return this.values[RegisterNames.PC];
    }
    set PC(val){
        this.values[RegisterNames.PC] = val & 0xFFFF;
    }

    get SP(){
        return this.values[RegisterNames.SP];
    }
    set SP(val){
        this.values[RegisterNames.SP] = val & 0xFFFF;
    }

    get AF(){
        return (this.values[RegisterNames.A] << 8) | this.values[RegisterNames.F];
    }

    set AF(val){
        this.values[RegisterNames.F] = val & 0xFF;
        this.values[RegisterNames.A] = (val >> 8) & 0xFF;
    }

    get BC(){
        return (this.values[RegisterNames.B] << 8) | this.values[RegisterNames.C];
    }

    set BC(val){
        this.values[RegisterNames.C] = val & 0xFF;
        this.values[RegisterNames.B] = (val >> 8) & 0xFF;
    }

    get DE(){
        return (this.values[RegisterNames.D] << 8) | this.values[RegisterNames.E];
    }

    set DE(val){
        this.values[RegisterNames.E] = val & 0xFF;
        this.values[RegisterNames.D] = (val >> 8) & 0xFF;
    }

    get HL(){
        return (this.values[RegisterNames.H] << 8) | this.values[RegisterNames.L];
    }

    set HL(val){
        this.values[RegisterNames.L] = val & 0xFF;
        this.values[RegisterNames.H] = (val >> 8) & 0xFF;
    }
    
    setFlags(z : boolean | number, n : boolean | number, h : boolean | number, c : boolean | number){
        this.F = (z ? 0x80 : 0x00) |
            (n ? 0x40 : 0x00) | 
            (h ? 0x20 : 0x00) |
            (c ? 0x10 : 0x00);
    }

    get flagZ(){
        return (this.F & 0x80) > 0;
    }
    set flagZ(isSet){
        if(isSet){
            this.F |= 0x80;
        } else {
            this.F &= 0x7F;
        }
    }
    get flagN(){
        return (this.F & 0x40) > 0;
    }
    set flagN(isSet){
        if(isSet){
            this.F |= 0x40;
        } else {
            this.F &= 0xBF;
        }
    }
    get flagH(){
        return (this.F & 0x20) > 0;
    }
    set flagH(isSet){
        if(isSet){
            this.F |= 0x20;
        } else {
            this.F &= 0xDF;
        }
    }
    get flagC(){
        return (this.F & 0x10) > 0;
    }
    set flagC(isSet){
        if(isSet){
            this.F |= 0x10;
        } else {
            this.F &= 0xEF;
        }
    }
};

