import React, { useState, useEffect } from 'react';
import {
    Box, Typography, TablePagination, TextField, InputAdornment, IconButton, Tab, Tabs, Fab
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import HistoryRow from './HistoryRow';
import { quotes as quotesService } from '../services/api';

const HistoryPanel = () => {
    const [quotes, setQuotes] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await quotesService.getAll();
            // Ordenar por defecto por ID descendente
            const sortedData = res.data.sort((a, b) => b.id - a.id);
            setQuotes(sortedData);
        } catch (error) {
            console.error("Error cargando historial", error);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar esta cotización y sus archivos? Esta acción no se puede deshacer.')) return;
        try {
            await quotesService.delete(id);
            fetchHistory(); // Recargar tabla
        } catch (error) {
            alert('Error al eliminar');
        }
    };

    const handleDownloadExcel = async (id) => {
        try {
            await quotesService.downloadExcel(id);
        } catch (error) {
            console.error("Error al descargar Excel", error);
            alert("Error al descargar el archivo Excel.");
        }
    };

    const handleViewPdf = (ruta) => {
        if (!ruta) return;
        window.open(ruta, '_blank');
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const [tabValue, setTabValue] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredQuotes = quotes.filter(q =>
        (q.asegurado && q.asegurado.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (q.vehiculo && q.vehiculo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (q.id && q.id.toString().includes(searchTerm))
    );

    return (
        <Box sx={{ width: '100%', maxWidth: 700, mx: 'auto', p: { xs: 2, sm: 3 }, pb: { xs: 10, sm: 3 } }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                    <Typography variant="h5" fontWeight={800} sx={{ color: '#fff', mb: 0.5 }}>Historial de Operaciones</Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                        Revisa y gestiona las cotizaciones emitidas
                    </Typography>
                </Box>
                <IconButton sx={{ background: 'rgba(255,255,255,0.05)', color: '#fff' }}>
                    <SearchIcon />
                </IconButton>
            </Box>

            {/* Tabs */}
            <Tabs
                value={tabValue}
                onChange={(e, v) => setTabValue(v)}
                sx={{
                    mb: 3, borderBottom: '1px solid rgba(255,255,255,0.1)',
                    '& .MuiTabs-indicator': { backgroundColor: '#a855f7', height: 3 }
                }}
            >
                <Tab label="Cotizaciones" sx={{ color: '#94a3b8', '&.Mui-selected': { color: '#a855f7', fontWeight: 800 } }} />
                <Tab label="Empresas" sx={{ color: '#94a3b8', '&.Mui-selected': { color: '#a855f7', fontWeight: 800 } }} />
            </Tabs>

            {tabValue === 0 && (
                <>
                    <Typography variant="overline" sx={{ color: '#94a3b8', fontWeight: 800, letterSpacing: 1, display: 'block', mb: 2 }}>
                        HISTORIAL DE COTIZACIONES
                    </Typography>

                    <TextField
                        placeholder="Buscar por ID, asegurado o vehículo..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        fullWidth size="small"
                        sx={{
                            mb: 3,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: 3, background: 'rgba(255,255,255,0.03)', color: '#cbd5e1',
                                '& fieldset': { borderColor: 'rgba(255,255,255,0.05)' },
                                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                '&.Mui-focused fieldset': { borderColor: '#a855f7' }
                            }
                        }}
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#64748b', fontSize: 20 }} /></InputAdornment>
                        }}
                    />

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {filteredQuotes
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((row) => (
                                <HistoryRow
                                    key={row.id}
                                    row={row}
                                    onDelete={handleDelete}
                                    onDownloadExcel={handleDownloadExcel}
                                    onViewPdf={handleViewPdf}
                                />
                            ))}
                        {filteredQuotes.length === 0 && (
                            <Box sx={{ p: 4, textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 3, border: '1px dashed rgba(255,255,255,0.1)' }}>
                                <Typography color="text.secondary">No hay cotizaciones registradas aún.</Typography>
                            </Box>
                        )}
                    </Box>

                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={filteredQuotes.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Items por página"
                        sx={{ color: '#94a3b8', mt: 2, borderBottom: 'none' }}
                    />
                </>
            )}

            {tabValue === 1 && (
                <Box sx={{ p: 4, textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 3, border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <Typography color="text.secondary">No hay historiales de empresas.</Typography>
                </Box>
            )}

            {/* Sticky Mobile FAB */}
            <Fab
                color="primary"
                aria-label="add"
                sx={{
                    position: 'fixed', bottom: 24, right: 24,
                    background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                    boxShadow: '0 8px 25px rgba(168,85,247,0.6)',
                    display: { xs: 'flex', sm: 'flex', md: 'none' }
                }}
            >
                <AddIcon />
            </Fab>
        </Box>
    );
};

export default HistoryPanel;
