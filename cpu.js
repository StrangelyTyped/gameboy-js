import {primaryGroups, primaryGroupNames, extendedGroups, extendedGroupNames} from "./cpu-opcodes.js";
import registers from "./cpu-registers.js";
import mmu from "./mmu.js";
import {memoryRead16, memoryWrite16, uint8ToInt8} from "./memory-utils.js";
const memory = mmu.memory;




const standardOpcodeRegisterMappingLow3 = [
    "B",
    "C",
    "D",
    "E",
    "H",
    "L",
    null, // HL pointer deref
    "A"
];
function getStandardRegisterLow3(opcode){
    return standardOpcodeRegisterMappingLow3[opcode & 0x7];
}
const standardOpcodeRegisterMappingOther = [
    [
        "B",
        "D",
        "H"
    ],
    [
        "C",
        "E",
        "L",
        "A"
    ]
]
function getStandardRegisterOther(opcode){
    return standardOpcodeRegisterMappingOther[(opcode & 0x8) >> 3][(opcode & 0x30) >> 4];
}

function extendedTick(){
    const opcode = memory[registers.PC++];
    //console.log("Extended opcode", opcode);
    const opcodeGroup = extendedGroups[opcode];
    if(logInstructions){
        console.log("Extended Opcode", opcode, opcodeGroup.name);
    }
    switch(opcodeGroup.groupId){
        // case rotateLeft
        // case rotateLeftPtr
        // case rotateRight
        // case rotateRightPtr
        case extendedGroupNames.rotateLeftCarry:
        {
            const register = getStandardRegisterLow3(opcode);
            let value = registers[register];
            const carry = (value & 0x80) !== 0;
            value = ((value << 1) & 0xFF) | (registers.flagC ? 1 : 0);
            registers[register] = value;
            registers.flagC = carry;
            registers.flagZ = (value === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        // case rotateLeftCarryPtr
        case extendedGroupNames.rotateRightCarry:
        {
            const register = getStandardRegisterLow3(opcode);
            let value = registers[register];
            const carry = (value & 0x01) !== 0;
            value = (value >> 1) | (registers.flagC ? 0x80 : 0x00);
            registers[register] = value;
            registers.flagC = carry;
            registers.flagZ = (value === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        // case rotateRightCarryPtr
        case extendedGroupNames.shiftLeft:
        {
            const register = getStandardRegisterLow3(opcode);
            let value = registers[register];
            const carry = (value & 0x80) !== 0;
            value = ((value << 1) & 0xFF);
            registers[register] = value;
            registers.flagC = carry;
            registers.flagZ = (value === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        // case shiftLeftPtr
        // case shiftRight
        // case shiftRightPtr
        case extendedGroupNames.swap:
        {
            const register = getStandardRegisterLow3(opcode);
            let value = registers[register];
            value = ((value & 0xF) << 4) | ((value & 0xF0) >> 4);
            registers[register] = value;
            registers.flagC = false;
            registers.flagZ = (value === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        // case swapPtr
        case extendedGroupNames.shiftRightLogical:
        {
            const register = getStandardRegisterLow3(opcode);
            let value = registers[register];
            const carry = (value & 0x01) !== 0;
            value = (value >> 1);
            registers[register] = value;
            registers.flagC = carry;
            registers.flagZ = (value === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        // case shiftRightLogicalPtr
        case extendedGroupNames.testBit:
        {
            const bitMask = 1 << ((opcode >> 3) & 0x7);
            registers.flagZ = (registers[getStandardRegisterLow3(opcode)] & bitMask) === 0;
            registers.flagN = false;
            registers.flagH = true;
            break;
        }
        case extendedGroupNames.testBitPtr:
        {
            const bitMask = 1 << ((opcode >> 3) & 0x7);
            registers.flagZ = (memory[registers.HL] & bitMask) === 0;
            registers.flagN = false;
            registers.flagH = true;
            break;
        }
        case extendedGroupNames.resetBit:
        {
            const bitMask = 0xFF ^ (1 << ((opcode >> 3) & 0x7));
            registers[getStandardRegisterLow3(opcode)] &= bitMask;
            break;
        }
        case extendedGroupNames.resetBitPtr:
        {
            const bitMask = 0xFF ^ (1 << ((opcode >> 3) & 0x7));
            memory[registers.HL] &= bitMask;
            break;
        }
        // case setBit
        // case setBitPtr
        default:
            console.warn("Unimplemented extended opcode group", opcodeGroup, opcode);
            throw new Error();
    }

    return opcodeGroup.cycleCount;
}


let logInstructions = false;
function tick(cpuState){
    if(logInstructions){
        console.log("Before", JSON.stringify(registers.values));
    }

    const interrupts = memory[0xFF0F];
    // service interrupts
    if(cpuState.interruptsEnabled && memory[0xFFFF] && interrupts & 0x1F){
        cpuState.awaitingInterrupt = false;
        cpuState.interruptsEnabled = false;
        let jumpTarget;
        if(interrupts & 0x1){
            //vblank
            memory[0xFF0F] = interrupts & 0xFE;
            jumpTarget = 0x40;
            //console.log("Invoking interrupt vblank");
        }else if(interrupts & 0x2){
            //lcd stat
            memory[0xFF0F] = interrupts & 0xFD;
            jumpTarget = 0x48;
            //console.log("Invoking interrupt STAT");
        }else if(interrupts & 0x4){
            //timer
            memory[0xFF0F] = interrupts & 0xFB;
            jumpTarget = 0x50;
            //console.log("Invoking interrupt timer");
        }else if(interrupts & 0x8){
            //serial
            memory[0xFF0F] = interrupts & 0xF7;
            jumpTarget = 0x58;
            //console.log("Invoking interrupt serial");
        }else if(interrupts & 0x10){
            //joypad
            memory[0xFF0F] = interrupts & 0xEF;
            jumpTarget = 0x60;
            //console.log("Invoking interrupt joypad");
        }
        registers.SP -= 2;
        memoryWrite16(registers.SP, registers.PC);
        registers.PC = jumpTarget;
        return 16;
    }

    if(cpuState.awaitingInterrupt){
        return 4;
    }

    const opcode = memory[registers.PC++];
    
    const opcodeGroup = primaryGroups[opcode];

    if(logInstructions){
        console.log("Opcode", opcodeGroup.name, registers.PC);
    }
    // Some opcodes may need to override
    let cycleIncrement = opcodeGroup.cycleCount;
    switch(opcodeGroup.groupId){
        case primaryGroupNames.nop:
            // nop
            break;
        case primaryGroupNames.loadImmediate16ToRegister:
        {
            const immediate = memoryRead16(registers.PC);
            registers.PC += 2;
            switch(opcode){
                case 0x01:
                    registers.BC = immediate;
                    break;
                case 0x11:
                    registers.DE = immediate;
                    break;
                case 0x21:
                    registers.HL = immediate;
                    break;
                case 0x31:
                    registers.SP = immediate;
                    break;
                default:
                    console.warn("unexpected opcode", opcode);
            }
            break;
        }
        case primaryGroupNames.loadRegister8ToPtr:
            switch(opcode){
                case 0x02:
                    memory[registers.BC] = registers.A;
                    break;
                case 0x12:
                    memory[registers.DE] = registers.A;
                    break;
                case 0x22:
                    memory[registers.HL++] = registers.A;
                    break;
                case 0x32:
                    memory[registers.HL--] = registers.A;
                    break;
                case 0x70:
                case 0x71:
                case 0x72:
                case 0x73:
                case 0x74:
                case 0x75:
                case 0x77:
                    memory[registers.HL] = registers[getStandardRegisterLow3(opcode)];
                    break;
                default:
                    console.warn("unexpected opcode", opcode);
            }
            break;
        case primaryGroupNames.incrementRegister16:
        {
            switch(opcode){
                case 0x03:
                    registers.BC++;
                    break;
                case 0x13:
                    registers.DE++;
                    break;
                case 0x23:
                    registers.HL++;
                    break;
                case 0x33:
                    registers.SP++;
                    break;
                default:
                    console.warn("unexpected opcode", opcode);
            }
            break;
        }
        case primaryGroupNames.incrementRegister8:
        {
            const register = getStandardRegisterOther(opcode);
            const prev = registers[register];
            const result = (prev + 1) & 0xFF;
            registers[register] = result;
            registers.flagZ = (result === 0);
            registers.flagN = (false);
            registers.flagH = (prev & 0xf === 0xf);
        
            break;
        }
        case primaryGroupNames.decrementRegister8:
        {
            const register = getStandardRegisterOther(opcode);
            
            const prev = registers[register];
            const result = prev > 0 ? (prev - 1) : 0xFF;
            registers[register] = result;
            registers.flagZ = (result === 0);
            registers.flagN = (true);
            registers.flagH = (false); //TODO: check this
            break;
        }
        case primaryGroupNames.loadImmediate8ToRegister:
        {
            registers[getStandardRegisterOther(opcode)] = memory[registers.PC++];
            break;
        }
        case primaryGroupNames.rotateLeft:
        {
            let value = registers.A;
            const carry = (value & 0x80) !== 0;
            value = ((value << 1) & 0xFF) | (carry ? 1 : 0);
            registers.A = value;
            registers.flagC = carry;
            registers.flagZ = false;
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case primaryGroupNames.loadRegister16ToImmediateAddr:
        {    
            const addr = memoryRead16(registers.PC);
            registers.PC += 2;
            memoryWrite16(addr, registers.SP);
            break;
        }
        case primaryGroupNames.addRegister16ToRegister16:
        {
            let prev;
            switch(opcode){
                case 0x09:
                    prev = registers.BC;
                    break;
                case 0x19:
                    prev = registers.DE;
                    break;
                case 0x29:
                    prev = registers.HL;
                    break;
                case 0x39:
                    prev = registers.SP;
                    break;
                default:
                    console.warn("unexpected opcode", opcode);
            }
            const result = registers.HL + prev;
            registers.HL = result & 0xFFFF;
            registers.flagN = false;
            registers.flagH = false;  //TODO
            registers.flagC = (result > 0xFFFF);
            break;
        }
        case primaryGroupNames.loadPtrToRegister8:
            switch(opcode){
                case 0x0A:
                    registers.A = memory[registers.BC];
                    break;
                case 0x1A:
                    registers.A = memory[registers.DE];
                    break;
                case 0x2A:
                    registers.A = memory[registers.HL++];
                    break;
                case 0x3A:
                    registers.A = memory[registers.HL--];
                    break;
                case 0x46:
                case 0x4E:
                case 0x56:
                case 0x5E:
                case 0x66:
                case 0x6E:
                case 0x7E:
                    registers[getStandardRegisterOther(opcode)] = memory[registers.HL];
                    break;
                default:
                    console.warn("unexpected opcode", opcode);
            }
            break;
        case primaryGroupNames.decrementRegister16:
        {
            switch(opcode){
                case 0x0B:
                    registers.BC = registers.BC ? registers.BC - 1 : 0xFFFF;
                    break;
                case 0x1B:
                    registers.DE = registers.DE ? registers.DE - 1 : 0xFFFF;
                    break;
                case 0x2B:
                    registers.HL = registers.HL ? registers.HL - 1 : 0xFFFF;
                    break;
                case 0x3B:
                    registers.SP = registers.SP ? registers.SP - 1 : 0xFFFF;
                    break;
                default:
                    console.warn("unexpected opcode", opcode);
            }
            break;
        }
        // case RRCA
        // case stop
        case primaryGroupNames.rotateLeftCarry:
        {
            let value = registers.A;
            const carry = (value & 0x80) !== 0;
            value = ((value << 1) & 0xFF) | (registers.flagC ? 1 : 0);
            registers.A = value;
            registers.flagC = carry;
            registers.flagZ = false;
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case primaryGroupNames.relativeJumpSignedImmediate8:
        {
            const offset = uint8ToInt8(memory[registers.PC++]);
            registers.PC += offset;
            break;
        }
        case primaryGroupNames.rotateRightCarry:
        {
            let value = registers.A;
            const carry = (value & 0x01) !== 0;
            value = (value >> 1) | (registers.flagC ? 0x80 : 0x00);
            registers.A = value;
            registers.flagC = carry;
            registers.flagZ = (value === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case primaryGroupNames.relativeJumpFlagSignedImmediate8:
        {
            const offset = uint8ToInt8(memory[registers.PC++]);
            let takeBranch = false;
            switch(opcode){
                case 0x20:
                    takeBranch = !registers.flagZ;
                    break;
                case 0x30:
                    takeBranch = !registers.flagC;
                    break;
                case 0x28:
                    takeBranch = registers.flagZ;
                    break;
                case 0x38:
                    takeBranch = registers.flagC;
                    break;
                default:
                    console.warn("unexpected opcode", opcode);
            }
            if(takeBranch){
                registers.PC += offset;
                cycleIncrement = cycleIncrement[0];
            }else{
                cycleIncrement = cycleIncrement[1];
            }
            break;
        }
        // case DAA
        case primaryGroupNames.bitwiseComplementAccum:
            registers.A ^= 0xFF;
            registers.flagN = true;
            registers.flagH = true;
            break;
        case primaryGroupNames.incrementPtr:
        {
            const prev = memory[registers.HL];
            const result = prev + 1;
            memory[registers.HL] = result & 0xFF;
            registers.flagZ = (result === 0);
            registers.flagH = false; // TODO
            registers.flagN = false;
            break;
        }
        case primaryGroupNames.decrementPtr:
        {
            const prev = memory[registers.HL];
            const result = prev > 0 ? prev - 1 : 0xFF;
            memory[registers.HL] = result;
            registers.flagZ = (result === 0);
            registers.flagH = false; // TODO
            registers.flagN = true;
            break;
        }
        case primaryGroupNames.loadImmediate8ToPtr:
            memory[registers.HL] = memory[registers.PC++];
            break;
        // case SCF
        // case CCF
        case primaryGroupNames.loadRegister8ToRegister8:
            registers[getStandardRegisterOther(opcode)] = registers[getStandardRegisterLow3(opcode)];
            break;
        case primaryGroupNames.halt:
        {
            cpuState.awaitingInterrupt = true;
            break;
        }
        case primaryGroupNames.addRegister8ToAccum:
        {
            const result = registers.A + registers[getStandardRegisterLow3(opcode)]
            registers.A = result & 0xFF;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;  //TODO
            registers.flagC = (result > 0xFF);
            break;
        }
        case primaryGroupNames.addPtrToAccum:
        {
            const prev = registers.A;
            const result = (prev + memory[registers.HL]) & 0xFF;
            registers.A = result;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            registers.flagC = (result > 0xFF);
            break;
        }
        case primaryGroupNames.addCarryRegister8ToAccum:
        {
            const result = registers.A + registers[getStandardRegisterLow3(opcode)] + (registers.flagC ? 1 : 0);
            registers.A = result & 0xFF;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            registers.flagC = (result > 0xFF);
            break;
        }
        // case addCarryPtrToAccum
        case primaryGroupNames.subRegister8FromAccum:
        {
            const result = registers.A - registers[getStandardRegisterLow3(opcode)];
            registers.A = (result < 0 ? result + 0x100 : result);
            registers.flagZ = (result === 0);
            registers.flagN = true;
            registers.flagH = false;
            registers.flagC = (result < 0);
            break;
        }
        case primaryGroupNames.subPtrFromAccum:
        {
            const prev = registers.A;
            const result = prev - memory[registers.HL];
            registers.A = (result < 0 ? result + 0x100 : result);
            registers.flagZ = (result === 0);
            registers.flagN = true;
            registers.flagH = false;
            registers.flagC = (result < 0);
            break;
        }
        // case subCarryRegister8FromAccum
        // case subCarryPtrFromAccum
        case primaryGroupNames.andRegister8WithAccum:
        {
            const result = registers.A & registers[getStandardRegisterLow3(opcode)];
            registers.A = result;
            registers.flagZ = result === 0;
            registers.flagC = false;
            registers.flagH = true;
            registers.flagN = false;
            break;
        }
        case primaryGroupNames.andPtr8WithAccum:
        {
            const result = registers.A & memory[registers.HL];
            registers.A = result;
            registers.flagZ = result === 0;
            registers.flagC = false;
            registers.flagH = true;
            registers.flagN = false;
            break;
        }
        case primaryGroupNames.xorRegister8WithAccum:
        {
            const result = registers.A ^ registers[getStandardRegisterLow3(opcode)];
            registers.A = result;
            registers.flagZ = result === 0;
            registers.flagC = false;
            registers.flagH = false;
            registers.flagN = false;
            break;
        }
        case primaryGroupNames.xorPtrWithAccum:
        {
            const result = registers.A ^ memory[registers.HL];
            registers.A = result;
            registers.flagZ = result === 0;
            registers.flagC = false;
            registers.flagH = false;
            registers.flagN = false;
            break;
        }
        case primaryGroupNames.orRegister8WithAccum:
        {
            const result = registers.A | registers[getStandardRegisterLow3(opcode)];
            registers.A = result;
            registers.flagZ = result === 0;
            registers.flagC = false;
            registers.flagH = false;
            registers.flagN = false;
            break;
        }
        case primaryGroupNames.orPtrWithAccum:
        {
            const result = registers.A | memory[registers.HL];
            registers.A = result;
            registers.flagZ = result === 0;
            registers.flagC = false;
            registers.flagH = false;
            registers.flagN = false;
            break;
        }
        case primaryGroupNames.compareRegister8WithAccum:
        {
            const result = registers.A - registers[getStandardRegisterLow3(opcode)];
            registers.flagZ = result === 0;
            registers.flagN = true;
            registers.flagH = false; //TODO
            registers.flagC = (result < 0);
            break;
        }
        case primaryGroupNames.comparePtrWithAccum:
        {
            const result = registers.A - memory[registers.HL];
            registers.flagZ = result === 0;
            registers.flagN = true;
            registers.flagH = false; //TODO
            registers.flagC = (result < 0);
            break;
        }
        case primaryGroupNames.conditionalReturnFlag:
        {
            let takeBranch = false;
            switch(opcode){
                case 0xC0:
                    takeBranch = !registers.flagZ;
                    break;
                case 0xD0:
                    takeBranch = !registers.flagC;
                    break;
                case 0xC8:
                    takeBranch = registers.flagZ;
                    break;
                case 0xD8:
                    takeBranch = registers.flagC;
                    break;
                default:
                    console.warn("unexpected opcode", opcode);
            }
            if(takeBranch){
                registers.PC = memoryRead16(registers.SP);
                registers.SP += 2;
                cycleIncrement = cycleIncrement[0];
            }else{
                cycleIncrement = cycleIncrement[1];
            }
            break;
        }
        case primaryGroupNames.popStack16:
        {
            const data = memoryRead16(registers.SP);
            switch(opcode){
                case 0xC1:
                    registers.BC = data;
                    break;
                case 0xD1:
                    registers.DE = data;
                    break;
                case 0xE1:
                    registers.HL = data;
                    break;
                case 0xF1:
                    registers.AF = data;
                    break;
            }
            registers.SP += 2;
            break;
        }
        case primaryGroupNames.conditionalJumpFlagImmediate16:
        {
            let takeBranch = false;
            switch(opcode){
                case 0xC2:
                    takeBranch = !registers.flagZ;
                    break;
                case 0xD2:
                    takeBranch = !registers.flagC;
                    break;
                case 0xCA:
                    takeBranch = registers.flagZ;
                    break;
                case 0xDA:
                    takeBranch = registers.flagC;
                    break;
                default:
                    console.warn("unexpected opcode", opcode);
            }
            const jumpTarget = memoryRead16(registers.PC);
            registers.PC += 2;
            if(takeBranch){    
                registers.PC = jumpTarget;
                cycleIncrement = cycleIncrement[0];
            }else{
                cycleIncrement = cycleIncrement[1];
            }
            break;
        }
        case primaryGroupNames.jumpImmediate16:
            registers.PC = memoryRead16(registers.PC);
            break;
        case primaryGroupNames.conditionalCallFlagImmediate16:
        {
            let takeBranch = false;
            switch(opcode){
                case 0xC4:
                    takeBranch = !registers.flagZ;
                    break;
                case 0xD4:
                    takeBranch = !registers.flagC;
                    break;
                case 0xCC:
                    takeBranch = registers.flagZ;
                    break;
                case 0xDC:
                    takeBranch = registers.flagC;
                    break;
                default:
                    console.warn("unexpected opcode", opcode);
            }
            const func = memoryRead16(registers.PC);
            registers.PC += 2;
            if(takeBranch){    
                registers.SP -= 2;
                memoryWrite16(registers.SP, registers.PC);
                registers.PC = func;
                cycleIncrement = cycleIncrement[0];
            }else{
                cycleIncrement = cycleIncrement[1];
            }
            break;
        }
        case primaryGroupNames.pushStack16:
        {
            registers.SP -= 2;
            let data;
            switch(opcode){
                case 0xC5:
                    data = registers.BC;
                    break;
                case 0xD5:
                    data = registers.DE;
                    break;
                case 0xE5:
                    data = registers.HL;
                    break;
                case 0xF5:
                    data = registers.AF;
                    break;
                default:
                    console.warn("unexpected opcode", opcode);
            }
            memoryWrite16(registers.SP, data);
            break;
        }
        case primaryGroupNames.addImmediate8ToAccum:
        {
            const prev = memory[registers.PC++];
            const result = registers.A + prev;
            registers.A = result & 0xFF;
            registers.flagZ = (result === 0);
            registers.flagC = (result > 0xFF);
            registers.flagN = 0;
            registers.flagH = 0; //TODO
            break;
        }
        case primaryGroupNames.reset:
        {
            let targetAddress;
            switch(opcode){
                case 0xC7:
                    targetAddress = 0x00;
                    break;
                case 0xCF:
                    targetAddress = 0x08;
                    break;
                case 0xD7:
                    targetAddress = 0x10;
                    break;
                case 0xDF:
                    targetAddress = 0x18;
                    break;
                case 0xE7:
                    targetAddress = 0x20;
                    break;
                case 0xEF:
                    targetAddress = 0x28;
                    break;
                case 0xF7:
                    targetAddress = 0x30;
                    break;
                case 0xFF:
                    targetAddress = 0x38;
                    break;
                default:
                    console.warn("unexpected opcode", opcode);
            }
            registers.SP -= 2;
            memoryWrite16(registers.SP, registers.PC);
            registers.PC = targetAddress;
            break;
        }
        case primaryGroupNames.return:
            registers.PC = memoryRead16(registers.SP);
            registers.SP += 2;
            if(opcode === 0xD9){
                cpuState.interruptsEnabled = true;
            }
            break;
        case primaryGroupNames.extendedOpcode:
            cycleIncrement = extendedTick();
            break;
        case primaryGroupNames.callImmediate16:
        {
            const func = memoryRead16(registers.PC);
            registers.PC += 2;
            registers.SP -= 2;
            memoryWrite16(registers.SP, registers.PC);
            registers.PC = func;
            break;
        }
        case primaryGroupNames.addCarryImmediate8ToAccum:
        {
            const prev = memory[registers.PC++];
            const result = registers.A + prev + (registers.flagC ? 1 : 0);
            registers.A = result & 0xFF;
            registers.flagZ = (result === 0);
            registers.flagC = (result > 0xFF);
            registers.flagN = false;
            registers.flagH = 0; //TODO
            break;
        }
        case primaryGroupNames.subImmediate8FromAccum:
        {
            const prev = memory[registers.PC++];
            const result = registers.A - prev;
            registers.A = (result < 0 ? result + 0x100 : result);
            registers.flagZ = (result === 0);
            registers.flagC = (result < 0);
            registers.flagN = true;
            registers.flagH = 0; //TODO
            break;
        }
        // case subCarryImmediate8FromAccum
        case primaryGroupNames.ioPortWriteImmediate8:
            memory[0xFF00 + memory[registers.PC++]] = registers.A;
            break;
        case primaryGroupNames.ioPortWriteRegister8:
            memory[0xFF00 + registers.C] = registers.A;
            break;
        case primaryGroupNames.andImmediate8WithAccum:
        {
            const immediate = memory[registers.PC++];
            const result = registers.A & immediate;
            registers.A = result;
            registers.flagZ = (result === 0);
            registers.flagC = false;
            registers.flagN = true;
            registers.flagH = false;
            break;
        }
        // case addImmediate8ToStackPtr
        case primaryGroupNames.jumpPtr:
            registers.PC = registers.HL;
            break;
        case primaryGroupNames.loadRegisterToImmediate16Ptr:
        {
            const addr = memoryRead16(registers.PC);
            registers.PC += 2;
            memory[addr] = registers.A;
            break;
        }
        case primaryGroupNames.xorImmediate8WithAccum:
        {
            const result = registers.A ^ memory[registers.PC++];
            registers.A = result;
            registers.flagZ = result === 0;
            registers.flagC = false;
            registers.flagH = false;
            registers.flagN = false;
            break;
        }
        case primaryGroupNames.ioPortReadImmediate8:
            registers.A = memory[0xFF00 + memory[registers.PC++]];
            break;
        // case ioPortReadRegister8
        case primaryGroupNames.disableInterrupts:
            cpuState.interruptsEnabled = false;
            break;
        case primaryGroupNames.orImmediate8WithAccum:
        {
            const result = registers.A | memory[registers.PC++];
            registers.A = result;
            registers.flagZ = result === 0;
            registers.flagC = false;
            registers.flagH = false;
            registers.flagN = false;
            break;
        }
        case primaryGroupNames.addImmediate8ToStackPtrToRegister16:
        {
            const prev = uint8ToInt8(memory[registers.PC++]);
            const result = registers.SP + prev;
            registers.HL = result < 0 ? result + 0x10000 : result & 0xFFFF;
            registers.flagZ = false;
            registers.flagC = (result > 0xFFFF || result < 0);
            registers.flagN = false;
            registers.flagH = 0; //TODO
            break;
        }
        // case loadRegister16ToStackPtr
        case primaryGroupNames.loadImmediate16PtrToRegister:
            registers.A = memory[memoryRead16(registers.PC)];
            registers.PC += 2;
            break;
        case primaryGroupNames.enableInterrupts:
            cpuState.interruptsEnabled = true;
            break;
        case primaryGroupNames.compareImmediate8WithAccum:
        {
            const result = registers.A - memory[registers.PC++];
            registers.flagZ = (result === 0);
            registers.flagN = true;
            registers.flagH = false; // TODO: verify
            registers.flagC = (result < 0);
            break;
        }
        default:
            console.warn("Unimplemented opcode group", opcodeGroup, opcode);
            throw new Error();
            registers.PC += opcodeGroup.byteCount - 1;
    }
    
    if(Array.isArray(cycleIncrement)){
        console.warn("Conditional cycle count not resolved", opcodeGroup);
        cycleIncrement = cycleIncrement[0];
    }
    return cycleIncrement;
}

class CPU {
    #cpuState;
    constructor(){
        this.#cpuState = {
            awaitingInterrupt: false,
            interruptsEnabled: false,
        };
    }
    tick(){
        return tick(this.#cpuState);
    }
    registerGpuCallbacks(gpu){
        // first arg to each callback is whether the interrupt is enabled on the gpu STAT register
        // since these callbacks trip other things they're dispatched regardless
        gpu.onVblank((gpuInterruptEnabled) =>{
            if(this.#cpuState.interruptsEnabled){
                //vblank interrupt
                if(memory[0xFFFF] & 0x1){
                    memory[0xFF0F] |= 0x1;
                }
                //stat interrupt
                if(gpuInterruptEnabled && memory[0xFFFF] & 0x2){
                    memory[0xFF0F] |= 0x2;
                }
            }
        });
        gpu.onHblank((gpuInterruptEnabled) =>{
            if(gpuInterruptEnabled && this.#cpuState.interruptsEnabled && memory[0xFFFF] & 0x2){
                memory[0xFF0F] |= 0x2;
            }
        });
        gpu.onLyc((gpuInterruptEnabled) =>{
            if(gpuInterruptEnabled && this.#cpuState.interruptsEnabled && memory[0xFFFF] & 0x2){
                memory[0xFF0F] |= 0x2;
            }
        });
        gpu.onOam((gpuInterruptEnabled) =>{
            if(gpuInterruptEnabled && this.#cpuState.interruptsEnabled && memory[0xFFFF] & 0x2){
                memory[0xFF0F] |= 0x2;
            }
        });
    }
}

export default new CPU();