const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, Header } = require('docx');

const createTemplate = async () => {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "[TU LOGO AQUÍ]",
                            color: "888888",
                            bold: true,
                            size: 24,
                        }),
                    ],
                    spacing: { after: 200 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({
                            text: "Presupuesto de Seguro Automotriz",
                            bold: true,
                            size: 48, // 24pt
                            color: "2E74B5"
                        }),
                    ],
                    heading: "Heading1",
                    spacing: { after: 400 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "INSTRUCCIONES DE USO (Puedes borrar este texto una vez edites tu plantilla):", bold: true, color: "FF0000" }),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun("1. Este archivo es una plantilla base. Puedes cambiar tipos de letra, colores, y agregar tu logo."),
                    ],
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    children: [
                        new TextRun("2. NO cambies los textos que están entre signos '+++'. Esos son los marcadores que el sistema reemplazará automáticamente."),
                    ],
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    children: [
                        new TextRun("3. La tabla de abajo está configurada para repetirse por cada plan cotizado. No rompas la estructura '+++detalles...' dentro de ella."),
                    ],
                    bullet: { level: 0 }
                }),
                new Paragraph({
                    children: [
                        new TextRun("4. Una vez personalizado, guarda este archivo y súbelo en el panel de Configuración del sistema."),
                    ],
                    bullet: { level: 0 },
                    spacing: { after: 400 }
                }),

                // DATA REAL
                new Paragraph({
                    children: [
                        new TextRun({ text: "Fecha Emisión: ", bold: true }),
                        new TextRun("+++fecha+++"),
                    ],
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Estimado/a: ", bold: true }),
                        new TextRun("+++cliente+++"),
                    ],
                    spacing: { after: 200 },
                }),
                new Paragraph({
                    text: "Presentamos a continuación las opciones disponibles para su vehículo +++vehiculo+++:",
                    spacing: { after: 200 },
                }),

                // Table
                new Table({
                    width: {
                        size: 100,
                        type: WidthType.PERCENTAGE,
                    },
                    rows: [
                        // Header
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ text: "Compañía", bold: true, color: "FFFFFF" })], shading: { fill: "2b579a" } }),
                                new TableCell({ children: [new Paragraph({ text: "Plan", bold: true, color: "FFFFFF" })], shading: { fill: "2b579a" } }),
                                new TableCell({ children: [new Paragraph({ text: "Deducible 3UF", bold: true, color: "FFFFFF" })], shading: { fill: "2b579a" } }),
                                new TableCell({ children: [new Paragraph({ text: "Resp. Civil", bold: true, color: "FFFFFF" })], shading: { fill: "2b579a" } }),
                                new TableCell({ children: [new Paragraph({ text: "Taller Marca", bold: true, color: "FFFFFF" })], shading: { fill: "2b579a" } }),
                            ],
                        }),
                        // Data Row (Recursive Loop start)
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph("+++detalles.compania+++")] }),
                                new TableCell({ children: [new Paragraph("+++detalles.plan+++")] }),
                                new TableCell({ children: [new Paragraph("+++detalles.prima_uf3+++")] }),
                                new TableCell({ children: [new Paragraph("+++detalles.rc+++")] }),
                                new TableCell({ children: [new Paragraph("+++detalles.taller+++")] }),
                            ],
                        }),
                    ],
                }),
                new Paragraph({
                    text: "Precios sujetos a evaluación final de la compañía aseguradora.",
                    size: 16, // 8pt
                    color: "666666",
                    spacing: { before: 400 }
                })
            ],
        }],
    });

    // Ensure dir uploads/doc
    const templateDir = path.join(__dirname, 'uploads', 'doc');
    if (!fs.existsSync(templateDir)) fs.mkdirSync(templateDir, { recursive: true });

    // Write file
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(path.join(templateDir, 'plantilla_ejemplo.docx'), buffer);
    console.log("Template generated at: " + path.join(templateDir, 'plantilla_ejemplo.docx'));
};

createTemplate();
