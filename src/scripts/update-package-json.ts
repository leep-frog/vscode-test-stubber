import { readFileSync, writeFileSync } from 'fs';
import { argv } from 'process';

const packageJson = readFileSync("package.json").toString().split("\n");
const newValue = argv[2];

const mainRegex = /^(\s*"main": )"(.*)",$/;

const newJson = packageJson.map(line => line.replace(mainRegex, `$1"${newValue}",`)).join("\n");

writeFileSync("package.json", newJson);
