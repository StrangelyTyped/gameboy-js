import JoypadBase, {Button} from "./joypad-base.js"

const keyMapping = new Map();
keyMapping.set("ArrowUp", Button.Up);
keyMapping.set("ArrowDown", Button.Down);
keyMapping.set("ArrowLeft", Button.Left);
keyMapping.set("ArrowRight", Button.Right);
keyMapping.set("KeyA", Button.A);
keyMapping.set("KeyB", Button.B);
keyMapping.set("ControlLeft", Button.Select);
keyMapping.set("Space", Button.Start);
keyMapping.set("Enter", Button.Start);


export default class JoypadKeyboard extends JoypadBase {
    constructor(){
        super();
        document.onkeydown = (e) => {
            if(!e.repeat && keyMapping.has(e.code)){
                this.buttonDown(keyMapping.get(e.code));
                e.preventDefault();
                e.stopPropagation();
            }
        };
        document.onkeyup = (e) => {
            if(keyMapping.has(e.code)){
                this.buttonUp(keyMapping.get(e.code));
                e.preventDefault();
                e.stopPropagation();
            }
        };
    }
}
