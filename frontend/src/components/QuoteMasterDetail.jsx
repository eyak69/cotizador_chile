import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Collapse,
    Chip
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import VisibilityIcon from '@mui/icons-material/Visibility';
import axios from 'axios';
import * as XLSX from 'xlsx';

// Componente para una fila "Maestra" (Cotización)
function Row({ quote }) {
    const [open, setOpen] = useState(false);

    const downloadExcel = (e) => {
        e.stopPropagation(); // Evitar que se expanda/colapse al hacer clic

        const wb = XLSX.utils.book_new();
        const wsData = [
            ["Fecha", new Date(quote.createdAt).toLocaleDateString(), "Asegurado", quote.asegurado || "", "Vehículo", quote.vehiculo || ""],
            [], // Fila vacía
            ["Compañía", "Plan", "UF 3", "UF 5", "UF 10", "Taller Marca", "RC", "Observaciones"],
        ];

        if (quote.detalles) {
            quote.detalles.forEach(d => {
                wsData.push([
                    d.compania,
                    d.plan,
                    d.prima_uf3,
                    d.prima_uf5,
                    d.prima_uf10,
                    d.taller_marca,
                    d.rc_monto,
                    d.observaciones
                ]);
            });
        }

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Ajustar ancho de columnas (opcional pero recomendado)
        const wscols = [
            { wch: 15 }, // Compañía
            { wch: 40 }, // Plan
            { wch: 10 }, // UF 3
            { wch: 10 }, // UF 5
            { wch: 10 }, // UF 10
            { wch: 15 }, // Taller
            { wch: 20 }, // RC
            { wch: 50 }  // Observaciones
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "Cotización");

        // Sanitize filename
        const safeName = (quote.asegurado || "Cotizacion").replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        XLSX.writeFile(wb, `${safeName}.xlsx`);
    };

    return (
        <React.Fragment>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' }, backgroundColor: '#ffffff' }}>
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton
                            aria-label="expand row"
                            size="small"
                            onClick={() => setOpen(!open)}
                            sx={{ color: '#000000' }}
                        >
                            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                        <IconButton
                            aria-label="download excel"
                            size="small"
                            onClick={downloadExcel}
                            sx={{ color: '#1976d2', marginLeft: 1 }}
                            title="Descargar Excel"
                        >
                            <FileDownloadIcon />
                        </IconButton>
                    </Box>
                </TableCell>
                <TableCell component="th" scope="row" sx={{ color: '#000000' }}>
                    {new Date(quote.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell align="left" sx={{ color: '#000000' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#000000' }}>
                        {quote.asegurado || "Sin Nombre"}
                    </Typography>
                </TableCell>
                <TableCell align="left" sx={{ color: '#000000' }}>{quote.vehiculo || "Vehículo Desconocido"}</TableCell>
                <TableCell align="center">
                    <Chip
                        label={`${quote.detalles ? quote.detalles.length : 0} Planes`}
                        color="primary"
                        size="small"
                        onClick={() => setOpen(!open)}
                        sx={{ cursor: 'pointer' }}
                    />
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2, padding: 2, backgroundColor: '#f8f9fa', border: '1px solid #e0e0e0', borderRadius: 2 }}>
                            <Typography variant="h6" gutterBottom component="div" sx={{ fontSize: '16px', fontWeight: 'bold', color: '#000000' }}>
                                Detalle de Planes
                            </Typography>
                            <Table size="small" aria-label="purchases">
                                <TableHead>
                                    <TableRow>
                                        <TableCell sx={{ color: '#000000', fontWeight: 'bold' }}>Compañía</TableCell>
                                        <TableCell sx={{ color: '#000000', fontWeight: 'bold' }}>Plan</TableCell>
                                        <TableCell align="right" sx={{ color: '#000000', fontWeight: 'bold' }}>UF 3</TableCell>
                                        <TableCell align="right" sx={{ color: '#000000', fontWeight: 'bold' }}>UF 5</TableCell>
                                        <TableCell align="right" sx={{ color: '#000000', fontWeight: 'bold' }}>UF 10</TableCell>
                                        <TableCell sx={{ color: '#000000', fontWeight: 'bold' }}>Taller Marca</TableCell>
                                        <TableCell sx={{ color: '#000000', fontWeight: 'bold' }}>RC</TableCell>
                                        <TableCell align="center" sx={{ color: '#000000', fontWeight: 'bold' }}>Ver PDF</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {quote.detalles && quote.detalles.length > 0 ? (
                                        quote.detalles.map((detalle, index) => (
                                            <TableRow key={detalle.id || index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                <TableCell component="th" scope="row" sx={{ color: '#000000', fontWeight: 'medium' }}>
                                                    {detalle.compania}
                                                </TableCell>
                                                <TableCell sx={{ color: '#000000' }}>{detalle.plan}</TableCell>
                                                <TableCell align="right" sx={{ color: '#000000' }}>{detalle.prima_uf3}</TableCell>
                                                <TableCell align="right" sx={{ color: '#000000' }}>{detalle.prima_uf5}</TableCell>
                                                <TableCell align="right" sx={{ color: '#000000' }}>{detalle.prima_uf10}</TableCell>
                                                <TableCell sx={{ color: '#000000' }}>{detalle.taller_marca}</TableCell>
                                                <TableCell sx={{ color: '#000000' }}>{detalle.rc_monto}</TableCell>
                                                <TableCell align="center">
                                                    <IconButton
                                                        color="primary"
                                                        href={detalle.rutaArchivo || quote.rutaArchivo}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        title="Ver PDF Original"
                                                    >
                                                        <VisibilityIcon />
                                                    </IconButton>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} align="center" sx={{ color: '#000000' }}>No hay detalles procesados para esta cotización.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
}

export default function QuoteMasterDetail({ quotes: externalQuotes }) {
    const [quotes, setQuotes] = useState([]);

    useEffect(() => {
        // Si nos pasan cotizaciones desde fuera (ej: resultado de subida), las usamos.
        // Si no, cargamos el historial completo.
        if (externalQuotes && externalQuotes.length > 0) {
            setQuotes(externalQuotes);
        } else {
            fetchQuotes();
        }
    }, [externalQuotes]);

    const fetchQuotes = async () => {
        try {
            // En desarrollo local usamos proxy o ruta completa si no está configurado
            const response = await axios.get('/api/quotes');
            setQuotes(response.data);
        } catch (error) {
            console.error("Error cargando historial:", error);
        }
    };

    return (
        <Box sx={{ marginTop: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
                    {externalQuotes ? "Resultado del Análisis" : "Historial de Cotizaciones"}
                </Typography>
                {!externalQuotes && (
                    <IconButton onClick={fetchQuotes} color="primary" title="Actualizar Lista">
                        <KeyboardArrowDownIcon sx={{ transform: 'rotate(0deg)' }} />
                        <Typography variant="button" sx={{ ml: 1 }}>Actualizar</Typography>
                    </IconButton>
                )}
            </Box>
            <TableContainer component={Paper} elevation={3}>
                <Table aria-label="collapsible table">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#333' }}>
                            <TableCell sx={{ color: '#fff' }} />
                            <TableCell sx={{ color: '#fff' }}>Fecha</TableCell>
                            <TableCell sx={{ color: '#fff' }}>Asegurado</TableCell>
                            <TableCell sx={{ color: '#fff' }}>Vehículo</TableCell>
                            <TableCell align="center" sx={{ color: '#fff' }}>Resultados</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {quotes.map((quote, index) => (
                            <Row key={quote.id || index} quote={quote} />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
