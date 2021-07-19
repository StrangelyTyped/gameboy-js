const fs = require("fs");

const file = fs.readFileSync(process.argv[2])

process.stdout.write("const data = [");
for(let i = 0; i < file.length; i++){
	process.stdout.write((i === 0 ? "" : ",") + file.readUInt8(i));
}
process.stdout.write("];\nexport default data;\n");
