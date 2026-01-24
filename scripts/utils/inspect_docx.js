const fs = require('fs');

try {
    const data = fs.readFileSync('uploads/templates/plantilla_presupuesto.docx');
    const str = data.toString('binary');

    // Buscar patrones +++texto+++
    // En docx, el texto suele estar en XML, y puede estar fragmentado tipo +++</w:t><w:t>texto
    // Pero como lo generamos con 'docx' library en un solo TextRun, debería estar contiguo.

    const regex = /\+\+\+.*?\+\+\+/g;
    // Esto es muy sucio en binario, pero 'document.xml' es texto plano dentro del zip.
    // El zip no comprime mucho los strings cortos a veces.

    // Mejor enfoque: Search for known variables
    const variables = ['fecha', 'cliente', 'vehiculo', 'detalles'];

    console.log("Analizando contenido binario/zip...");

    if (str.includes('document.xml')) {
        console.log("Es un archivo ZIP/DOCX válido.");
    }

    // Como no tengo un unzip, solo reporto si el archivo existe y su tamaño
    console.log("Tamaño:", data.length);

} catch (e) {
    console.error(e);
}
