const buttonMasks = {
    up: 0x10,
    down: 0x10,
    left: 0x10,
    right: 0x10,
    a: 0x20,
    b: 0x20,
    select: 0x20,
    start: 0x20
}

export default class JoypadBase {
    #buttonState;
    #registerFlags;
    #stateFlags;
    #buttonDownHandlers;
    constructor(){ 
        this.#buttonState = {
            up: 0,
            down: 0,
            left: 0,
            right: 0,
            a: 0,
            b: 0,
            select: 0,
            start: 0,
        }
        this.#registerFlags = 0;
        this.#stateFlags = 0;
        this.#buttonDownHandlers = [];
    }

    onButtonDown(handler){
        this.#buttonDownHandlers.push(handler);
    }

    buttonDown(button){
        this.#buttonState[button]++;
        this.#recalculateStateFlags();
        if(this.#buttonState[button] === 1){
            const enabledForInterrupt = (this.#registerFlags & buttonMasks[button]) === 0;
            this.#buttonDownHandlers.forEach(handler => handler(enabledForInterrupt));
        }
    }

    buttonUp(button){
        // Is possible to load page with button held
        //this.#buttonState[button] = Math.max(0, this.#buttonState[button] - 1);
        this.#buttonState[button] = 0;
        this.#recalculateStateFlags();
    }

    #recalculateStateFlags(){
        // Register reads 0 as pressed for some reason...
        let stateFlags = 0xF;
        if((this.#registerFlags & 0x20) === 0){
            // action buttons
            if(this.#buttonState.start){
                stateFlags &= 0x7;
            }
            if(this.#buttonState.select){
                stateFlags &= 0xB;
            }
            if(this.#buttonState.b){
                stateFlags &= 0xD;
            }
            if(this.#buttonState.a){
                stateFlags &= 0xE;
            }
        }
        if((this.#registerFlags & 0x10) === 0){
            //direction buttons
            if(this.#buttonState.down){
                stateFlags &= 0x7;
            }
            if(this.#buttonState.up){
                stateFlags &= 0xB;
            }
            if(this.#buttonState.left){
                stateFlags &= 0xD;
            }
            if(this.#buttonState.right){
                stateFlags &= 0xE;
            }
        }
        this.#stateFlags = stateFlags;

    }

    readRegister(k){
        if(k === 0xFF00){
            return this.#registerFlags | this.#stateFlags;
        } else {
            console.warn("Joypad read unexpected register", k)
        }
    }
    writeRegister(k, v){
        if(k === 0xFF00){
            this.#registerFlags = (v & 0xF0);
            this.#recalculateStateFlags()

        }else{
            console.warn("Joypad write unexpected register", k, v)
        }
    }
}

