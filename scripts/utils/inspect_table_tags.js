const fs = require('fs');
const JSZip = require('jszip');

async function inspectTableTags() {
    const filePath = 'uploads/templates/plantilla_presupuesto.docx';
    if (!fs.existsSync(filePath)) {
        console.log("❌ Archivo no encontrado.");
        return;
    }
    const content = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(content);
    const xml = await zip.file("word/document.xml").async("string");

    console.log("---- BÚSQUEDA TAGS TABLA ----");

    // Buscar &FOR o &amp;FOR
    const loopRegex = /(&|&amp;)FOR.*?(&|&amp;)/g;
    const loopMatches = xml.match(loopRegex);
    console.log("Coincidencias de bucle FOR:", loopMatches || "NINGUNA");

    // Buscar contenido de celdas cercanas a "Compañía"
    const ciaIdx = xml.indexOf("Compañía");
    if (ciaIdx !== -1) {
        console.log("Contexto alrededor de 'Compañía' (Header):");
        console.log(xml.substring(ciaIdx, ciaIdx + 300)); // Ver las filas siguientes
    }

    // Buscar ocurrencias de INS
    const insRegex = /(&|&amp;)INS.*?(&|&amp;)/g;
    const insMatches = xml.match(insRegex);
    console.log("Coincidencias de INS:", insMatches ? insMatches.length : 0);
    if (insMatches) console.log("Ejemplos INS:", insMatches.slice(0, 3));
}

inspectTableTags().catch(console.error);
