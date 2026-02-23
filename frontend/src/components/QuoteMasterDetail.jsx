import React, { useEffect, useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
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
import api, { quotes as quotesService } from '../services/api';

// Componente para una fila "Maestra" (Cotización) - Completamente Responsivo y Glassmorphism
function Row({ quote, onUpdate }) {
    const [open, setOpen] = useState(false);
    const [editMode, setEditMode] = useState({});
    const [changes, setChanges] = useState({});
    const [learnChecks, setLearnChecks] = useState({});

    const downloadExcel = async (e) => {
        e.stopPropagation();
        if (quote.id) {
            try {
                await quotesService.downloadExcel(quote.id);
            } catch (error) {
                alert("Error al descargar Excel.");
            }
        } else {
            alert("Esta cotización aún no tiene ID asignado. Intente recargar.");
        }
    };

    const downloadWord = async (e) => {
        e.stopPropagation();
        if (quote.id) {
            try {
                await quotesService.downloadWord(quote.id);
            } catch (error) {
                alert("Error al descargar Word.");
            }
        }
    };

    const toggleEdit = (detalle) => {
        const id = detalle.id;
        if (editMode[id]) {
            setEditMode({ ...editMode, [id]: false });
            setChanges({ ...changes, [id]: null });
        } else {
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
            await api.put(`/quote-details/${id}`, payload);
            alert("Guardado correctamente" + (learnChecks[id] ? " y Aprendido!" : "."));

            setEditMode({ ...editMode, [id]: false });
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Error saving detail:", error);
            alert("Error al guardar.");
        }
    };

    return (
        <Box sx={{ mb: 2 }}>
            {/* Tarjeta Principal (Fila Responsiva) basada en Flexbox */}
            <Box sx={{
                display: 'flex',
                alignItems: { xs: 'stretch', sm: 'center' },
                flexDirection: { xs: 'column', sm: 'row' },
                background: '#ffffff',
                borderRadius: '16px',
                p: { xs: 2, sm: 1.5 },
                px: { sm: 2 },
                gap: { xs: 2, sm: 2 },
                boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 6px 20px rgba(0,0,0,0.1)' }
            }}>
                {/* 1. Acciones (Izquierda en Desktop, Fila propia inferior en Móvil) */}
                <Box sx={{
                    display: 'flex',
                    width: { xs: '100%', sm: '120px' },
                    gap: 1,
                    order: { xs: 5, sm: 1 },
                    mt: { xs: 1, sm: 0 },
                    pt: { xs: 2, sm: 0 },
                    borderTop: { xs: '1px solid #f1f5f9', sm: 'none' },
                    justifyContent: { xs: 'space-around', sm: 'flex-start' },
                    alignItems: 'center'
                }}>
                    <IconButton
                        size="small"
                        onClick={() => setOpen(!open)}
                        sx={{
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            '&:hover': { background: '#f1f5f9' },
                            width: 32, height: 32
                        }}
                    >
                        {open ? <KeyboardArrowUpIcon fontSize="small" /> : <KeyboardArrowDownIcon fontSize="small" />}
                    </IconButton>
                    <IconButton size="small" onClick={downloadExcel} sx={{ color: '#3b82f6' }} title="Descargar Excel">
                        <FileDownloadIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={downloadWord} sx={{ color: '#3b82f6' }} title="Descargar Presupuesto Word">
                        <DescriptionIcon fontSize="small" />
                    </IconButton>
                </Box>

                {/* 2. Fecha */}
                <Box sx={{ width: { xs: '100%', sm: '120px' }, order: { xs: 2, sm: 2 } }}>
                    <Typography variant="body2" sx={{ color: '#1e293b', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                        <Box component="span" sx={{ display: { sm: 'none' }, mr: 1, color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase' }}>Fecha:</Box>
                        {new Date(quote.createdAt).toLocaleDateString()}
                    </Typography>
                </Box>

                {/* 3. Asegurado */}
                <Box sx={{ flex: 1, width: '100%', order: { xs: 3, sm: 3 } }}>
                    <Typography variant="body1" sx={{ color: '#0f172a', fontWeight: 800 }}>
                        {quote.asegurado || "Sin Nombre"}
                    </Typography>
                </Box>

                {/* 4. Vehículo */}
                <Box sx={{ flex: 1.5, width: '100%', order: { xs: 4, sm: 4 } }}>
                    <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                        {quote.vehiculo || "Vehículo Desconocido"}
                    </Typography>
                </Box>

                {/* 5. Resultados (Badge) */}
                <Box sx={{
                    width: { xs: '100%', sm: '120px' },
                    display: 'flex',
                    justifyContent: { xs: 'flex-start', sm: 'center' },
                    order: { xs: 1, sm: 5 },
                    mt: { xs: 0, sm: 0 },
                    mb: { xs: 1, sm: 0 }
                }}>
                    <Chip
                        label={`${quote.detalles ? quote.detalles.length : 0} Planes`}
                        size="small"
                        onClick={() => setOpen(!open)}
                        sx={{
                            cursor: 'pointer',
                            background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                            color: '#fff',
                            fontWeight: 800,
                            borderRadius: '50px',
                            boxShadow: '0 4px 12px rgba(168,85,247,0.3)',
                            '&:hover': { boxShadow: '0 6px 16px rgba(168,85,247,0.5)' }
                        }}
                    />
                </Box>
            </Box>

            {/* Panel de Detalles Colapsable */}
            <Collapse in={open} timeout="auto" unmountOnExit>
                <Box sx={{
                    mt: 1, mb: 1,
                    padding: { xs: 2, sm: 3 },
                    background: 'rgba(30, 41, 59, 0.4)', // Dark glass container for inner details
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '16px',
                    overflowX: 'auto',
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.2)'
                }}>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 800, color: '#fff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 8px #a855f7' }} />
                        Detalle de Planes
                    </Typography>

                    {/* Vista Desktop (Tabla) */}
                    <Box sx={{ display: { xs: 'none', lg: 'block' }, minWidth: 800, background: '#ffffff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
                        <Table size="small">
                            <TableHead sx={{ background: '#f8fafc' }}>
                                <TableRow sx={{ '& th': { borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem' } }}>
                                    <TableCell>Compañía</TableCell>
                                    <TableCell>Plan</TableCell>
                                    <TableCell align="right">UF 3</TableCell>
                                    <TableCell align="right">UF 5</TableCell>
                                    <TableCell align="right">UF 10</TableCell>
                                    <TableCell>Taller</TableCell>
                                    <TableCell>Reposición</TableCell>
                                    <TableCell>RC</TableCell>
                                    <TableCell align="center">Acciones</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {quote.detalles && quote.detalles.length > 0 ? (
                                    quote.detalles.map((detalle, index) => {
                                        const isEditing = editMode[detalle.id];
                                        const current = isEditing ? changes[detalle.id] : detalle;

                                        return (
                                            <TableRow key={detalle.id || index} sx={{ '& td': { borderBottom: '1px solid #f1f5f9' }, '&:last-child td': { border: 0 }, '&:hover td': { background: '#f8fafc' } }}>
                                                <TableCell sx={{ color: '#0f172a', fontWeight: 700 }}>{detalle.compania}</TableCell>
                                                <TableCell sx={{ color: '#475569', fontWeight: 500 }}>
                                                    {isEditing ? <input type="text" value={current.plan || ''} onChange={(e) => handleChange(detalle.id, 'plan', e.target.value)} style={{ width: '100%', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }} /> : detalle.plan}
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: '#64748b' }}>
                                                    {isEditing ? <input type="text" value={current.prima_uf3 || ''} onChange={(e) => handleChange(detalle.id, 'prima_uf3', e.target.value)} style={{ width: '50px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /> : detalle.prima_uf3}
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: '#64748b' }}>
                                                    {isEditing ? <input type="text" value={current.prima_uf5 || ''} onChange={(e) => handleChange(detalle.id, 'prima_uf5', e.target.value)} style={{ width: '50px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /> : detalle.prima_uf5}
                                                </TableCell>
                                                <TableCell align="right" sx={{ color: '#64748b' }}>
                                                    {isEditing ? <input type="text" value={current.prima_uf10 || ''} onChange={(e) => handleChange(detalle.id, 'prima_uf10', e.target.value)} style={{ width: '50px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /> : detalle.prima_uf10}
                                                </TableCell>
                                                <TableCell sx={{ color: '#64748b' }}>
                                                    {isEditing ? <input type="text" value={current.taller_marca || ''} onChange={(e) => handleChange(detalle.id, 'taller_marca', e.target.value)} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /> : detalle.taller_marca}
                                                </TableCell>
                                                <TableCell sx={{ color: '#64748b' }}>
                                                    {isEditing ? <input type="text" value={current.reposicion_meses || ''} onChange={(e) => handleChange(detalle.id, 'reposicion_meses', e.target.value)} style={{ width: '50px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /> : detalle.reposicion_meses}
                                                </TableCell>
                                                <TableCell sx={{ color: '#64748b' }}>
                                                    {isEditing ? <input type="text" value={current.rc_monto || ''} onChange={(e) => handleChange(detalle.id, 'rc_monto', e.target.value)} style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1' }} /> : detalle.rc_monto}
                                                </TableCell>
                                                <TableCell align="center">
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                                                        {isEditing ? (
                                                            <>
                                                                <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.65rem', display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                                                                    <input type="checkbox" checked={learnChecks[detalle.id] || false} onChange={(e) => setLearnChecks({ ...learnChecks, [detalle.id]: e.target.checked })} style={{ marginRight: '6px', accentColor: '#a855f7' }} /> Aprender
                                                                </Typography>
                                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                                    <Typography variant="caption" sx={{ color: '#10b981', cursor: 'pointer', fontWeight: 800, px: 1, py: 0.5, background: 'rgba(16,185,129,0.1)', borderRadius: 1 }} onClick={() => handleSave(detalle.id)}>Guardar</Typography>
                                                                    <Typography variant="caption" sx={{ color: '#ef4444', cursor: 'pointer', fontWeight: 800, px: 1, py: 0.5, background: 'rgba(239,68,68,0.1)', borderRadius: 1 }} onClick={() => toggleEdit(detalle)}>Cancelar</Typography>
                                                                </Box>
                                                            </>
                                                        ) : (
                                                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                                <Typography variant="caption" sx={{ color: '#a855f7', cursor: 'pointer', fontWeight: 700, px: 1, py: 0.5, '&:hover': { background: 'rgba(168,85,247,0.1)', borderRadius: 1 } }} onClick={() => toggleEdit(detalle)}>Editar</Typography>
                                                                <IconButton sx={{ color: '#a855f7', background: 'rgba(168,85,247,0.1)' }} href={detalle.rutaArchivo || quote.rutaArchivo} target="_blank" size="small"><VisibilityIcon fontSize="small" /></IconButton>
                                                            </Box>
                                                        )}
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} align="center" sx={{ color: '#64748b', py: 4, fontWeight: 500 }}>No hay planes detallados para esta cotización.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </Box>

                    {/* Vista Móvil (Tarjetas Verticales) */}
                    <Box sx={{ display: { xs: 'flex', lg: 'none' }, flexDirection: 'column', gap: 2 }}>
                        {quote.detalles && quote.detalles.length > 0 ? (
                            quote.detalles.map((detalle, index) => {
                                const isEditing = editMode[detalle.id];
                                const current = isEditing ? changes[detalle.id] : detalle;

                                const renderField = (label, field, width = '100%') => (
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.5, borderBottom: '1px solid #f1f5f9' }}>
                                        <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>{label}</Typography>
                                        {isEditing ? (
                                            <input type="text" value={current[field] || ''} onChange={(e) => handleChange(detalle.id, field, e.target.value)} style={{ width, padding: '4px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', textAlign: 'right' }} />
                                        ) : (
                                            <Typography variant="body2" sx={{ color: '#334155', fontWeight: 600 }}>{detalle[field]}</Typography>
                                        )}
                                    </Box>
                                );

                                return (
                                    <Box key={detalle.id || index} sx={{ background: '#ffffff', borderRadius: '12px', p: 2, boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                                        <Typography variant="subtitle1" sx={{ color: '#0f172a', fontWeight: 800, mb: 1, borderBottom: '2px solid #f1f5f9', pb: 1 }}>
                                            {detalle.compania}
                                        </Typography>
                                        {renderField('Plan', 'plan')}
                                        {renderField('UF 3', 'prima_uf3', '60px')}
                                        {renderField('UF 5', 'prima_uf5', '60px')}
                                        {renderField('UF 10', 'prima_uf10', '60px')}
                                        {renderField('Taller', 'taller_marca')}
                                        {renderField('Reposición', 'reposicion_meses', '60px')}
                                        {renderField('RC', 'rc_monto')}

                                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                                            {isEditing ? (
                                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, width: '100%' }}>
                                                    <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.75rem', display: 'flex', alignItems: 'center', fontWeight: 600 }}>
                                                        <input type="checkbox" checked={learnChecks[detalle.id] || false} onChange={(e) => setLearnChecks({ ...learnChecks, [detalle.id]: e.target.checked })} style={{ marginRight: '6px', accentColor: '#a855f7' }} /> Aprender
                                                    </Typography>
                                                    <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'space-between' }}>
                                                        <Typography variant="button" sx={{ flex: 1, textAlign: 'center', color: '#10b981', cursor: 'pointer', fontWeight: 800, px: 2, py: 1, background: 'rgba(16,185,129,0.1)', borderRadius: 2 }} onClick={() => handleSave(detalle.id)}>Guardar</Typography>
                                                        <Typography variant="button" sx={{ flex: 1, textAlign: 'center', color: '#ef4444', cursor: 'pointer', fontWeight: 800, px: 2, py: 1, background: 'rgba(239,68,68,0.1)', borderRadius: 2 }} onClick={() => toggleEdit(detalle)}>Cancelar</Typography>
                                                    </Box>
                                                </Box>
                                            ) : (
                                                <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                                                    <Typography variant="button" sx={{ flex: 1, textAlign: 'center', color: '#a855f7', cursor: 'pointer', fontWeight: 700, px: 2, py: 1, background: 'rgba(168,85,247,0.1)', borderRadius: 2 }} onClick={() => toggleEdit(detalle)}>Editar</Typography>
                                                    <IconButton sx={{ flex: 1, color: '#a855f7', background: 'rgba(168,85,247,0.1)', borderRadius: 2 }} href={detalle.rutaArchivo || quote.rutaArchivo} target="_blank" title="Ver Documento Original">
                                                        <VisibilityIcon />
                                                    </IconButton>
                                                </Box>
                                            )}
                                        </Box>
                                    </Box>
                                );
                            })
                        ) : (
                            <Typography sx={{ color: '#94a3b8', textAlign: 'center', py: 2 }}>No hay planes detallados para esta cotización.</Typography>
                        )}
                    </Box>
                </Box>
            </Collapse>
        </Box>
    );
}

export default function QuoteMasterDetail({ quotes: externalQuotes }) {
    const [quotes, setQuotes] = useState([]);

    useEffect(() => {
        if (externalQuotes && externalQuotes.length > 0) {
            setQuotes(externalQuotes);
        } else {
            fetchQuotes();
        }
    }, [externalQuotes]);

    const fetchQuotes = async () => {
        try {
            const response = await api.get('/quotes');
            setQuotes(response.data);
        } catch (error) {
            console.error("Error cargando historial:", error);
        }
    };

    return (
        <Box sx={{ mt: 4, width: '100%', pb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#3b82f6' }}>
                    {externalQuotes ? "Resultado del Análisis" : "Historial de Cotizaciones"}
                </Typography>
                {!externalQuotes && (
                    <IconButton onClick={fetchQuotes} sx={{ color: '#3b82f6', background: 'rgba(59,130,246,0.1)', borderRadius: 2 }} title="Actualizar Lista">
                        <KeyboardArrowDownIcon sx={{ transform: 'rotate(0deg)' }} />
                        <Typography variant="button" sx={{ ml: 1, fontWeight: 700 }}>Actualizar</Typography>
                    </IconButton>
                )}
            </Box>

            {/* Encabezado Falso (Solo Desktop) que simula el Header de la Tabla con estilo Dark Premium */}
            <Box sx={{
                display: { xs: 'none', sm: 'flex' },
                background: '#1e293b',
                borderRadius: '12px',
                p: 1.5,
                px: 2,
                mb: 2,
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                <Box sx={{ width: '120px' }} /> {/* Espacio para botones de acciones */}
                <Typography sx={{ width: '120px', color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>Fecha</Typography>
                <Typography sx={{ flex: 1, color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>Asegurado</Typography>
                <Typography sx={{ flex: 1.5, color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>Vehículo</Typography>
                <Typography sx={{ width: '120px', textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem' }}>Resultados</Typography>
            </Box>

            {/* Lista Responsiva de Cotizaciones */}
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                {quotes && quotes.length > 0 ? (
                    quotes.map((quote, index) => (
                        <Row key={quote.id || index} quote={quote} onUpdate={fetchQuotes} />
                    ))
                ) : (
                    <Paper sx={{ p: 4, textAlign: 'center', background: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(10px)', color: '#94a3b8', borderRadius: 3, border: '1px dashed rgba(255,255,255,0.1)' }}>
                        No hay cotizaciones disponibles.
                    </Paper>
                )}
            </Box>
        </Box>
    );
}
