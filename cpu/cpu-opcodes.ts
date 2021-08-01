
enum PrimaryGroupNames {
    nop,
    loadImmediate16ToRegister,
    loadRegister8ToPtr,
    incrementRegister16,
    incrementRegister8,
    decrementRegister8,
    loadImmediate8ToRegister,
    rotateLeft,
    loadRegister16ToImmediateAddr,
    addRegister16ToRegister16,
    loadPtrToRegister8,
    decrementRegister16,
    rotateRight,
    stop,
    rotateLeftCarry,
    relativeJumpSignedImmediate8,
    rotateRightCarry,
    relativeJumpFlagSignedImmediate8,
    bcdAdjust,
    bitwiseComplementAccum,
    incrementPtr,
    decrementPtr,
    loadImmediate8ToPtr,
    setCarryFlag,
    complementCarryFlag,
    loadRegister8ToRegister8,
    halt,
    addRegister8ToAccum,
    addPtrToAccum,
    addCarryRegister8ToAccum,
    addCarryPtrToAccum,
    subRegister8FromAccum,
    subPtrFromAccum,
    subCarryRegister8FromAccum,
    subCarryPtrFromAccum,
    andRegister8WithAccum,
    andPtrWithAccum,
    xorRegister8WithAccum,
    xorPtrWithAccum,
    orRegister8WithAccum,
    orPtrWithAccum,
    compareRegister8WithAccum,
    comparePtrWithAccum,
    conditionalReturnFlag,
    popStack16,
    conditionalJumpFlagImmediate16,
    jumpImmediate16,
    conditionalCallFlagImmediate16,
    pushStack16,
    addImmediate8ToAccum,
    reset,
    return,
    extendedOpcode,
    callImmediate16,
    addCarryImmediate8ToAccum,
    subImmediate8FromAccum,
    subCarryImmediate8FromAccum,
    ioPortWriteImmediate8,
    ioPortWriteRegister8,
    andImmediate8WithAccum,
    addImmediate8ToStackPtr,
    jumpPtr,
    loadRegisterToImmediate16Ptr,
    xorImmediate8WithAccum,
    ioPortReadImmediate8,
    ioPortReadRegister8,
    disableInterrupts,
    orImmediate8WithAccum,
    addImmediate8ToStackPtrToRegister16,
    loadRegister16ToStackPtr,
    loadImmediate16PtrToRegister,
    enableInterrupts,
    compareImmediate8WithAccum,
    undefined
};

enum ExtendedGroupNames {
    rotateLeft,
    rotateLeftPtr,
    rotateRight,
    rotateRightPtr,
    rotateLeftCarry,
    rotateLeftCarryPtr,
    rotateRightCarry,
    rotateRightCarryPtr,
    shiftLeft,
    shiftLeftPtr,
    shiftRight,
    shiftRightPtr,
    swap,
    swapPtr,
    shiftRightLogical,
    shiftRightLogicalPtr,
    testBit,
    testBitPtr,
    resetBit,
    resetBitPtr,
    setBit,
    setBitPtr,
}

class OpcodeGroup {
    byteCount: number;
    cycleCount: number[];
    opcodes: number[];
    groupId: number;
    constructor(groupId : number, byteCount : number, cycleCount : number[], opcodes : number[]){
        this.byteCount = byteCount;
        this.cycleCount = cycleCount;
        this.opcodes = opcodes;
        this.groupId = groupId;
    }
}

const opcodeGroups = [
    new OpcodeGroup(PrimaryGroupNames.nop, 1, [4], [0x00]),
    new OpcodeGroup(PrimaryGroupNames.loadImmediate16ToRegister, 3, [12], [0x01, 0x11, 0x21, 0x31]),
    new OpcodeGroup(PrimaryGroupNames.loadRegister8ToPtr, 1, [8], [0x02, 0x12, 0x22, 0x32, 0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x77]),
    new OpcodeGroup(PrimaryGroupNames.incrementRegister16, 1, [8], [0x03, 0x13, 0x23, 0x33]),
    new OpcodeGroup(PrimaryGroupNames.incrementRegister8, 1, [4], [0x04, 0x14, 0x24, 0x0C, 0x1C, 0x2C, 0x3C]),
    new OpcodeGroup(PrimaryGroupNames.decrementRegister8, 1, [4], [0x05, 0x15, 0x25, 0x0D, 0x1D, 0x2D, 0x3D]),
    new OpcodeGroup(PrimaryGroupNames.loadImmediate8ToRegister, 2, [8], [0x06, 0x16, 0x26, 0x0E, 0x1E, 0x2E, 0x3E]),
    new OpcodeGroup(PrimaryGroupNames.rotateLeft, 1, [4], [0x07]),
    new OpcodeGroup(PrimaryGroupNames.loadRegister16ToImmediateAddr, 3, [20], [0x08]),
    new OpcodeGroup(PrimaryGroupNames.addRegister16ToRegister16, 1, [8], [0x09, 0x19, 0x29, 0x39]),
    new OpcodeGroup(PrimaryGroupNames.loadPtrToRegister8, 1, [8], [0x0A, 0x1A, 0x2A, 0x3A, 0x46, 0x4E, 0x56, 0x5E, 0x66, 0x6E, 0x7E]),
    new OpcodeGroup(PrimaryGroupNames.decrementRegister16, 1, [8], [0x0B, 0x1B, 0x2B, 0x3B]),
    new OpcodeGroup(PrimaryGroupNames.rotateRight, 1, [4], [0x0F]),
    new OpcodeGroup(PrimaryGroupNames.stop, 2, [4], [0x10]),
    new OpcodeGroup(PrimaryGroupNames.rotateLeftCarry, 1, [4], [0x17]),
    new OpcodeGroup(PrimaryGroupNames.relativeJumpSignedImmediate8, 2, [12], [0x18]),
    new OpcodeGroup(PrimaryGroupNames.rotateRightCarry, 1, [4], [0x1F]),
    new OpcodeGroup(PrimaryGroupNames.relativeJumpFlagSignedImmediate8, 2, [12, 8], [0x20, 0x28, 0x30, 0x38]),
    new OpcodeGroup(PrimaryGroupNames.bcdAdjust, 1, [4], [0x27]),
    new OpcodeGroup(PrimaryGroupNames.bitwiseComplementAccum, 1, [4], [0x2F]),
    new OpcodeGroup(PrimaryGroupNames.incrementPtr, 1, [12], [0x34]),
    new OpcodeGroup(PrimaryGroupNames.decrementPtr, 1, [12], [0x35]),
    new OpcodeGroup(PrimaryGroupNames.loadImmediate8ToPtr, 2, [12], [0x36]),
    new OpcodeGroup(PrimaryGroupNames.setCarryFlag, 1, [4], [0x37]),
    new OpcodeGroup(PrimaryGroupNames.complementCarryFlag, 1, [4], [0x3F]),
    new OpcodeGroup(PrimaryGroupNames.loadRegister8ToRegister8, 1, [4], [0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4F,
                                                        0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x57, 0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5F,
                                                        0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x67, 0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6F,
                                                        0x78, 0x79, 0x7A, 0x7B, 0x7C, 0x7D, 0x7F]),
    new OpcodeGroup(PrimaryGroupNames.halt, 1, [4], [0x76]),
    new OpcodeGroup(PrimaryGroupNames.addRegister8ToAccum, 1, [4], [0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x87]),
    new OpcodeGroup(PrimaryGroupNames.addPtrToAccum, 1, [8], [0x86]),
    new OpcodeGroup(PrimaryGroupNames.addCarryRegister8ToAccum, 1, [4], [0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8F]),
    new OpcodeGroup(PrimaryGroupNames.addCarryPtrToAccum, 1, [8], [0x8E]),
    new OpcodeGroup(PrimaryGroupNames.subRegister8FromAccum, 1, [4], [0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x97]),
    new OpcodeGroup(PrimaryGroupNames.subPtrFromAccum, 1, [8], [0x96]),
    new OpcodeGroup(PrimaryGroupNames.subCarryRegister8FromAccum, 1, [4], [0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D, 0x9F]),
    new OpcodeGroup(PrimaryGroupNames.subCarryPtrFromAccum, 1, [8], [0x9E]),
    new OpcodeGroup(PrimaryGroupNames.andRegister8WithAccum, 1, [4], [0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA7]),
    new OpcodeGroup(PrimaryGroupNames.andPtrWithAccum, 1, [8], [0xA6]),
    new OpcodeGroup(PrimaryGroupNames.xorRegister8WithAccum, 1, [4], [0xA8, 0xA9, 0xAA, 0xAB, 0xAC, 0xAD, 0xAF]),
    new OpcodeGroup(PrimaryGroupNames.xorPtrWithAccum, 1, [8], [0xAE]),
    new OpcodeGroup(PrimaryGroupNames.orRegister8WithAccum, 1, [4], [0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB7]),
    new OpcodeGroup(PrimaryGroupNames.orPtrWithAccum, 1, [8], [0xB6]),
    new OpcodeGroup(PrimaryGroupNames.compareRegister8WithAccum, 1, [4], [0xB8, 0xB9, 0xBA, 0xBB, 0xBC, 0xBD, 0xBF]),
    new OpcodeGroup(PrimaryGroupNames.comparePtrWithAccum, 1, [8], [0xBE]),
    new OpcodeGroup(PrimaryGroupNames.conditionalReturnFlag, 1, [20, 8], [0xC0, 0xD0, 0xC8, 0xD8]),
    new OpcodeGroup(PrimaryGroupNames.popStack16, 1, [12], [0xC1, 0xD1, 0xE1, 0xF1]),
    new OpcodeGroup(PrimaryGroupNames.conditionalJumpFlagImmediate16, 3, [16, 12], [0xC2, 0xD2, 0xCA, 0xDA]),
    new OpcodeGroup(PrimaryGroupNames.jumpImmediate16, 3, [16], [0xC3]),
    new OpcodeGroup(PrimaryGroupNames.conditionalCallFlagImmediate16, 3, [24, 12], [0xC4, 0xD4, 0xCC, 0xDC]),
    new OpcodeGroup(PrimaryGroupNames.pushStack16, 1, [16], [0xC5, 0xD5, 0xE5, 0xF5]),
    new OpcodeGroup(PrimaryGroupNames.addImmediate8ToAccum, 2, [8], [0xC6]),
    new OpcodeGroup(PrimaryGroupNames.reset, 1, [16], [0xC7, 0xCF, 0xD7, 0xDF, 0xE7, 0xEF, 0xF7, 0xFF]),
    new OpcodeGroup(PrimaryGroupNames.return, 1, [16], [0xC9, 0xD9]),
    new OpcodeGroup(PrimaryGroupNames.extendedOpcode, 1, [4], [0xCB]),
    new OpcodeGroup(PrimaryGroupNames.callImmediate16, 3, [24], [0xCD]),
    new OpcodeGroup(PrimaryGroupNames.addCarryImmediate8ToAccum, 2, [8], [0xCE]),
    new OpcodeGroup(PrimaryGroupNames.subImmediate8FromAccum, 2, [8], [0xD6]),
    new OpcodeGroup(PrimaryGroupNames.subCarryImmediate8FromAccum, 2, [8], [0xDE]),
    new OpcodeGroup(PrimaryGroupNames.ioPortWriteImmediate8, 2, [12], [0xE0]),
    new OpcodeGroup(PrimaryGroupNames.ioPortWriteRegister8, 1, [12], [0xE2]),
    new OpcodeGroup(PrimaryGroupNames.andImmediate8WithAccum, 2, [8], [0xE6]),
    new OpcodeGroup(PrimaryGroupNames.addImmediate8ToStackPtr, 2, [16], [0xE8]),
    new OpcodeGroup(PrimaryGroupNames.jumpPtr, 1, [4], [0xE9]),
    new OpcodeGroup(PrimaryGroupNames.loadRegisterToImmediate16Ptr, 3, [16], [0xEA]),
    new OpcodeGroup(PrimaryGroupNames.xorImmediate8WithAccum, 2, [8], [0xEE]),
    new OpcodeGroup(PrimaryGroupNames.ioPortReadImmediate8, 2, [12], [0xF0]),
    new OpcodeGroup(PrimaryGroupNames.ioPortReadRegister8, 2, [12], [0xF2]),
    new OpcodeGroup(PrimaryGroupNames.disableInterrupts, 1, [4], [0xF3]),
    new OpcodeGroup(PrimaryGroupNames.orImmediate8WithAccum, 2, [8], [0xF6]),
    new OpcodeGroup(PrimaryGroupNames.addImmediate8ToStackPtrToRegister16, 2, [12], [0xF8]),
    new OpcodeGroup(PrimaryGroupNames.loadRegister16ToStackPtr, 1, [8], [0xF9]),
    new OpcodeGroup(PrimaryGroupNames.loadImmediate16PtrToRegister, 3, [16], [0xFA]),
    new OpcodeGroup(PrimaryGroupNames.enableInterrupts, 1, [4], [0xFB]),
    new OpcodeGroup(PrimaryGroupNames.compareImmediate8WithAccum, 2, [8], [0xFE]),

    new OpcodeGroup(PrimaryGroupNames.undefined, 1, [0], [0xD3, 0xDB, 0xDD, 0xE3, 0xE4, 0xEB, 0xEC, 0xED, 0xF4, 0xFC, 0xFD]),
];
const extendedOpcodeGroups = [
    new OpcodeGroup(ExtendedGroupNames.rotateLeft, 1, [8], [0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x07]),
    new OpcodeGroup(ExtendedGroupNames.rotateLeftPtr, 1, [16], [0x06]),
    new OpcodeGroup(ExtendedGroupNames.rotateRight, 1, [8], [0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0F]),
    new OpcodeGroup(ExtendedGroupNames.rotateRightPtr, 1, [16], [0x0E]),
    new OpcodeGroup(ExtendedGroupNames.rotateLeftCarry, 1, [8], [0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x17]),
    new OpcodeGroup(ExtendedGroupNames.rotateLeftCarryPtr, 1, [16], [0x16]),
    new OpcodeGroup(ExtendedGroupNames.rotateRightCarry, 1, [8], [0x18, 0x19, 0x1A, 0x1B, 0x1C, 0x1D, 0x1F]),
    new OpcodeGroup(ExtendedGroupNames.rotateRightCarryPtr, 1, [16], [0x1E]),
    new OpcodeGroup(ExtendedGroupNames.shiftLeft, 1, [8], [0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x27]),
    new OpcodeGroup(ExtendedGroupNames.shiftLeftPtr, 1, [16], [0x26]),
    new OpcodeGroup(ExtendedGroupNames.shiftRight, 1, [8], [0x28, 0x29, 0x2A, 0x2B, 0x2C, 0x2D, 0x2F]),
    new OpcodeGroup(ExtendedGroupNames.shiftRightPtr, 1, [16], [0x2E]),
    new OpcodeGroup(ExtendedGroupNames.swap, 1, [8], [0x30, 0x31, 0x32, 0x33, 0x34, 0x35, 0x37]),
    new OpcodeGroup(ExtendedGroupNames.swapPtr, 1, [16], [0x36]),
    new OpcodeGroup(ExtendedGroupNames.shiftRightLogical, 1, [8], [0x38, 0x39, 0x3A, 0x3B, 0x3C, 0x3D, 0x3F]),
    new OpcodeGroup(ExtendedGroupNames.shiftRightLogicalPtr, 1, [16], [0x3E]),
    new OpcodeGroup(ExtendedGroupNames.testBit, 1, [8], [
        0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x47, 0x48, 0x49, 0x4A, 0x4B, 0x4C, 0x4D, 0x4F,
        0x50, 0x51, 0x52, 0x53, 0x54, 0x55, 0x57, 0x58, 0x59, 0x5A, 0x5B, 0x5C, 0x5D, 0x5F,
        0x60, 0x61, 0x62, 0x63, 0x64, 0x65, 0x67, 0x68, 0x69, 0x6A, 0x6B, 0x6C, 0x6D, 0x6F,
        0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x77, 0x78, 0x79, 0x7A, 0x7B, 0x7C, 0x7D, 0x7F,
    ]),
    new OpcodeGroup(ExtendedGroupNames.testBitPtr, 1, [16], [0x46, 0x4E, 0x56, 0x5E, 0x66, 0x6E, 0x76, 0x7E]),
    new OpcodeGroup(ExtendedGroupNames.resetBit, 1, [8], [
        0x80, 0x81, 0x82, 0x83, 0x84, 0x85, 0x87, 0x88, 0x89, 0x8A, 0x8B, 0x8C, 0x8D, 0x8F,
        0x90, 0x91, 0x92, 0x93, 0x94, 0x95, 0x97, 0x98, 0x99, 0x9A, 0x9B, 0x9C, 0x9D, 0x9F,
        0xA0, 0xA1, 0xA2, 0xA3, 0xA4, 0xA5, 0xA7, 0xA8, 0xA9, 0xAA, 0xAB, 0xAC, 0xAD, 0xAF,
        0xB0, 0xB1, 0xB2, 0xB3, 0xB4, 0xB5, 0xB7, 0xB8, 0xB9, 0xBA, 0xBB, 0xBC, 0xBD, 0xBF,
    ]),
    new OpcodeGroup(ExtendedGroupNames.resetBitPtr, 1, [16], [0x86, 0x8E, 0x96, 0x9E, 0xA6, 0xAE, 0xB6, 0xBE]),
    new OpcodeGroup(ExtendedGroupNames.setBit, 1, [8], [
        0xC0, 0xC1, 0xC2, 0xC3, 0xC4, 0xC5, 0xC7, 0xC8, 0xC9, 0xCA, 0xCB, 0xCC, 0xCD, 0xCF,
        0xD0, 0xD1, 0xD2, 0xD3, 0xD4, 0xD5, 0xD7, 0xD8, 0xD9, 0xDA, 0xDB, 0xDC, 0xDD, 0xDF,
        0xE0, 0xE1, 0xE2, 0xE3, 0xE4, 0xE5, 0xE7, 0xE8, 0xE9, 0xEA, 0xEB, 0xEC, 0xED, 0xEF,
        0xF0, 0xF1, 0xF2, 0xF3, 0xF4, 0xF5, 0xF7, 0xF8, 0xF9, 0xFA, 0xFB, 0xFC, 0xFD, 0xFF,
    ]),
    new OpcodeGroup(ExtendedGroupNames.setBitPtr, 1, [16], [0xC6, 0xCE, 0xD6, 0xDE, 0xE6, 0xEE, 0xF6, 0xFE]),
];

function buildOpcodeMap(groups : OpcodeGroup[]){
    const opcodeGroupMap : OpcodeGroup[] = [];
    groups.forEach(group => {
        
        group.opcodes.forEach(opcode => {
            if(opcodeGroupMap[opcode]){
                console.warn("Duplicate opcode definition", opcode);
            }
            opcodeGroupMap[opcode] = group;
        });
    });
    return opcodeGroupMap;
}

const opcodeGroupMap = buildOpcodeMap(opcodeGroups);
const extendedOpcodeGroupMap = buildOpcodeMap(extendedOpcodeGroups);


export { 
    opcodeGroupMap as primaryGroups, 
    PrimaryGroupNames,
    extendedOpcodeGroupMap as extendedGroups,
    ExtendedGroupNames,
};


