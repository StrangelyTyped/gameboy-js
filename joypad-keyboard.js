import JoypadBase from "./joypad-base.js"

const keyMapping = {
    "ArrowUp": "up",
    "ArrowDown": "down",
    "ArrowLeft": "left",
    "ArrowRight": "right",
    "KeyA": "a",
    "KeyB": "b",
    "ControlLeft": "select",
    "Space": "start",
    "Enter": "start",
};

export default class JoypadKeyboard extends JoypadBase {
    constructor(){
        super();
        document.onkeydown = (e) => {
            if(!e.repeat && keyMapping.hasOwnProperty(e.code)){
                this.buttonDown(keyMapping[e.code]);
                e.preventDefault();
                e.stopPropagation();
            }
        };
        document.onkeyup = (e) => {
            if(keyMapping.hasOwnProperty(e.code)){
                this.buttonUp(keyMapping[e.code]);
                e.preventDefault();
                e.stopPropagation();
            }
        };
    }
}
