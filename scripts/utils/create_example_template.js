const { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun, AlignmentType, ShadingType } = require('docx');
const fs = require('fs');
const path = require('path');

async function createExampleTemplate() {
    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "PRESUPUESTO GENÉRICO (EJEMPLO)",
                            bold: true,
                            size: 36,
                            color: "2E74B5"
                        }),
                    ],
                    heading: "Heading1",
                    alignment: AlignmentType.CENTER
                }),

                new Paragraph({ text: "" }),

                // DATOS CABECERA (DOCXTEMPLATER SYNTAX)
                new Paragraph({
                    children: [
                        new TextRun({ text: "Fecha: ", bold: true }),
                        new TextRun("{fecha}"),
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Cliente: ", bold: true }),
                        new TextRun("{cliente}"),
                    ]
                }),

                new Paragraph({ text: "" }),

                new Paragraph({
                    children: [
                        new TextRun("Vehículo Cotizado: "),
                        new TextRun({ text: "{vehiculo}", bold: true }),
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
                                createHeaderCell("RC"),
                                createHeaderCell("Taller"),
                            ]
                        }),

                        // DATA ROW WITH LOOP {#detalles}...{/detalles}
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph("{#detalles}{compania}")] }),
                                new TableCell({ children: [new Paragraph("{plan}")] }),
                                new TableCell({ children: [new Paragraph("{prima_uf3}")] }),
                                new TableCell({ children: [new Paragraph("{rc}")] }),
                                new TableCell({ children: [new Paragraph("{taller}{/detalles}")] }),
                            ]
                        }),
                    ]
                }),

                new Paragraph({ text: "" }),
                new Paragraph({ text: "Este documento es un ejemplo generado automáticamente compatible con Docxtemplater." }),
            ]
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    const outputPath = path.join(__dirname, 'uploads', 'doc', 'plantilla_ejemplo.docx');

    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(outputPath, buffer);
    console.log("Plantilla ejemplo Docxtemplater generada en:", outputPath);
}

function createHeaderCell(text) {
    return new TableCell({
        children: [new Paragraph({
            children: [new TextRun({ text: text, color: "FFFFFF", bold: true })]
        })],
        shading: {
            fill: "666666",
            type: ShadingType.CLEAR,
            color: "auto",
        }
    });
}

createExampleTemplate().catch(console.error);
