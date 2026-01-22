const pdf = require('pdf-parse');
const fs = require('fs');

console.log("Type of pdf:", typeof pdf);
console.log("Value of pdf:", pdf);

try {
    const buffer = fs.readFileSync('package.json'); // Just some dummy buffer
    console.log("Testing call...");
    // pdf-parse expects pdf buffer, but calling it should at least not throw "not a function" even if it fails parsing
    if (typeof pdf === 'function') {
        console.log("It is a function!");
    } else if (pdf.default && typeof pdf.default === 'function') {
        console.log("It is a function under .default!");
    } else {
        console.log("It is NOT a function! Keys:", Object.keys(pdf));
    }
} catch (e) {
    console.error("Error:", e);
}
