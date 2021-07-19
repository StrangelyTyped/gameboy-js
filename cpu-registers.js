
const registerNames = {
    A: 0,
    B: 1,
    C: 2,
    D: 3,
    E: 4,
    F: 5,
    H: 6,
    L: 7,
    SP: 8,
    PC: 9
};

const registerNames16 = {
    AF: [registerNames.A, registerNames.F],
    BC: [registerNames.B, registerNames.C],
    DE: [registerNames.D, registerNames.E],
    HL: [registerNames.H, registerNames.L]
}

const registers = {
    values: new Array(10).fill(0),

    get flagZ(){
        return (this.F & 0x80) > 0;
    },
    set flagZ(isSet){
        if(isSet){
            this.F |= 0x80;
        } else {
            this.F &= 0x7F;
        }
    },
    get flagN(){
        return (this.F & 0x40) > 0;
    },
    set flagN(isSet){
        if(isSet){
            this.F |= 0x40;
        } else {
            this.F &= 0xBF;
        }
    },
    get flagH(){
        return (this.F & 0x20) > 0;
    },
    set flagH(isSet){
        if(isSet){
            this.F |= 0x20;
        } else {
            this.F &= 0xDF;
        }
    },
    get flagC(){
        return (this.F & 0x10) > 0;
    },
    set flagC(isSet){
        if(isSet){
            this.F |= 0x10;
        } else {
            this.F &= 0xEF;
        }
    },
};

Object.entries(registerNames).forEach(([name, idx]) => {
    Object.defineProperty(registers, name, {
        get: () => registers.values[idx],
        set: (val) => registers.values[idx] = val
    });
});
Object.entries(registerNames16).forEach(([name, [idxHi, idxLo]]) => {
    Object.defineProperty(registers, name, {
        get: () => (registers.values[idxHi] << 8) + registers.values[idxLo],
        set: (val) => {
            registers.values[idxLo] = val & 0xFF;
            registers.values[idxHi] = (val >> 8) & 0xFF;
        }
    });
});

export default registers;