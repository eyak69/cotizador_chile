const { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun, ImageRun, AlignmentType, ShadingType, Header } = require('docx');
const fs = require('fs');
const path = require('path');

// Ruta del logo
const logoPath = 'C:/Users/Cristian/.gemini/antigravity/brain/ebd89c41-c715-4c81-8848-4644d05389ac/uploaded_media_0_1769198102518.png';

async function createTemplate() {
    let logoImage = null;
    try {
        if (fs.existsSync(logoPath)) {
            logoImage = fs.readFileSync(logoPath);
            console.log("Logo encontrado y cargado.");
        } else {
            console.warn("Logo no encontrado en ruta:", logoPath);
        }
    } catch (e) {
        console.warn("Error leyendo logo:", e.message);
    }

    const doc = new Document({
        sections: [{
            children: [
                logoImage ? new Paragraph({
                    children: [
                        new ImageRun({
                            data: logoImage,
                            transformation: { width: 100, height: 100 }
                        })
                    ]
                }) : new Paragraph(""),

                new Paragraph({ text: "" }),

                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Presupuesto de Seguro Automotriz.",
                            bold: true,
                            size: 36,
                            color: "2E74B5"
                        }),
                    ],
                    heading: "Heading1",
                    alignment: AlignmentType.LEFT
                }),

                new Paragraph({ text: "" }),

                // DATOS CABECERA (DOCXTEMPLATER SYNTAX {tag})
                new Paragraph({
                    children: [
                        new TextRun({ text: "Qui un ", bold: true }),
                        new TextRun({ text: "titulo", underline: { type: "single" } }),
                        new TextRun({ text: " X", bold: true }),
                    ]
                }),

                new Paragraph({
                    children: [
                        new TextRun({ text: "Fecha Emisión: ", bold: true }),
                        new TextRun("{fecha}"),
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Estimado/a: ", bold: true }),
                        new TextRun("{cliente}"),
                    ]
                }),

                new Paragraph({ text: "" }),

                new Paragraph({
                    children: [
                        new TextRun("Presentamos a continuación las opciones disponibles para su vehículo "),
                        new TextRun({ text: "{vehiculo}", bold: false }),
                        new TextRun(":"),
                    ]
                }),

                new Paragraph({ text: "" }),

                // TABLA
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        // Header Row
                        new TableRow({
                            children: [
                                createHeaderCell("Compañía"),
                                createHeaderCell("Plan"),
                                createHeaderCell("Deducible 3UF"),
                                createHeaderCell("Resp. Civil"),
                                createHeaderCell("Taller Marca"),
                            ]
                        }),

                        // DATA ROW WITH LOOP
                        // Docxtemplater loop: {#detalles} ... {/detalles}
                        // We put {#detalles} in the first cell and {/detalles} in the last cell of the row
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph("{#detalles}{compania}")] }),
                                new TableCell({ children: [new Paragraph("{plan}")] }),
                                new TableCell({ children: [new Paragraph("{prima_uf3}")] }),
                                new TableCell({ children: [new Paragraph("{rc}")] }),
                                // Last cell closes the loop
                                new TableCell({ children: [new Paragraph("{taller}{/detalles}")] }),
                            ]
                        }),
                    ]
                }),

                new Paragraph({ text: "" }),
                new Paragraph({ text: "Precios sujetos a evaluación final de la compañía aseguradora." }),
            ]
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    const outputPath = path.join(__dirname, 'uploads', 'templates', 'plantilla_presupuesto_fixed.docx');

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(outputPath, buffer);
    console.log("Plantilla Docxtemplater generada en:", outputPath);
}

function createHeaderCell(text) {
    return new TableCell({
        children: [new Paragraph({
            children: [new TextRun({ text: text, color: "FFFFFF", bold: true })]
        })],
        shading: {
            fill: "2E74B5",
            type: ShadingType.CLEAR,
            color: "auto",
        }
    });
}

createTemplate().catch(console.error);
