import PixelProcessingUnit from "../graphics/ppu.js";
import JoypadBase from "../joypad/joypad-base.js";
import Memory from "../memory/memory.js";
import Serial from "../serial/serial.js";
import Timer from "../timer.js";
import { uint8ToInt8 } from "../utils.js";
import {primaryGroups, PrimaryGroupNames, extendedGroups, ExtendedGroupNames} from "./cpu-opcodes.js";
import Registers, { RegisterNames } from "./cpu-registers.js";

const standardOpcodeRegisterMappingLow3 = [
    RegisterNames.B,
    RegisterNames.C,
    RegisterNames.D,
    RegisterNames.E,
    RegisterNames.H,
    RegisterNames.L,
    null, // HL pointer deref
    RegisterNames.A
];
function getStandardRegisterLow3(opcode : number){
    return <RegisterNames>standardOpcodeRegisterMappingLow3[opcode & 0x7];
}
const standardOpcodeRegisterMappingMid3 = [
    [
        RegisterNames.B,
        RegisterNames.D,
        RegisterNames.H
    ],
    [
        RegisterNames.C,
        RegisterNames.E,
        RegisterNames.L,
        RegisterNames.A
    ]
]
function getStandardRegisterMid3(opcode : number){
    return standardOpcodeRegisterMappingMid3[(opcode & 0x8) >> 3][(opcode & 0x30) >> 4];
}

function extendedTick(registers : Registers, mmu : Memory){
    const opcode = mmu.read(registers.PC++);
    //console.log("Extended opcode", opcode);
    const opcodeGroup = extendedGroups[opcode];

    switch(opcodeGroup.groupId){
        case ExtendedGroupNames.rotateLeft:
        {
            const register = getStandardRegisterLow3(opcode);
            const prev = registers.values[register];
            const carry = (prev & 0x80) !== 0;
            const result = ((prev << 1) & 0xFF) | (carry ? 1 : 0);
            registers.values[register] = result;
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case ExtendedGroupNames.rotateLeftPtr:
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
        case ExtendedGroupNames.rotateRight:
        {
            const register = getStandardRegisterLow3(opcode);
            const prev = registers.values[register];
            const carry = (prev & 0x01) !== 0;
            const result = (prev >> 1) | (carry ? 0x80 : 0x00);
            registers.values[register] = result;
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case ExtendedGroupNames.rotateRightPtr:
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
        case ExtendedGroupNames.rotateLeftCarry:
        {
            const register = getStandardRegisterLow3(opcode);
            const prev = registers.values[register];
            const carry = (prev & 0x80) !== 0;
            const result = ((prev << 1) & 0xFF) | (registers.flagC ? 1 : 0);
            registers.values[register] = result;
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case ExtendedGroupNames.rotateLeftCarryPtr:
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
        case ExtendedGroupNames.rotateRightCarry:
        {
            const register = getStandardRegisterLow3(opcode);
            const prev = registers.values[register];
            const carry = (prev & 0x01) !== 0;
            const result = (prev >> 1) | (registers.flagC ? 0x80 : 0x00);
            registers.values[register] = result;
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case ExtendedGroupNames.rotateRightCarryPtr:
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
        case ExtendedGroupNames.shiftLeft:
        {
            const register = getStandardRegisterLow3(opcode);
            const prev = registers.values[register];
            const carry = (prev & 0x80) !== 0;
            const result = ((prev << 1) & 0xFF);
            registers.values[register] = result;
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case ExtendedGroupNames.shiftLeftPtr:
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
        case ExtendedGroupNames.shiftRight:
        {
            const register = getStandardRegisterLow3(opcode);
            const prev = registers.values[register];
            const carry = (prev & 0x01) !== 0;
            const msb = (prev & 0x80);
            const result = ((prev >> 1) & 0xFF) | msb;
            registers.values[register] = result;
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case ExtendedGroupNames.shiftRightPtr:
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
        case ExtendedGroupNames.swap:
        {
            const register = getStandardRegisterLow3(opcode);
            const prev = registers.values[register];
            const result = ((prev & 0xF) << 4) | ((prev & 0xF0) >> 4);
            registers.values[register] = result;
            registers.flagC = false;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case ExtendedGroupNames.swapPtr:
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
        case ExtendedGroupNames.shiftRightLogical:
        {
            const register = getStandardRegisterLow3(opcode);
            const prev = registers.values[register];
            const carry = (prev & 0x01) !== 0;
            const result = (prev >> 1);
            registers.values[register] = result;
            registers.flagC = carry;
            registers.flagZ = (result === 0);
            registers.flagN = false;
            registers.flagH = false;
            break;
        }
        case ExtendedGroupNames.shiftRightLogicalPtr:
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
        case ExtendedGroupNames.testBit:
        {
            const bitMask = 1 << ((opcode >> 3) & 0x7);
            const prev = registers.values[getStandardRegisterLow3(opcode)]
            registers.flagZ = (prev & bitMask) === 0;
            registers.flagN = false;
            registers.flagH = true;
            break;
        }
        case ExtendedGroupNames.testBitPtr:
        {
            const bitMask = 1 << ((opcode >> 3) & 0x7);
            registers.flagZ = (mmu.read(registers.HL) & bitMask) === 0;
            registers.flagN = false;
            registers.flagH = true;
            break;
        }
        case ExtendedGroupNames.resetBit:
        {
            const bitMask = 0xFF ^ (1 << ((opcode >> 3) & 0x7));
            registers.values[getStandardRegisterLow3(opcode)] &= bitMask;
            break;
        }
        case ExtendedGroupNames.resetBitPtr:
        {
            const bitMask = 0xFF ^ (1 << ((opcode >> 3) & 0x7));
            const prev = mmu.read(registers.HL);
            const result = prev & bitMask;
            mmu.write(registers.HL, result);
            break;
        }
        case ExtendedGroupNames.setBit:
        {
            const bitMask = (1 << ((opcode >> 3) & 0x7));
            registers.values[getStandardRegisterLow3(opcode)] |= bitMask;
            break;
        }
        case ExtendedGroupNames.setBitPtr:
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

    return opcodeGroup.cycleCount[0];
}


function tick(cpuState : CPUState, registers : Registers, mmu : Memory){
    const interrupts = mmu.read(0xFF0F);
    // service interrupts
    if(cpuState.interruptsEnabled && mmu.read(0xFFFF) && (interrupts & 0x1F)){
        cpuState.awaitingInterrupt = false;
        cpuState.interruptsEnabled = false;
        let jumpTarget = 0;
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
        if(jumpTarget){
            registers.SP -= 2;
            mmu.write16(registers.SP, registers.PC);
            registers.PC = jumpTarget;
            return 16;
        }
    }

    if(cpuState.awaitingInterrupt){
        return 4;
    }

    const opcode = mmu.read(registers.PC++);
    
    const opcodeGroup = primaryGroups[opcode];
    // Some opcodes may need to override
    let cycleIncrement = opcodeGroup.cycleCount[0];
    switch(opcodeGroup.groupId){
        case PrimaryGroupNames.nop: // NOP
            // nop
            break;
        case PrimaryGroupNames.loadImmediate16ToRegister:
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
        case PrimaryGroupNames.loadRegister8ToPtr:
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
                    mmu.write(registers.HL, registers.values[getStandardRegisterLow3(opcode)]);
                    break;
                default:
                    console.warn("unexpected opcode", opcode);
            }
            break;
        case PrimaryGroupNames.incrementRegister16: // INC nn
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
        case PrimaryGroupNames.incrementRegister8: // INC n
        {
            const register = getStandardRegisterMid3(opcode);
            const prev = registers.values[register];
            const result = (prev + 1) & 0xFF;
            registers.values[register] = result;
            registers.flagZ = ((result & 0xFF) === 0);
            registers.flagN = (false);
            registers.flagH = ((prev & 0xF) > (result & 0xF));
        
            break;
        }
        case PrimaryGroupNames.decrementRegister8: // DEC n
        {
            const register = getStandardRegisterMid3(opcode);
            
            const prev = registers.values[register];
            const result = prev > 0 ? (prev - 1) : 0xFF;
            registers.values[register] = result;
            registers.flagZ = ((result & 0xFF) === 0);
            registers.flagN = (true);
            registers.flagH = ((prev & 0xF) < (result & 0xF));
            break;
        }
        case PrimaryGroupNames.loadImmediate8ToRegister:
        {
            registers.values[getStandardRegisterMid3(opcode)] = mmu.read(registers.PC++);
            break;
        }
        case PrimaryGroupNames.rotateLeft: //RLCA
        {
            const prev = registers.A;
            const carry = (prev & 0x80) !== 0;
            const result = ((prev << 1) & 0xFF) | (carry ? 1 : 0);
            registers.A = result;
            registers.flagC = carry;
            registers.flagZ = false;
            registers.flagN = false;
            registers.flagH = false; // known good
            break;
        }
        case PrimaryGroupNames.loadRegister16ToImmediateAddr:
        {    
            const addr = mmu.read16(registers.PC);
            registers.PC += 2;
            mmu.write16(addr, registers.SP);
            break;
        }
        case PrimaryGroupNames.addRegister16ToRegister16: // ADD HL,n
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
                    prev = 0;
            }
            const result = registers.HL + prev;
            registers.HL = result & 0xFFFF;
            registers.flagN = false;
            registers.flagH = (prev & 0xFFF) > (result & 0xFFF);
            registers.flagC = (result > 0xFFFF);
            break;
        }
        case PrimaryGroupNames.loadPtrToRegister8:
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
                    registers.values[getStandardRegisterMid3(opcode)] = mmu.read(registers.HL);
                    break;
                default:
                    console.warn("unexpected opcode", opcode);
            }
            break;
        case PrimaryGroupNames.decrementRegister16: // DEC nn
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
        case PrimaryGroupNames.rotateRight: // RRCA
        {
            const prev = registers.A;
            const carry = (prev & 0x01) !== 0;
            const result = (prev >> 1) | (carry ? 0x80 : 0x00);
            registers.A = result;
            registers.flagC = carry;
            registers.flagZ = false;
            registers.flagN = false;
            registers.flagH = false; // known good
            break;
        }
        // case stop
        case PrimaryGroupNames.rotateLeftCarry: // RLA
        {
            const prev = registers.A;
            const carry = (prev & 0x80) !== 0;
            const result = ((prev << 1) & 0xFF) | (registers.flagC ? 1 : 0);
            registers.A = result;
            registers.flagC = carry;
            registers.flagZ = false;
            registers.flagN = false;
            registers.flagH = false; // known good
            break;
        }
        case PrimaryGroupNames.relativeJumpSignedImmediate8:
        {
            const offset = uint8ToInt8(mmu.read(registers.PC++));
            registers.PC += offset;
            break;
        }
        case PrimaryGroupNames.rotateRightCarry: // RRA
        {
            const prev = registers.A;
            const carry = (prev & 0x01) !== 0;
            const result = (prev >> 1) | (registers.flagC ? 0x80 : 0x00);
            registers.A = result;
            registers.flagC = carry;
            registers.flagZ = false;
            registers.flagN = false;
            registers.flagH = false; // known good
            break;
        }
        case PrimaryGroupNames.relativeJumpFlagSignedImmediate8:
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
                cycleIncrement = opcodeGroup.cycleCount[0];
            }else{
                cycleIncrement = opcodeGroup.cycleCount[1];
            }
            break;
        }
        case PrimaryGroupNames.bcdAdjust: // DAA
        {
            let result = registers.A;
            if(registers.flagN){
                if(registers.flagH){
                    result -= 0x6;
                }
                if(registers.flagC){
                    result -= 0x60;
                }
            } else {
                if(registers.flagH || (result & 0xF) > 0x9){
                    result += 0x6;
                }
                if(registers.flagC || (result & 0xFFF0) > 0x90){
                    result += 0x60;
                }
                // flagC is preserved for subtractions
                registers.flagC = registers.flagC || result > 0xFF;
            }
            registers.A = result & 0xFF;
            registers.flagZ = (result & 0xFF) === 0;
            registers.flagH = false; // known good
            break;
        }
        case PrimaryGroupNames.bitwiseComplementAccum: // CPL
            registers.A ^= 0xFF;
            registers.flagN = true;
            registers.flagH = true; // known good
            break;
        case PrimaryGroupNames.incrementPtr: // INC n
        {
            const prev = mmu.read(registers.HL);
            const result = prev + 1;
            mmu.write(registers.HL, result & 0xFF);
            registers.flagZ = ((result & 0xFF) === 0);
            registers.flagH = (prev & 0xF) > (result & 0xF);
            registers.flagN = false;
            break;
        }
        case PrimaryGroupNames.decrementPtr: // DEC n
        {
            const prev = mmu.read(registers.HL);
            const result = prev > 0 ? prev - 1 : 0xFF;
            mmu.write(registers.HL, result);
            registers.flagZ = (result === 0);
            registers.flagH = (prev & 0xF) < (result & 0xF);
            registers.flagN = true;
            break;
        }
        case PrimaryGroupNames.loadImmediate8ToPtr:
            mmu.write(registers.HL, mmu.read(registers.PC++));
            break;
        case PrimaryGroupNames.setCarryFlag: // SCF
            registers.flagN = false;
            registers.flagH = false;
            registers.flagC = true;
            break;
        case PrimaryGroupNames.complementCarryFlag: // CCF
            registers.flagN = false;
            registers.flagH = false;
            registers.flagC = !registers.flagC;
            break;
        case PrimaryGroupNames.loadRegister8ToRegister8:
            registers.values[getStandardRegisterMid3(opcode)] = registers.values[getStandardRegisterLow3(opcode)];
            break;
        case PrimaryGroupNames.halt:
        {
            cpuState.awaitingInterrupt = true;
            break;
        }
        case PrimaryGroupNames.addRegister8ToAccum:
        {
            const prev = registers.A;
            const result = prev + registers.values[getStandardRegisterLow3(opcode)];
            registers.A = result & 0xFF;
            registers.flagZ = ((result & 0xFF) === 0);
            registers.flagN = false;
            registers.flagH = (prev & 0xF) > (result & 0xF);
            registers.flagC = (result > 0xFF);
            break;
        }
        case PrimaryGroupNames.addPtrToAccum:
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
        case PrimaryGroupNames.addCarryRegister8ToAccum: // ADC A,n
        {
            const prev = registers.A;
            const add = registers.values[getStandardRegisterLow3(opcode)];
            const result = prev + add + (registers.flagC ? 1 : 0);
            registers.A = result & 0xFF;
            registers.flagZ = ((result & 0xFF) === 0);
            registers.flagN = false;
            registers.flagH = (prev & 0xF) + (add & 0xF) + (registers.flagC ? 1 : 0) > 0xF;
            registers.flagC = (result > 0xFF);
            break;
        }
        case PrimaryGroupNames.addCarryPtrToAccum: // ADC A, n
        {
            const prev = registers.A;
            const add = mmu.read(registers.HL);
            const result = prev + add + (registers.flagC ? 1 : 0);
            registers.A = result & 0xFF;
            registers.flagZ = ((result & 0xFF) === 0);
            registers.flagN = false;
            registers.flagH = (prev & 0xF) + (add & 0xF) + (registers.flagC ? 1 : 0) > 0xF;
            registers.flagC = (result > 0xFF);
            break;
        }
        case PrimaryGroupNames.subRegister8FromAccum: // SUB n
        {
            const prev = registers.A;
            const diff = prev - registers.values[getStandardRegisterLow3(opcode)];
            const result = (diff < 0 ? diff + 0x100 : diff);
            registers.A = result;
            registers.flagZ = (result === 0);
            registers.flagN = true;
            registers.flagH = (prev & 0xF) < (result & 0xF);
            registers.flagC = (diff < 0);
            break;
        }
        case PrimaryGroupNames.subPtrFromAccum: // SUB n
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
        case PrimaryGroupNames.subCarryRegister8FromAccum: // SBC A,n
        {
            const prev = registers.A;
            const sub = registers.values[getStandardRegisterLow3(opcode)];
            const diff = prev - (sub + (registers.flagC ? 1 : 0));
            const result = (diff < 0 ? diff + 0x100 : diff);
            registers.A = result;
            registers.flagZ = (result === 0);
            registers.flagN = true;
            registers.flagH = (prev & 0xF) - ((sub & 0xF) + (registers.flagC ? 1 : 0)) < 0;
            registers.flagC = (diff < 0);
            break;
        }
        case PrimaryGroupNames.subCarryPtrFromAccum: // SBC A,n
        {
            const prev = registers.A;
            const sub = mmu.read(registers.HL);
            const diff = prev - (sub + (registers.flagC ? 1 : 0));
            const result = (diff < 0 ? diff + 0x100 : diff);
            registers.A = result;
            registers.flagZ = (result === 0);
            registers.flagN = true;
            registers.flagH = (prev & 0xF) - ((sub & 0xF) + (registers.flagC ? 1 : 0)) < 0;
            registers.flagC = (diff < 0);
            break;
        }
        case PrimaryGroupNames.andRegister8WithAccum: // AND n
        {
            const prev = registers.A;
            const result = prev & registers.values[getStandardRegisterLow3(opcode)];
            registers.A = result;
            registers.flagZ = result === 0;
            registers.flagC = false;
            registers.flagH = true; // known good
            registers.flagN = false;
            break;
        }
        case PrimaryGroupNames.andPtrWithAccum: // AND n
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
        case PrimaryGroupNames.xorRegister8WithAccum: // XOR n
        {
            const prev = registers.A;
            const result = prev ^ registers.values[getStandardRegisterLow3(opcode)];
            registers.A = result;
            registers.flagZ = result === 0;
            registers.flagC = false;
            registers.flagH = false; // known good
            registers.flagN = false;
            break;
        }
        case PrimaryGroupNames.xorPtrWithAccum: // XOR n
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
        case PrimaryGroupNames.orRegister8WithAccum: // OR n
        {
            const prev = registers.A;
            const result = prev | registers.values[getStandardRegisterLow3(opcode)];
            registers.A = result;
            registers.flagZ = result === 0;
            registers.flagC = false;
            registers.flagH = false; // known good
            registers.flagN = false;
            break;
        }
        case PrimaryGroupNames.orPtrWithAccum: // OR n
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
        case PrimaryGroupNames.compareRegister8WithAccum: // CP n
        {
            const prev = registers.A;
            const result = prev - registers.values[getStandardRegisterLow3(opcode)];
            registers.flagZ = result === 0;
            registers.flagN = true;
            registers.flagH = (prev & 0xF) < (result & 0xF);
            registers.flagC = (result < 0);
            break;
        }
        case PrimaryGroupNames.comparePtrWithAccum: // CP n
        {
            const prev = registers.A;
            const result = prev - mmu.read(registers.HL);
            registers.flagZ = result === 0;
            registers.flagN = true;
            registers.flagH = (prev & 0xF) < (result & 0xF);
            registers.flagC = (result < 0);
            break;
        }
        case PrimaryGroupNames.conditionalReturnFlag:
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
                cycleIncrement = opcodeGroup.cycleCount[0];
            }else{
                cycleIncrement = opcodeGroup.cycleCount[1];
            }
            break;
        }
        case PrimaryGroupNames.popStack16:
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
                    registers.AF = data & 0xFFF0;
                    break;
            }
            registers.SP += 2;
            break;
        }
        case PrimaryGroupNames.conditionalJumpFlagImmediate16:
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
                cycleIncrement = opcodeGroup.cycleCount[0];
            }else{
                cycleIncrement = opcodeGroup.cycleCount[1];
            }
            break;
        }
        case PrimaryGroupNames.jumpImmediate16:
            registers.PC = mmu.read16(registers.PC);
            break;
        case PrimaryGroupNames.conditionalCallFlagImmediate16:
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
                cycleIncrement = opcodeGroup.cycleCount[0];
            }else{
                cycleIncrement = opcodeGroup.cycleCount[1];
            }
            break;
        }
        case PrimaryGroupNames.pushStack16:
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
                    data = 0;
            }
            mmu.write16(registers.SP, data);
            break;
        }
        case PrimaryGroupNames.addImmediate8ToAccum: // ADD a,n
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
        case PrimaryGroupNames.reset:
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
                    targetAddress = 0x00;
            }
            registers.SP -= 2;
            mmu.write16(registers.SP, registers.PC);
            registers.PC = targetAddress;
            break;
        }
        case PrimaryGroupNames.return:
            registers.PC = mmu.read16(registers.SP);
            registers.SP += 2;
            if(opcode === 0xD9){
                cpuState.interruptsEnabled = true;
            }
            break;
        case PrimaryGroupNames.extendedOpcode:
            cycleIncrement += extendedTick(registers, mmu);
            break;
        case PrimaryGroupNames.callImmediate16:
        {
            const func = mmu.read16(registers.PC);
            registers.PC += 2;
            registers.SP -= 2;
            mmu.write16(registers.SP, registers.PC);
            registers.PC = func;
            break;
        }
        case PrimaryGroupNames.addCarryImmediate8ToAccum: // ADC A,n
        {
            const prev = registers.A;
            const add = mmu.read(registers.PC++);
            const result = prev + add + (registers.flagC ? 1 : 0);
            registers.A = result & 0xFF;
            registers.flagZ = ((result & 0xFF) === 0);
            registers.flagN = false;
            registers.flagH = (prev & 0xF) + (add & 0xF) + (registers.flagC ? 1 : 0) > 0xF;
            registers.flagC = (result > 0xFF);

            break;
        }
        case PrimaryGroupNames.subImmediate8FromAccum: // SUB n
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
        case PrimaryGroupNames.subCarryImmediate8FromAccum: // SBC A,n
        {
            const prev = registers.A;
            const sub = mmu.read(registers.PC++);
            const diff = prev - (sub + (registers.flagC ? 1 : 0));
            const result = (diff < 0 ? diff + 0x100 : diff);
            registers.A = result;
            registers.flagZ = (result === 0);
            registers.flagN = true;
            registers.flagH = (prev & 0xF) - ((sub & 0xF) + (registers.flagC ? 1 : 0)) < 0;
            registers.flagC = (diff < 0);
            break;
        }
        case PrimaryGroupNames.ioPortWriteImmediate8:
            mmu.write(0xFF00 + mmu.read(registers.PC++), registers.A);
            break;
        case PrimaryGroupNames.ioPortWriteRegister8:
            mmu.write(0xFF00 + registers.C, registers.A);
            break;
        case PrimaryGroupNames.andImmediate8WithAccum: // AND n
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
        case PrimaryGroupNames.addImmediate8ToStackPtr:
        {
            const prev = registers.SP;
            const arg = mmu.read(registers.PC++);
            const immediate = uint8ToInt8(arg);
            const result = prev + immediate;
            registers.SP = (result < 0 ? result + 0x10000 : result & 0xFFFF);
            registers.flagZ = false;
            registers.flagN = false;
            registers.flagC = (prev & 0xFF) + (arg & 0xFF) > 0xFF;
            registers.flagH = (prev & 0xF) + (arg & 0xF) > 0xF;
            break;
        }
        case PrimaryGroupNames.jumpPtr:
            registers.PC = registers.HL;
            break;
        case PrimaryGroupNames.loadRegisterToImmediate16Ptr:
        {
            const addr = mmu.read16(registers.PC);
            registers.PC += 2;
            mmu.write(addr, registers.A);
            break;
        }
        case PrimaryGroupNames.xorImmediate8WithAccum: // XOR n
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
        case PrimaryGroupNames.ioPortReadImmediate8:
            registers.A = mmu.read(0xFF00 + mmu.read(registers.PC++));
            break;
        case PrimaryGroupNames.ioPortReadRegister8:
            registers.A = mmu.read(0xFF00 + registers.C);
            break;
        case PrimaryGroupNames.disableInterrupts:
            cpuState.interruptsEnabled = false;
            break;
        case PrimaryGroupNames.orImmediate8WithAccum: // OR n
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
        case PrimaryGroupNames.addImmediate8ToStackPtrToRegister16: // LDHL SP,n
        {
            const prev = registers.SP;
            const arg = mmu.read(registers.PC++);
            const sum = prev + uint8ToInt8(arg);
            const result = sum < 0 ? sum + 0x10000 : sum & 0xFFFF;
            registers.HL = result;
            registers.flagZ = false;
            registers.flagC = (prev & 0xFF) + (arg & 0xFF )> 0xFF;
            registers.flagN = false;
            registers.flagH = (prev & 0xF) + (arg & 0xF) > 0xF;
            break;
        }
        case PrimaryGroupNames.loadRegister16ToStackPtr:
            registers.SP = registers.HL;
            break;
        case PrimaryGroupNames.loadImmediate16PtrToRegister:
            registers.A = mmu.read(mmu.read16(registers.PC));
            registers.PC += 2;
            break;
        case PrimaryGroupNames.enableInterrupts:
            cpuState.interruptsEnabled = true;
            break;
        case PrimaryGroupNames.compareImmediate8WithAccum: // CP n
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
    }
    /*
    if(Array.isArray(cycleIncrement)){
        console.warn("Conditional cycle count not resolved", opcodeGroup);
        cycleIncrement = cycleIncrement[0];
    }*/
    return cycleIncrement;
}

class CPUState {
    awaitingInterrupt = false;
    interruptsEnabled = false;
}

export default class CPU {
    #cpuState = new CPUState();
    #registers;
    #mmu;
    constructor(mmu : Memory, registers : Registers){
        this.#mmu = mmu;
        this.#registers = registers;
    }
    
    tick(){
        return tick(this.#cpuState, this.#registers, this.#mmu);
    }

    #notifyInterrupt(interruptMask : number){
        if(this.#mmu.read(0xFFFF) & interruptMask){
            this.#mmu.write(0xFF0F, this.#mmu.read(0xFF0F) | interruptMask);
            this.#cpuState.awaitingInterrupt = false;
        }
    }

    registerGpuCallbacks(gpu : PixelProcessingUnit){
        // first arg to each callback is whether the interrupt is enabled on the gpu STAT register
        // since these callbacks trip other things they're dispatched regardless
        gpu.onVblank((gpuInterruptEnabled) =>{
            //vblank interrupt
            this.#notifyInterrupt(0x1);
            
            //stat interrupt
            if(gpuInterruptEnabled){
                this.#notifyInterrupt(0x2);
            }
        });
        gpu.onHblank((gpuInterruptEnabled) =>{
            if(gpuInterruptEnabled){
                this.#notifyInterrupt(0x2);
            }
        });
        gpu.onLyc((gpuInterruptEnabled) =>{
            if(gpuInterruptEnabled){
                this.#notifyInterrupt(0x2);
            }
        });
        gpu.onOam((gpuInterruptEnabled) =>{
            if(gpuInterruptEnabled){
                this.#notifyInterrupt(0x2);
            }
        });
    }
    registerJoypadCallbacks(joypad : JoypadBase){
        joypad.onButtonDown((buttonInterruptEnabled) => {
            if(buttonInterruptEnabled){
                this.#notifyInterrupt(0x10);
            }
        });
    }
    registerTimerCallbacks(timer : Timer){
        timer.onCounterOverflow(() => {
            this.#notifyInterrupt(0x4);
        });
    }
    registerSerialCallbacks(serial : Serial){
        serial.onTransfer(() => {
            this.#notifyInterrupt(0x8);
        });
    }
}
