
export function uint8ToInt8(val){
    return val > 127 ? val - 256 : val;
}