const fs = require('fs');
const path = require('path');

// Intentar requerir jszip desde docx-templates o raíz
let JSZip;
try {
    JSZip = require('jszip');
} catch (e) {
    try {
        JSZip = require('docx-templates/node_modules/jszip');
    } catch (e2) {
        console.log("No se encontró JSZip, no se puede inspeccionar contenido profundo.");
        process.exit(1);
    }
}

async function inspect() {
    const content = fs.readFileSync('uploads/templates/plantilla_presupuesto.docx');
    const zip = await JSZip.loadAsync(content);

    if (zip.file("word/document.xml")) {
        const xml = await zip.file("word/document.xml").async("string");

        console.log("---- BÚSQUEDA DE VARIABLES +++ ----");
        // Regex simple para encontrar +++algo+++
        // A veces XML parte el string: +++</w:t><w:t>algo</w:t><w:t>+++
        // Buscamos "+++"

        const indices = [];
        let i = -1;
        while ((i = xml.indexOf('+++', i + 1)) >= 0) {
            indices.push(i);
        }

        console.log(`Se encontraron ${indices.length} ocurrencias de '+++'.`);

        if (indices.length > 0) {
            console.log("Muestra de contexto XML:");
            console.log(xml.substring(indices[0] - 20, indices[0] + 50));
        }
    } else {
        console.log("No se encontró word/document.xml");
    }
}

inspect().catch(console.error);
