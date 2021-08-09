import DummyMemory from "../memory/dummy-memory.js";
import Registers from "./cpu-registers.js";
import CPU from "./cpu.js";

class State {
    input : number;
    expected : number;
    n : boolean;
    h : boolean;
    c : boolean;
    cOut : boolean;
    constructor(input : number, expected : number, n : boolean, h : boolean, c : boolean, cOut : boolean){
        this.input = input;
        this.expected = expected;
        this.n = n;
        this.h = h;
        this.c = c;
        this.cOut = cOut;
    }
}

const memory = new DummyMemory();
memory.write(0, 0x27);

function test(state : State){
    const registers = new Registers();
    registers.A = state.input;
    registers.setFlags(false, state.n, state.h, state.c);
    const cpu = new CPU(memory, registers);
    cpu.tick();
    return [registers.A, registers.flagC];
}

const states : State[] = [];

for(let i = 0x0; i <= 0x9; i++){
    for(let j = 0x0; j <= 0x9; j++){
        const input = (i << 4) | j;
        states.push(new State(input, input, false, false, false, false));
    }
}

for(let i = 0x0; i <= 0x8; i++){
    for(let j = 0xA; j <= 0xF; j++){
        const input = (i << 4) | j;
        const output = (input + 0x06) & 0xFF;
        states.push(new State(input, output, false, false, false, false));
    }
}

for(let i = 0x0; i <= 0x9; i++){
    for(let j = 0x0; j <= 0x3; j++){
        const input = (i << 4) | j;
        const output = (input + 0x06) & 0xFF;
        states.push(new State(input, output, false, true, false, false));
    }
}

for(let i = 0xA; i <= 0xF; i++){
    for(let j = 0x0; j <= 0x9; j++){
        const input = (i << 4) | j;
        const output = (input + 0x60) & 0xFF;
        states.push(new State(input, output, false, false, false, true));
    }
}

for(let i = 0x9; i <= 0xF; i++){
    for(let j = 0xA; j <= 0xF; j++){
        const input = (i << 4) | j;
        const output = (input + 0x66) & 0xFF;
        states.push(new State(input, output, false, false, false, true));
    }
}

for(let i = 0xA; i <= 0xF; i++){
    for(let j = 0x0; j <= 0x3; j++){
        const input = (i << 4) | j;
        const output = (input + 0x66) & 0xFF;
        states.push(new State(input, output, false, true, false, true));
    }
}

for(let i = 0x0; i <= 0x2; i++){
    for(let j = 0x0; j <= 0x9; j++){
        const input = (i << 4) | j;
        const output = (input + 0x60) & 0xFF;
        states.push(new State(input, output, false, false, true, true));
    }
}

for(let i = 0x0; i <= 0x2; i++){
    for(let j = 0xA; j <= 0xF; j++){
        const input = (i << 4) | j;
        const output = (input + 0x66) & 0xFF;
        states.push(new State(input, output, false, false, true, true));
    }
}

for(let i = 0x0; i <= 0x3; i++){
    for(let j = 0x0; j <= 0x3; j++){
        const input = (i << 4) | j;
        const output = (input + 0x66) & 0xFF;
        states.push(new State(input, output, false, true, true, true));
    }
}


// ------------

for(let i = 0x0; i <= 0x9; i++){
    for(let j = 0x0; j <= 0x9; j++){
        const input = (i << 4) | j;
        const output = (input + 0x00) & 0xFF;
        states.push(new State(input, output, true, false, false, false));
    }
}

for(let i = 0x0; i <= 0x8; i++){
    for(let j = 0x6; j <= 0xF; j++){
        const input = (i << 4) | j;
        const output = (input + 0xFA) & 0xFF;
        states.push(new State(input, output, true, true, false, false));
    }
}

for(let i = 0x7; i <= 0xF; i++){
    for(let j = 0x0; j <= 0x9; j++){
        const input = (i << 4) | j;
        const output = (input + 0xA0) & 0xFF;
        states.push(new State(input, output, true, false, true, true));
    }
}

for(let i = 0x6; i <= 0xF; i++){
    for(let j = 0x6; j <= 0xF; j++){
        const input = (i << 4) | j;
        const output = (input + 0x9A) & 0xFF;
        states.push(new State(input, output, true, true, true, true));
    }
}




states.forEach(state => {
    const [result, cOut] = test(state);
    if(result != state.expected){
        console.log("Incorrect result for", state, "result =", result);
    }
    if(cOut != state.cOut){
        console.log("Incorrect cOut for", state, "cOut =", cOut);
    }
    
});