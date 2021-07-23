import {primaryGroups, primaryGroupNames, extendedGroups, extendedGroupNames} from "./cpu-opcodes.js";
import registers from "./cpu-registers.js";
import mmu from "./mmu.js";
import {uint8ToInt8} from "./memory-utils.js";

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
    const opcode = mmu.read(registers.PC++);
    //console.log("Extended opcode", opcode);
    const opcodeGroup = extendedGroups[opcode];
    if(logInstructions){
        console.log("Extended Opcode", opcode, opcodeGroup.name);
    }
    switch(opcodeGroup.groupId){
        case extendedGroupNames.rotateLeft:
        {
            const register = getStandardRegisterLow3(opcode);
            const prev = registers[register];
            const carry = (prev & 0x80) !== 0;
            const result = ((prev << 1) & 0xFF) | (carry ? 1 : 0);
            registers[register] = result;
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case extendedGroupNames.rotateLeftPtr:
        {
            const prev = mmu.read(registers.HL);
            const carry = (prev & 0x80) !== 0;
            const result = ((prev << 1) & 0xFF) | (carry ? 1 : 0);
            mmu.write(registers.HL, result);
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case extendedGroupNames.rotateRight:
        {
            const register = getStandardRegisterLow3(opcode);
            const prev = registers[register];
            const carry = (prev & 0x01) !== 0;
            const result = (prev >> 1) | (carry ? 0x80 : 0x00);
            registers[register] = result;
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case extendedGroupNames.rotateRightPtr:
        {
            const prev = mmu.read(registers.HL);
            const carry = (prev & 0x01) !== 0;
            const result = (prev >> 1) | (carry ? 0x80 : 0x00);
            mmu.write(registers.HL, result);
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case extendedGroupNames.rotateLeftCarry:
        {
            const register = getStandardRegisterLow3(opcode);
            const prev = registers[register];
            const carry = (prev & 0x80) !== 0;
            const result = ((prev << 1) & 0xFF) | (registers.flagC ? 1 : 0);
            registers[register] = result;
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case extendedGroupNames.rotateLeftCarryPtr:
        {
            const prev = mmu.read(registers.HL);
            const carry = (prev & 0x80) !== 0;
            const result = ((prev << 1) & 0xFF) | (registers.flagC ? 1 : 0);
            mmu.write(registers.HL, result);
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case extendedGroupNames.rotateRightCarry:
        {
            const register = getStandardRegisterLow3(opcode);
            const prev = registers[register];
            const carry = (prev & 0x01) !== 0;
            const result = (prev >> 1) | (registers.flagC ? 0x80 : 0x00);
            registers[register] = result;
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case extendedGroupNames.rotateRightCarryPtr:
        {
            const prev = mmu.read(registers.HL);
            const carry = (prev & 0x01) !== 0;
            const result = (prev >> 1) | (registers.flagC ? 0x80 : 0x00);
            mmu.write(registers.HL, result);
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case extendedGroupNames.shiftLeft:
        {
            const register = getStandardRegisterLow3(opcode);
            const prev = registers[register];
            const carry = (prev & 0x80) !== 0;
            const result = ((prev << 1) & 0xFF);
            registers[register] = result;
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case extendedGroupNames.shiftLeftPtr:
        {
            const prev = mmu.read(registers.HL);
            const carry = (prev & 0x80) !== 0;
            const result = ((prev << 1) & 0xFF);
            mmu.write(registers.HL, result);
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case extendedGroupNames.shiftRight:
        {
            const register = getStandardRegisterLow3(opcode);
            const prev = registers[register];
            const carry = (prev & 0x01) !== 0;
            const msb = (prev & 0x80);
            const result = ((prev >> 1) & 0xFF) | msb;
            registers[register] = result;
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case extendedGroupNames.shiftRightPtr:
        {
            const prev = mmu.read(registers.HL);
            const carry = (prev & 0x01) !== 0;
            const msb = (prev & 0x80);
            const result = ((prev >> 1) & 0xFF) | msb;
            mmu.write(registers.HL, result);
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case extendedGroupNames.swap:
        {
            const register = getStandardRegisterLow3(opcode);
            const prev = registers[register];
            const result = ((prev & 0xF) << 4) | ((prev & 0xF0) >> 4);
            registers[register] = result;
            registers.flagC = false;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case extendedGroupNames.swapPtr:
        {
            const prev = mmu.read(registers.HL);
            const result = ((prev & 0xF) << 4) | ((prev & 0xF0) >> 4);
            mmu.write(registers.HL, result);
            registers.flagC = false;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case extendedGroupNames.shiftRightLogical:
        {
            const register = getStandardRegisterLow3(opcode);
            const prev = registers[register];
            const carry = (prev & 0x01) !== 0;
            const result = (prev >> 1);
            registers[register] = result;
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case extendedGroupNames.shiftRightLogicalPtr:
        {
            const prev = mmu.read(registers.HL);
            const carry = (prev & 0x01) !== 0;
            const result = (prev >> 1);
            mmu.write(registers.HL, result);
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case extendedGroupNames.testBit:
        {
            const bitMask = 1 << ((opcode >> 3) & 0x7);
            const prev = registers[getStandardRegisterLow3(opcode)]
            registers.flagZ = (prev & bitMask) === 0;
            registers.flagN = false;
            registers.flagH = true;
            break;
        }
        case extendedGroupNames.testBitPtr:
        {
            const bitMask = 1 << ((opcode >> 3) & 0x7);
            registers.flagZ = (mmu.read(registers.HL) & bitMask) === 0;
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
            const prev = mmu.read(registers.HL);
            const result = prev & bitMask;
            mmu.write(registers.HL, result);
            break;
        }
        case extendedGroupNames.setBit:
        {
            const bitMask = (1 << ((opcode >> 3) & 0x7));
            registers[getStandardRegisterLow3(opcode)] |= bitMask;
            break;
        }
        case extendedGroupNames.setBitPtr:
        {
            const bitMask = (1 << ((opcode >> 3) & 0x7));
            const prev = mmu.read(registers.HL);
            const result = prev | bitMask;
            mmu.write(registers.HL, result);
            break;
        }
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

    const interrupts = mmu.read(0xFF0F);
    // service interrupts
    if(cpuState.interruptsEnabled && mmu.read(0xFFFF) && (interrupts & 0x1F)){
        cpuState.awaitingInterrupt = false;
        cpuState.interruptsEnabled = false;
        let jumpTarget;
        if(interrupts & 0x1){
            //vblank
            mmu.write(0xFF0F, interrupts & 0xFE);
            jumpTarget = 0x40;
        }else if(interrupts & 0x2){
            //lcd stat
            mmu.write(0xFF0F, interrupts & 0xFD);
            jumpTarget = 0x48;
        }else if(interrupts & 0x4){
            //timer
            mmu.write(0xFF0F, interrupts & 0xFB);
            jumpTarget = 0x50;
        }else if(interrupts & 0x8){
            //serial
            mmu.write(0xFF0F, interrupts & 0xF7);
            jumpTarget = 0x58;
        }else if(interrupts & 0x10){
            //joypad
            mmu.write(0xFF0F, interrupts & 0xEF);
            jumpTarget = 0x60;
        }
        registers.SP -= 2;
        mmu.write16(registers.SP, registers.PC);
        registers.PC = jumpTarget;
        return 16;
    }

    if(cpuState.awaitingInterrupt){
        return 4;
    }

    const opcode = mmu.read(registers.PC++);
    
    const opcodeGroup = primaryGroups[opcode];

    if(logInstructions){
        console.log("Opcode", opcodeGroup.name, registers.PC);
    }
    // Some opcodes may need to override
    let cycleIncrement = opcodeGroup.cycleCount;
    switch(opcodeGroup.groupId){
        case primaryGroupNames.nop: // NOP
            // nop
            break;
        case primaryGroupNames.loadImmediate16ToRegister:
        {
            const immediate = mmu.read16(registers.PC);
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
                    mmu.write(registers.BC, registers.A);
                    break;
                case 0x12:
                    mmu.write(registers.DE, registers.A);
                    break;
                case 0x22:
                    mmu.write(registers.HL++, registers.A);
                    break;
                case 0x32:
                    mmu.write(registers.HL--, registers.A);
                    break;
                case 0x70:
                case 0x71:
                case 0x72:
                case 0x73:
                case 0x74:
                case 0x75:
                case 0x77:
                    mmu.write(registers.HL, registers[getStandardRegisterLow3(opcode)]);
                    break;
                default:
                    console.warn("unexpected opcode", opcode);
            }
            break;
        case primaryGroupNames.incrementRegister16: // INC nn
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
        case primaryGroupNames.incrementRegister8: // INC n
        {
            const register = getStandardRegisterOther(opcode);
            const prev = registers[register];
            const result = (prev + 1) & 0xFF;
            registers[register] = result;
            registers.flagZ = ((result & 0xFF) === 0);
            registers.flagN = (false);
            registers.flagH = ((prev & 0xF) > (result & 0xF));
        
            break;
        }
        case primaryGroupNames.decrementRegister8: // DEC n
        {
            const register = getStandardRegisterOther(opcode);
            
            const prev = registers[register];
            const result = prev > 0 ? (prev - 1) : 0xFF;
            registers[register] = result;
            registers.flagZ = ((result & 0xFF) === 0);
            registers.flagN = (true);
            registers.flagH = ((prev & 0xF) < (result & 0xF));
            break;
        }
        case primaryGroupNames.loadImmediate8ToRegister:
        {
            registers[getStandardRegisterOther(opcode)] = mmu.read(registers.PC++);
            break;
        }
        case primaryGroupNames.rotateLeft: //RLCA
        {
            const prev = registers.A;
            const carry = (prev & 0x80) !== 0;
            const result = ((prev << 1) & 0xFF) | (carry ? 1 : 0);
            registers.A = result;
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false; // known good
            break;
        }
        case primaryGroupNames.loadRegister16ToImmediateAddr:
        {    
            const addr = mmu.read16(registers.PC);
            registers.PC += 2;
            mmu.write16(addr, registers.SP);
            break;
        }
        case primaryGroupNames.addRegister16ToRegister16: // ADD HL,n
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
            registers.flagH = (prev & 0xFFF) > (result & 0xFFF);
            registers.flagC = (result > 0xFFFF);
            break;
        }
        case primaryGroupNames.loadPtrToRegister8:
            switch(opcode){
                case 0x0A:
                    registers.A = mmu.read(registers.BC);
                    break;
                case 0x1A:
                    registers.A = mmu.read(registers.DE);
                    break;
                case 0x2A:
                    registers.A = mmu.read(registers.HL++);
                    break;
                case 0x3A:
                    registers.A = mmu.read(registers.HL--);
                    break;
                case 0x46:
                case 0x4E:
                case 0x56:
                case 0x5E:
                case 0x66:
                case 0x6E:
                case 0x7E:
                    registers[getStandardRegisterOther(opcode)] = mmu.read(registers.HL);
                    break;
                default:
                    console.warn("unexpected opcode", opcode);
            }
            break;
        case primaryGroupNames.decrementRegister16: // DEC nn
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
        case primaryGroupNames.rotateRight: // RRCA
        {
            const prev = registers.A;
            const carry = (prev & 0x01) !== 0;
            const result = (prev >> 1) | (carry ? 0x80 : 0x00);
            registers.A = result;
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false; // known good
            break;
        }
        // case stop
        case primaryGroupNames.rotateLeftCarry: // RLA
        {
            const prev = registers.A;
            const carry = (prev & 0x80) !== 0;
            const result = ((prev << 1) & 0xFF) | (registers.flagC ? 1 : 0);
            registers.A = result;
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false; // known good
            break;
        }
        case primaryGroupNames.relativeJumpSignedImmediate8:
        {
            const offset = uint8ToInt8(mmu.read(registers.PC++));
            registers.PC += offset;
            break;
        }
        case primaryGroupNames.rotateRightCarry: // RRA
        {
            const prev = registers.A;
            const carry = (prev & 0x01) !== 0;
            const result = (prev >> 1) | (registers.flagC ? 0x80 : 0x00);
            registers.A = result;
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false; // known good
            break;
        }
        case primaryGroupNames.relativeJumpFlagSignedImmediate8:
        {
            const offset = uint8ToInt8(mmu.read(registers.PC++));
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
        case primaryGroupNames.bcdAdjust: // DAA
        {
            let result = registers.A;
            if(registers.flagH || (result & 0xF) > 0x9){
                result = result + (registers.flagN ? -0x6 : 0x6);
            }
            if(registers.flagC || (result & 0xF0) > 0x90){
                result = result + (registers.flagN ? -0x60 : 0x60);
            }
            if((result & 0xF) > 9 || (result & 0xF0) > 0x90){
                console.warn("Bad DAA", registers.A, result & 0xFF, previousOp);
            }
            registers.A = result & 0xFF;
            registers.flagZ = (result & 0xFF) === 0;
            registers.flagH = false; // known good
            registers.flagC = result < 0 || result > 0xFF; // "set or reset according to operation" ?
            break;
        }
        case primaryGroupNames.bitwiseComplementAccum: // CPL
            registers.A ^= 0xFF;
            registers.flagN = true;
            registers.flagH = true; // known good
            break;
        case primaryGroupNames.incrementPtr: // INC n
        {
            const prev = mmu.read(registers.HL);
            const result = prev + 1;
            mmu.write(registers.HL, result & 0xFF);
            registers.flagZ = ((result & 0xFF) === 0);
            registers.flagH = (prev & 0xF) > (result & 0xF);
            registers.flagN = false;
            break;
        }
        case primaryGroupNames.decrementPtr: // DEC n
        {
            const prev = mmu.read(registers.HL);
            const result = prev > 0 ? prev - 1 : 0xFF;
            mmu.write(registers.HL, result);
            registers.flagZ = (result === 0);
            registers.flagH = (prev & 0xF) < (result & 0xF);
            registers.flagN = true;
            break;
        }
        case primaryGroupNames.loadImmediate8ToPtr:
            mmu.write(registers.HL, mmu.read(registers.PC++));
            break;
        case primaryGroupNames.setCarryFlag: // SCF
            registers.flagN = false;
            registers.flagH = false;
            registers.flagC = true;
            break;
        case primaryGroupNames.complementCarryFlag: // CCF
            registers.flagN = false;
            registers.flagH = false;
            registers.flagC = !registers.flagC;
            break;
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
            const prev = registers.A;
            const result = prev + registers[getStandardRegisterLow3(opcode)];
            registers.A = result & 0xFF;
            registers.flagZ = ((result & 0xFF) === 0);
            registers.flagN = false;
            registers.flagH = (prev & 0xF) > (result & 0xF);
            registers.flagC = (result > 0xFF);
            break;
        }
        case primaryGroupNames.addPtrToAccum:
        {
            const prev = registers.A;
            const result = prev + mmu.read(registers.HL);
            registers.A = result & 0xFF;
            registers.flagZ = ((result & 0xFF) === 0);
            registers.flagN = false;
            registers.flagH = (prev & 0xF) > (result & 0xF);
            registers.flagC = (result > 0xFF);
            break;
        }
        case primaryGroupNames.addCarryRegister8ToAccum: // ADC A,n
        {
            const prev = registers.A;
            const result = prev + registers[getStandardRegisterLow3(opcode)] + (registers.flagC ? 1 : 0);
            registers.A = result & 0xFF;
            registers.flagZ = ((result & 0xFF) === 0);
            registers.flagN = false;
            registers.flagH = (prev & 0xF) > (result & 0xF);
            registers.flagC = (result > 0xFF);
            break;
        }
        case primaryGroupNames.addCarryPtrToAccum: // ADC A, n
        {
            const prev = registers.A;
            const result = prev + mmu.read(registers.HL) + (registers.flagC ? 1 : 0);
            registers.A = result & 0xFF;
            registers.flagZ = ((result & 0xFF) === 0);
            registers.flagN = false;
            registers.flagH = (prev & 0xF) > (result & 0xF);
            registers.flagC = (result > 0xFF);
            break;
        }
        case primaryGroupNames.subRegister8FromAccum: // SUB n
        {
            const prev = registers.A;
            const diff = prev - registers[getStandardRegisterLow3(opcode)];
            const result = (diff < 0 ? diff + 0x100 : diff);
            registers.A = result;
            registers.flagZ = (result === 0);
            registers.flagN = true;
            registers.flagH = (prev & 0xF) < (result & 0xF);
            registers.flagC = (diff < 0);
            break;
        }
        case primaryGroupNames.subPtrFromAccum: // SUB n
        {
            const prev = registers.A;
            const diff = prev - mmu.read(registers.HL);
            const result = (diff < 0 ? diff + 0x100 : diff);
            registers.A = result;
            registers.flagZ = (result === 0);
            registers.flagN = true;
            registers.flagH = (prev & 0xF) < (result & 0xF);
            registers.flagC = (diff < 0);
            break;
        }
        case primaryGroupNames.subCarryRegister8FromAccum: // SBC A,n
        {
            const prev = registers.A;
            const diff = prev - (registers[getStandardRegisterLow3(opcode)] + (registers.flagC ? 1 : 0));
            const result = (diff < 0 ? diff + 0x100 : diff);
            registers.A = result;
            registers.flagZ = (result === 0);
            registers.flagN = true;
            registers.flagH = (prev & 0xF) < (result & 0xF);
            registers.flagC = (diff < 0);
            break;
        }
        case primaryGroupNames.subCarryPtrFromAccum: // SBC A,n
        {
            const prev = registers.A;
            const diff = prev - (mmu.read(registers.HL) + (registers.flagC ? 1 : 0));
            const result = (diff < 0 ? diff + 0x100 : diff);
            registers.A = result;
            registers.flagZ = (result === 0);
            registers.flagN = true;
            registers.flagH = (prev & 0xF) < (result & 0xF)
            registers.flagC = (diff < 0);
            break;
        }
        case primaryGroupNames.andRegister8WithAccum: // AND n
        {
            const prev = registers.A;
            const result = prev & registers[getStandardRegisterLow3(opcode)];
            registers.A = result;
            registers.flagZ = result === 0;
            registers.flagC = false;
            registers.flagH = true; // known good
            registers.flagN = false;
            break;
        }
        case primaryGroupNames.andPtr8WithAccum: // AND n
        {
            const prev = registers.A;
            const result = prev & mmu.read(registers.HL);
            registers.A = result;
            registers.flagZ = result === 0;
            registers.flagC = false;
            registers.flagH = true; // known good
            registers.flagN = false;
            break;
        }
        case primaryGroupNames.xorRegister8WithAccum: // XOR n
        {
            const prev = registers.A;
            const result = prev ^ registers[getStandardRegisterLow3(opcode)];
            registers.A = result;
            registers.flagZ = result === 0;
            registers.flagC = false;
            registers.flagH = false; // known good
            registers.flagN = false;
            break;
        }
        case primaryGroupNames.xorPtrWithAccum: // XOR n
        {
            const prev = registers.A;
            const result = prev ^ mmu.read(registers.HL);
            registers.A = result;
            registers.flagZ = result === 0;
            registers.flagC = false;
            registers.flagH = false; // known good
            registers.flagN = false;
            break;
        }
        case primaryGroupNames.orRegister8WithAccum: // OR n
        {
            const prev = registers.A;
            const result = prev | registers[getStandardRegisterLow3(opcode)];
            registers.A = result;
            registers.flagZ = result === 0;
            registers.flagC = false;
            registers.flagH = false; // known good
            registers.flagN = false;
            break;
        }
        case primaryGroupNames.orPtrWithAccum: // OR n
        {
            const prev = registers.A;
            const result = prev | mmu.read(registers.HL);
            registers.A = result;
            registers.flagZ = result === 0;
            registers.flagC = false;
            registers.flagH = false; // known good
            registers.flagN = false;
            break;
        }
        case primaryGroupNames.compareRegister8WithAccum: // CP n
        {
            const prev = registers.A;
            const result = prev - registers[getStandardRegisterLow3(opcode)];
            registers.flagZ = result === 0;
            registers.flagN = true;
            registers.flagH = (prev & 0xF) < (result & 0xF);
            registers.flagC = (result < 0);
            break;
        }
        case primaryGroupNames.comparePtrWithAccum: // CP n
        {
            const prev = registers.A;
            const result = prev - mmu.read(registers.HL);
            registers.flagZ = result === 0;
            registers.flagN = true;
            registers.flagH = (prev & 0xF) < (result & 0xF);
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
                registers.PC = mmu.read16(registers.SP);
                registers.SP += 2;
                cycleIncrement = cycleIncrement[0];
            }else{
                cycleIncrement = cycleIncrement[1];
            }
            break;
        }
        case primaryGroupNames.popStack16:
        {
            const data = mmu.read16(registers.SP);
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
            const jumpTarget = mmu.read16(registers.PC);
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
            registers.PC = mmu.read16(registers.PC);
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
            const func = mmu.read16(registers.PC);
            registers.PC += 2;
            if(takeBranch){    
                registers.SP -= 2;
                mmu.write16(registers.SP, registers.PC);
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
            mmu.write16(registers.SP, data);
            break;
        }
        case primaryGroupNames.addImmediate8ToAccum: // ADD a,n
        {
            const prev = registers.A;
            const result = prev + mmu.read(registers.PC++);
            registers.A = result & 0xFF;
            registers.flagZ = ((result & 0xFF) === 0);
            registers.flagC = (result > 0xFF);
            registers.flagN = false;
            registers.flagH = (prev & 0xF) > (result & 0xF);
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
            mmu.write16(registers.SP, registers.PC);
            registers.PC = targetAddress;
            break;
        }
        case primaryGroupNames.return:
            registers.PC = mmu.read16(registers.SP);
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
            const func = mmu.read16(registers.PC);
            registers.PC += 2;
            registers.SP -= 2;
            mmu.write16(registers.SP, registers.PC);
            registers.PC = func;
            break;
        }
        case primaryGroupNames.addCarryImmediate8ToAccum: // ADC A,n
        {
            const prev = registers.A;
            const result = prev + mmu.read(registers.PC++) + (registers.flagC ? 1 : 0);
            registers.A = result & 0xFF;
            registers.flagZ = ((result & 0xFF) === 0);
            registers.flagC = (result > 0xFF);
            registers.flagN = false;
            registers.flagH = (prev & 0xF) > (result & 0xF);
            break;
        }
        case primaryGroupNames.subImmediate8FromAccum: // SUB n
        {
            const prev = registers.A;
            const diff = prev - mmu.read(registers.PC++);
            const result = (diff < 0 ? diff + 0x100 : diff);
            registers.A = result;
            registers.flagZ = (result === 0);
            registers.flagC = (diff < 0);
            registers.flagN = true;
            registers.flagH = (prev & 0xF) < (result & 0xF);
            break;
        }
        case primaryGroupNames.subCarryImmediate8FromAccum: // SBC A,n
        {
            const prev = registers.A;
            const diff = prev - (mmu.read(registers.PC++) + (registers.flagC ? 1 : 0));
            const result = (diff < 0 ? diff + 0x100 : diff);
            registers.A = result;
            registers.flagZ = (result === 0);
            registers.flagN = true;
            registers.flagH = (prev & 0xF) < (result & 0xF);
            registers.flagC = (diff < 0);
            break;
        }
        case primaryGroupNames.ioPortWriteImmediate8:
            mmu.write(0xFF00 + mmu.read(registers.PC++), registers.A);
            break;
        case primaryGroupNames.ioPortWriteRegister8:
            mmu.write(0xFF00 + registers.C, registers.A);
            break;
        case primaryGroupNames.andImmediate8WithAccum: // AND n
        {
            const prev = registers.A;
            const result = prev & mmu.read(registers.PC++);
            registers.A = result;
            registers.flagZ = (result === 0);
            registers.flagC = false;
            registers.flagN = false;
            registers.flagH = true; // known good 
            break;
        }
        case primaryGroupNames.addImmediate8ToStackPtr:
        {
            const prev = registers.SP;
            const immediate = uint8ToInt8(mmu.read(registers.PC++));
            const result = prev + immediate;
            registers.SP = (result < 0 ? result + 0x10000 : result & 0xFFFF);
            registers.flagZ = false;
            registers.flagN = false;
            registers.flagC = (result < 0) || (result > 0xFFFF);
            registers.flagH = (immediate < 0 ? (prev & 0xF) < (result & 0xF) : (prev & 0xF) > (result & 0xF)); // guessing?
            break;
        }
        case primaryGroupNames.jumpPtr:
            registers.PC = registers.HL;
            break;
        case primaryGroupNames.loadRegisterToImmediate16Ptr:
        {
            const addr = mmu.read16(registers.PC);
            registers.PC += 2;
            mmu.write(addr, registers.A);
            break;
        }
        case primaryGroupNames.xorImmediate8WithAccum: // XOR n
        {
            const prev = registers.A;
            const result = prev ^ mmu.read(registers.PC++);
            registers.A = result;
            registers.flagZ = result === 0;
            registers.flagC = false;
            registers.flagH = false; // known good
            registers.flagN = false;
            break;
        }
        case primaryGroupNames.ioPortReadImmediate8:
            registers.A = mmu.read(0xFF00 + mmu.read(registers.PC++));
            break;
        case primaryGroupNames.ioPortReadRegister8:
            registers.A = mmu.read(0xFF00 + registers.C);
            break;
        case primaryGroupNames.disableInterrupts:
            cpuState.interruptsEnabled = false;
            break;
        case primaryGroupNames.orImmediate8WithAccum: // OR n
        {
            const prev = registers.A;
            const result = prev | mmu.read(registers.PC++);
            registers.A = result;
            registers.flagZ = result === 0;
            registers.flagC = false;
            registers.flagH = false; // known good
            registers.flagN = false;
            break;
        }
        case primaryGroupNames.addImmediate8ToStackPtrToRegister16: // LDHL SP,n
        {
            const prev = registers.SP;
            const sum = prev + uint8ToInt8(mmu.read(registers.PC++));
            const result = sum < 0 ? sum + 0x10000 : sum & 0xFFFF;
            registers.HL = result;
            registers.flagZ = false;
            registers.flagC = (sum > 0xFFFF || sum < 0);
            registers.flagN = false;
            registers.flagH = (prev & 0xF) > (result & 0xF);
            break;
        }
        case primaryGroupNames.loadRegister16ToStackPtr:
            registers.SP = registers.HL;
            break;
        case primaryGroupNames.loadImmediate16PtrToRegister:
            registers.A = mmu.read(mmu.read16(registers.PC));
            registers.PC += 2;
            break;
        case primaryGroupNames.enableInterrupts:
            cpuState.interruptsEnabled = true;
            break;
        case primaryGroupNames.compareImmediate8WithAccum: // CP n
        {
            const prev = registers.A;
            const result = prev - mmu.read(registers.PC++);
            registers.flagZ = (result === 0);
            registers.flagN = true;
            registers.flagH = (prev & 0xF) < (result & 0xF);
            registers.flagC = (result < 0);
            break;
        }
        default:
            console.warn("Unimplemented opcode group", opcodeGroup, opcode);
            throw new Error();
            registers.PC += opcodeGroup.byteCount - 1;
    }
    /*
    if(Array.isArray(cycleIncrement)){
        console.warn("Conditional cycle count not resolved", opcodeGroup);
        cycleIncrement = cycleIncrement[0];
    }*/
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
            //vblank interrupt
            if(mmu.read(0xFFFF) & 0x1){
                mmu.write(0xFF0F, mmu.read(0xFF0F) | 0x1);
            }
            //stat interrupt
            if(gpuInterruptEnabled && mmu.read(0xFFFF) & 0x2){
                mmu.write(0xFF0F, mmu.read(0xFF0F) | 0x2);
            }
        });
        gpu.onHblank((gpuInterruptEnabled) =>{
            if(gpuInterruptEnabled && mmu.read(0xFFFF) & 0x2){
                mmu.write(0xFF0F, mmu.read(0xFF0F) | 0x2);
            }
        });
        gpu.onLyc((gpuInterruptEnabled) =>{
            if(gpuInterruptEnabled && mmu.read(0xFFFF) & 0x2){
                mmu.write(0xFF0F, mmu.read(0xFF0F) | 0x2);
            }
        });
        gpu.onOam((gpuInterruptEnabled) =>{
            if(gpuInterruptEnabled && mmu.read(0xFFFF) & 0x2){
                mmu.write(0xFF0F, mmu.read(0xFF0F) | 0x2);
            }
        });
    }
    registerJoypadCallbacks(joypad){
        joypad.onButtonDown((buttonInterruptEnabled) => {
            if(buttonInterruptEnabled && mmu.read(0xFFFF) & 0x10){
                mmu.write(0xFF0F, mmu.read(0xFF0F) | 0x10);
            }
        });
    }
    registerTimerCallbacks(timer){
        timer.onCounterOverflow(() => {
            if(mmu.read(0xFFFF) & 0x4){
                mmu.write(0xFF0F, mmu.read(0xFF0F) | 0x4);
            }
        });
    }
    registerSerialCallbacks(serial){
        serial.onTransfer(() => {
            if(mmu.read(0xFFFF) & 0x8){
                mmu.write(0xFF0F, mmu.read(0xFF0F) | 0x8);
            }
        });
    }
}

export default new CPU();