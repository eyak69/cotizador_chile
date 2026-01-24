const fs = require('fs');
const JSZip = require('jszip');

async function listTags() {
    const filePath = 'uploads/templates/plantilla_presupuesto.docx';
    if (!fs.existsSync(filePath)) {
        console.log("❌ Archivo no encontrado.");
        return;
    }
    const content = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(content);

    // Regex para capturar contenido entre & un poco más permisivo pero sin XML tags anidados si es posible
    // Si hay xml en medio: &<tag>nombre</tag>& -> queremos "nombre"
    // Pero si usamos .async("text") en vez de "string" JSZip nos da texto plano.

    const text = await zip.file("word/document.xml").async("text");
    console.log("---- TEXTO PLANO DEL DOC ----");

    // Buscar tags Docxtemplater {tag} o {{tag}}
    const regexText = /\{{1,2}.*?\}{1,2}/g;
    let m;
    const found = [];
    while ((m = regexText.exec(text)) !== null) {
        if (m[0].length < 100) found.push(m[0]);
    }
    console.log("Tags encontrados:", found);

    // Buscar específicamente 'nombre_array' del error y 'detalles'
    console.log("'nombre_array' encontrado:", text.includes("nombre_array") ? "SÍ" : "NO");
    console.log("'detalles' encontrado:", text.includes("detalles") ? "SÍ" : "NO");
    console.log("'compania' encontrado:", text.includes("compania") ? "SÍ" : "NO");
}

listTags().catch(console.error);
