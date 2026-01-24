const { readPdf } = require('./pdf_processor');
const { interpretQuoteData } = require('./ai_interpreter');
const fs = require('fs');
const path = require('path');

async function main() {
    const pdfPath = process.argv[2];

    if (!pdfPath) {
        console.log('Uso: node index.js <ruta_al_pdf>');
        process.exit(1);
    }

    try {
        console.log(`Leyendo archivo PDF: ${pdfPath}...`);
        const text = await readPdf(pdfPath);

        console.log('Texto extraído con éxito. Analizando con IA...');
        const quoteData = await interpretQuoteData(text);

        console.log('\n--- Cotización Generada ---');
        console.log(JSON.stringify(quoteData, null, 2));

        const outputPath = path.join(__dirname, 'cotizacion_generada.json');
        fs.writeFileSync(outputPath, JSON.stringify(quoteData, null, 2));
        console.log(`\nArchivo JSON guardado en: ${outputPath}`);

    } catch (error) {
        console.error('Ocurrió un error:', error.message);
    }
}

main();
