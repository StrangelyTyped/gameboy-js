import { MemoryMappable } from "../utils.js";

export type callback = (enabledForInterrupt : boolean) => any;

export enum Button {
    Up,
    Down,
    Left,
    Right,
    A,
    B,
    Select,
    Start
};

const buttonMasks = {
    [Button.Up]: 0x10,
    [Button.Down]: 0x10,
    [Button.Left]: 0x10,
    [Button.Right]: 0x10,
    [Button.A]: 0x20,
    [Button.B]: 0x20,
    [Button.Select]: 0x20,
    [Button.Start]: 0x20,
};

export default abstract class JoypadBase implements MemoryMappable {
    #buttonState = {
        [Button.Up]: 0,
        [Button.Down]: 0,
        [Button.Left]: 0,
        [Button.Right]: 0,
        [Button.A]: 0,
        [Button.B]: 0,
        [Button.Select]: 0,
        [Button.Start]: 0,
    };
    #registerFlags = 0;
    #stateFlags = 0;
    #buttonDownHandlers : callback[] = [];

    onButtonDown(handler : callback){
        this.#buttonDownHandlers.push(handler);
    }

    buttonDown(button : Button){
        this.#buttonState[button]++;
        this.#recalculateStateFlags();
        if(this.#buttonState[button] === 1){
            const enabledForInterrupt = (this.#registerFlags & buttonMasks[button]) === 0;
            this.#buttonDownHandlers.forEach(handler => handler(enabledForInterrupt));
        }
    }

    buttonUp(button : Button){
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
            if(this.#buttonState[Button.Start]){
                stateFlags &= 0x7;
            }
            if(this.#buttonState[Button.Select]){
                stateFlags &= 0xB;
            }
            if(this.#buttonState[Button.B]){
                stateFlags &= 0xD;
            }
            if(this.#buttonState[Button.A]){
                stateFlags &= 0xE;
            }
        }
        if((this.#registerFlags & 0x10) === 0){
            //direction buttons
            if(this.#buttonState[Button.Down]){
                stateFlags &= 0x7;
            }
            if(this.#buttonState[Button.Up]){
                stateFlags &= 0xB;
            }
            if(this.#buttonState[Button.Left]){
                stateFlags &= 0xD;
            }
            if(this.#buttonState[Button.Right]){
                stateFlags &= 0xE;
            }
        }
        this.#stateFlags = stateFlags;

    }

    readRegister(addr : number){
        if(addr === 0xFF00){
            return this.#registerFlags | this.#stateFlags;
        } else {
            console.warn("Joypad read unexpected register", addr)
        }
        return 0;
    }
    writeRegister(addr : number, val : number){
        if(addr === 0xFF00){
            this.#registerFlags = (val & 0xF0);
            this.#recalculateStateFlags();
        }else{
            console.warn("Joypad write unexpected register", addr, val)
        }
    }
}

