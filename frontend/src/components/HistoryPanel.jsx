import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, IconButton, Typography, Chip,
    Tooltip, Collapse, TablePagination
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SimCardDownloadIcon from '@mui/icons-material/SimCardDownload';
import DescriptionIcon from '@mui/icons-material/Description';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import axios from 'axios';

// Componente de fila individual para manejar el estado "open"
const Row = ({ row, onDelete, onDownloadExcel, onViewPdf }) => {
    const [open, setOpen] = useState(false);

    return (
        <React.Fragment>
            <TableRow hover sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell>
                    <IconButton
                        aria-label="expand row"
                        size="small"
                        onClick={() => setOpen(!open)}
                    >
                        {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                </TableCell>
                <TableCell>{row.id}</TableCell>
                <TableCell>
                    {new Date(row.createdAt).toLocaleDateString()} <br />
                    <Typography variant="caption" color="text.secondary">
                        {new Date(row.createdAt).toLocaleTimeString()}
                    </Typography>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>{row.asegurado || 'N/A'}</TableCell>
                <TableCell>{row.vehiculo || 'N/A'}</TableCell>
                <TableCell align="center">
                    <Chip label={row.detalles ? row.detalles.length : 0} size="small" />
                </TableCell>
                <TableCell align="right">

                    <Tooltip title="Descargar Excel">
                        <IconButton
                            color="success"
                            onClick={() => onDownloadExcel(row.id)}
                            sx={{ mx: 1 }}
                        >
                            <SimCardDownloadIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Descargar Word">
                        <IconButton
                            component="a"
                            href={`/api/quotes/${row.id}/word`}
                            target="_blank"
                            download={`Presupuesto_${row.id}.docx`}
                            sx={{ mx: 1, color: '#2b579a' }}
                        >
                            <DescriptionIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Eliminar Cotización">
                        <IconButton
                            color="error"
                            onClick={() => onDelete(row.id)}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                            <Typography variant="h6" gutterBottom component="div" size="small">
                                Detalle de Opciones
                            </Typography>
                            <Table size="small" aria-label="purchases">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Compañía</TableCell>
                                        <TableCell>Plan</TableCell>
                                        <TableCell>Prima 3UF</TableCell>
                                        <TableCell>Prima 5UF</TableCell>
                                        <TableCell>Prima 10UF</TableCell>
                                        <TableCell>RC</TableCell>
                                        <TableCell>Taller</TableCell>
                                        <TableCell>Observaciones</TableCell>
                                        <TableCell align="center">PDF</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {row.detalles && row.detalles.map((detalleRow) => (
                                        <TableRow key={detalleRow.id}>
                                            <TableCell>{detalleRow.compania}</TableCell>
                                            <TableCell>{detalleRow.plan}</TableCell>
                                            <TableCell>{detalleRow.prima_uf3 || '-'}</TableCell>
                                            <TableCell>{detalleRow.prima_uf5 || '-'}</TableCell>
                                            <TableCell>{detalleRow.prima_uf10 || '-'}</TableCell>
                                            <TableCell>{detalleRow.rc_monto || '-'}</TableCell>
                                            <TableCell>{detalleRow.taller_marca || '-'}</TableCell>
                                            <TableCell>{detalleRow.observaciones || '-'}</TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Ver Respaldo PDF">
                                                    <span>
                                                        <IconButton
                                                            color="primary"
                                                            size="small"
                                                            onClick={() => onViewPdf(detalleRow.rutaArchivo)}
                                                            disabled={!detalleRow.rutaArchivo}
                                                        >
                                                            <PictureAsPdfIcon fontSize="small" />
                                                        </IconButton>
                                                    </span>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {(!row.detalles || row.detalles.length === 0) && (
                                        <TableRow>
                                            <TableCell colSpan={9} align="center">No hay detalles disponibles</TableCell>
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
};

const HistoryPanel = () => {
    const [quotes, setQuotes] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await axios.get('/api/quotes');
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
            await axios.delete(`/api/quotes/${id}`);
            fetchHistory(); // Recargar tabla
        } catch (error) {
            alert('Error al eliminar');
        }
    };

    const handleDownloadExcel = (id) => {
        window.open(`/api/quotes/${id}/excel`, '_blank');
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

    return (
        <Paper sx={{ p: 4, mt: 4, width: '100%', borderRadius: 2 }}>
            <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
                Historial de Cotizaciones
            </Typography>

            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell width="50px" />
                            <TableCell>ID</TableCell>
                            <TableCell>Fecha</TableCell>
                            <TableCell>Asegurado</TableCell>
                            <TableCell>Vehículo</TableCell>
                            <TableCell align="center">Planes</TableCell>
                            <TableCell align="right">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {quotes
                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                            .map((row) => (
                                <Row
                                    key={row.id}
                                    row={row}
                                    onDelete={handleDelete}
                                    onDownloadExcel={handleDownloadExcel}
                                    onViewPdf={handleViewPdf}
                                />
                            ))}
                        {quotes.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                    <Typography color="text.secondary">No hay cotizaciones registradas aún.</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={quotes.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Filas por página"
            />
        </Paper>
    );
};

export default HistoryPanel;
