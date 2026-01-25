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
import DescriptionIcon from '@mui/icons-material/Description';
import axios from 'axios';
import * as XLSX from 'xlsx';

// Componente para una fila "Maestra" (Cotización)
function Row({ quote, onUpdate }) {
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState({}); // { [detalleId]: boolean }
    const [changes, setChanges] = useState({});   // { [detalleId]: { plan: '...', ... } }
    const [learnChecks, setLearnChecks] = useState({}); // { [detalleId]: boolean }

    const downloadExcel = (e) => {
        e.stopPropagation();

        const wb = XLSX.utils.book_new();
        const wsData = [
            ["Fecha", new Date(quote.createdAt).toLocaleDateString(), "Asegurado", quote.asegurado || "", "Vehículo", quote.vehiculo || ""],
            [],
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
        const wscols = [
            { wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 50 }
        ];
        ws['!cols'] = wscols;

        XLSX.utils.book_append_sheet(wb, ws, "Cotización");
        const safeName = (quote.asegurado || "Cotizacion").replace(/[^a-z0-9]/gi, '_').substring(0, 30);
        XLSX.writeFile(wb, `${safeName}.xlsx`);
    };

    const toggleEdit = (detalle) => {
        const id = detalle.id;
        if (editMode[id]) {
            // Cancelar
            setEditMode({ ...editMode, [id]: false });
            setChanges({ ...changes, [id]: null });
        } else {
            // Entrar a edición
            setEditMode({ ...editMode, [id]: true });
            setChanges({ ...changes, [id]: { ...detalle } });
            setLearnChecks({ ...learnChecks, [id]: false });
        }
    };

    const handleChange = (id, field, value) => {
        setChanges({
            ...changes,
            [id]: { ...changes[id], [field]: value }
        });
    };

    const handleSave = async (id) => {
        try {
            const payload = { ...changes[id], learn: learnChecks[id] };
            await axios.put(`/api/quote-details/${id}`, payload);
            alert("Guardado correctamente" + (learnChecks[id] ? " y Aprendido!" : "."));

            setEditMode({ ...editMode, [id]: false });
            if (onUpdate) onUpdate(); // Refrescar lista
        } catch (error) {
            console.error("Error saving detail:", error);
            alert("Error al guardar.");
        }
    };

    return (
        <React.Fragment>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' }, backgroundColor: '#ffffff' }}>
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)} sx={{ color: '#000000' }}>
                            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                        <IconButton aria-label="download excel" size="small" onClick={downloadExcel} sx={{ color: '#1976d2', marginLeft: 1 }} title="Descargar Excel">
                            <FileDownloadIcon />
                        </IconButton>
                        <IconButton
                            aria-label="download word"
                            size="small"
                            href={`/api/quotes/${quote.id}/word`}
                            target="_blank"
                            download={`Presupuesto_${quote.id}.docx`}
                            sx={{ color: '#2b579a', marginLeft: 1 }} // Azul Word
                            title="Descargar Presupuesto Word"
                        >
                            <DescriptionIcon />
                        </IconButton>
                    </Box>
                </TableCell>
                <TableCell component="th" scope="row" sx={{ color: '#000000' }}>
                    {new Date(quote.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell align="left" sx={{ color: '#000000' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: '#000000' }}>{quote.asegurado || "Sin Nombre"}</Typography>
                </TableCell>
                <TableCell align="left" sx={{ color: '#000000' }}>{quote.vehiculo || "Vehículo Desconocido"}</TableCell>
                <TableCell align="center">
                    <Chip label={`${quote.detalles ? quote.detalles.length : 0} Planes`} color="primary" size="small" onClick={() => setOpen(!open)} sx={{ cursor: 'pointer' }} />
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
                                        <TableCell sx={{ color: '#000000', fontWeight: 'bold' }}>Reposición</TableCell>
                                        <TableCell sx={{ color: '#000000', fontWeight: 'bold' }}>RC</TableCell>
                                        <TableCell align="center" sx={{ color: '#000000', fontWeight: 'bold' }}>Acciones</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {quote.detalles && quote.detalles.length > 0 ? (
                                        quote.detalles.map((detalle, index) => {
                                            const isEditing = editMode[detalle.id];
                                            const current = isEditing ? changes[detalle.id] : detalle;

                                            return (
                                                <TableRow key={detalle.id || index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                    <TableCell component="th" scope="row" sx={{ color: '#000000', fontWeight: 'medium' }}>
                                                        {detalle.compania}
                                                    </TableCell>
                                                    <TableCell sx={{ color: '#000000' }}>
                                                        {isEditing ? (
                                                            <input type="text" value={current.plan || ''} onChange={(e) => handleChange(detalle.id, 'plan', e.target.value)} style={{ width: '100%' }} />
                                                        ) : detalle.plan}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ color: '#000000' }}>
                                                        {isEditing ? (
                                                            <input type="text" value={current.prima_uf3 || ''} onChange={(e) => handleChange(detalle.id, 'prima_uf3', e.target.value)} style={{ width: '50px' }} />
                                                        ) : detalle.prima_uf3}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ color: '#000000' }}>
                                                        {isEditing ? (
                                                            <input type="text" value={current.prima_uf5 || ''} onChange={(e) => handleChange(detalle.id, 'prima_uf5', e.target.value)} style={{ width: '50px' }} />
                                                        ) : detalle.prima_uf5}
                                                    </TableCell>
                                                    <TableCell align="right" sx={{ color: '#000000' }}>
                                                        {isEditing ? (
                                                            <input type="text" value={current.prima_uf10 || ''} onChange={(e) => handleChange(detalle.id, 'prima_uf10', e.target.value)} style={{ width: '50px' }} />
                                                        ) : detalle.prima_uf10}
                                                    </TableCell>
                                                    <TableCell sx={{ color: '#000000' }}>
                                                        {isEditing ? (
                                                            <input type="text" value={current.taller_marca || ''} onChange={(e) => handleChange(detalle.id, 'taller_marca', e.target.value)} style={{ width: '80px' }} />
                                                        ) : detalle.taller_marca}
                                                    </TableCell>
                                                    <TableCell sx={{ color: '#000000' }}>
                                                        {isEditing ? (
                                                            <input type="text" value={current.reposicion_meses || ''} onChange={(e) => handleChange(detalle.id, 'reposicion_meses', e.target.value)} style={{ width: '50px' }} />
                                                        ) : detalle.reposicion_meses}
                                                    </TableCell>
                                                    <TableCell sx={{ color: '#000000' }}>
                                                        {isEditing ? (
                                                            <input type="text" value={current.rc_monto || ''} onChange={(e) => handleChange(detalle.id, 'rc_monto', e.target.value)} style={{ width: '80px' }} />
                                                        ) : detalle.rc_monto}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                                            {isEditing ? (
                                                                <>
                                                                    <Typography variant="caption" sx={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center' }}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={learnChecks[detalle.id] || false}
                                                                            onChange={(e) => setLearnChecks({ ...learnChecks, [detalle.id]: e.target.checked })}
                                                                        /> Aprender
                                                                    </Typography>
                                                                    <Box>
                                                                        <Typography
                                                                            variant="caption"
                                                                            sx={{ color: 'green', cursor: 'pointer', fontWeight: 'bold', mr: 1 }}
                                                                            onClick={() => handleSave(detalle.id)}
                                                                        >
                                                                            Guardar
                                                                        </Typography>
                                                                        <Typography
                                                                            variant="caption"
                                                                            sx={{ color: 'red', cursor: 'pointer' }}
                                                                            onClick={() => toggleEdit(detalle)}
                                                                        >
                                                                            Cancelar
                                                                        </Typography>
                                                                    </Box>
                                                                </>
                                                            ) : (
                                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                                    <Typography
                                                                        variant="caption"
                                                                        sx={{ color: 'blue', cursor: 'pointer', textDecoration: 'underline' }}
                                                                        onClick={() => toggleEdit(detalle)}
                                                                    >
                                                                        Editar
                                                                    </Typography>
                                                                    <IconButton color="primary" href={detalle.rutaArchivo || quote.rutaArchivo} target="_blank" size="small">
                                                                        <VisibilityIcon fontSize="small" />
                                                                    </IconButton>
                                                                    {/* Botón eliminado a petición del usuario
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            window.open(`/api/quote-details/${detalle.id}/word`, '_blank');
                                                                        }}
                                                                        sx={{ color: '#2b579a' }}
                                                                        title="Descargar Presupuesto (Solo este plan)"
                                                                    >
                                                                        <DescriptionIcon fontSize="small" />
                                                                    </IconButton>
                                                                    */}
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={8} align="center" sx={{ color: '#000000' }}>No hay detalles procesados para esta cotización.</TableCell>
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
                            <Row key={quote.id || index} quote={quote} onUpdate={fetchQuotes} />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
