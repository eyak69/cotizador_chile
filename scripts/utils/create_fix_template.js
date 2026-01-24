const { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun } = require('docx');
const fs = require('fs');
const path = require('path');

async function createTemplate() {
    const doc = new Document({
        sections: [{
            children: [
                new Paragraph({
                    children: [
                        new TextRun({ text: "COTIZACIÓN DE SEGURO", bold: true, size: 32 }),
                    ],
                    alignment: "center"
                }),
                new Paragraph({ text: "" }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Cliente: ", bold: true }),
                        new TextRun("+++INS cliente+++"),
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Fecha: ", bold: true }),
                        new TextRun("+++INS fecha+++"),
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Vehículo: ", bold: true }),
                        new TextRun("+++INS vehiculo+++"),
                    ]
                }),
                new Paragraph({ text: "" }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Compañía", bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Plan", bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "UF 3", bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "UF 5", bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "UF 10", bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Taller", bold: true })] })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "RC", bold: true })] })] }),
                            ]
                        }),
                        // Start Loop Row (will be removed)
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph("+++FOR d IN detalles+++")],
                                    columnSpan: 7
                                })
                            ]
                        }),
                        // Data Row (will be repeated)
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph("+++INS $d.compania+++")] }),
                                new TableCell({ children: [new Paragraph("+++INS $d.plan+++")] }),
                                new TableCell({ children: [new Paragraph("+++INS $d.prima_uf3+++")] }),
                                new TableCell({ children: [new Paragraph("+++INS $d.prima_uf5+++")] }),
                                new TableCell({ children: [new Paragraph("+++INS $d.prima_uf10+++")] }),
                                new TableCell({ children: [new Paragraph("+++INS $d.taller+++")] }),
                                new TableCell({ children: [new Paragraph("+++INS $d.rc+++")] }),
                            ]
                        }),
                        // End Loop Row (will be removed)
                        new TableRow({
                            children: [
                                new TableCell({
                                    children: [new Paragraph("+++END-FOR d+++")],
                                    columnSpan: 7
                                })
                            ]
                        }),
                    ]
                }),
                new Paragraph({ text: "" }),
                new Paragraph({ text: "Observaciones: Precios referenciales sujetos a confirmación." }),
            ]
        }]
    });

    const buffer = await Packer.toBuffer(doc);
    const outputPath = path.join(__dirname, 'uploads', 'templates', 'plantilla_presupuesto.docx');
    fs.writeFileSync(outputPath, buffer);
    console.log("Plantilla generada exitosamente en:", outputPath);
}

createTemplate().catch(console.error);
