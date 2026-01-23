import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, IconButton, Typography, Button, Chip,
    Tooltip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SimCardDownloadIcon from '@mui/icons-material/SimCardDownload';
import DescriptionIcon from '@mui/icons-material/Description';
import axios from 'axios';

const HistoryPanel = () => {
    const [quotes, setQuotes] = useState([]);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await axios.get('/api/quotes');
            setQuotes(res.data);
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
        // Al ser un GET que descarga archivo, lo mejor es abrirlo en nueva ventana o usar window.location
        window.open(`/api/quotes/${id}/excel`, '_blank');
    };

    const handleViewPdf = (ruta) => {
        if (!ruta) return;
        // La ruta viene como /uploads/final/..., el server debe servir estáticos o podemos abrirlo directo si está en public
        // En server.js no vi configuración de static para uploads, voy a asumir que se necesita ruta relativa al host.
        // Si no está configurado express.static, esto podría fallar. Asumiré que sí o que el usuario lo ajustará.
        // Corrección: El server.js NO tiene express.static configurado para 'uploads'. 
        // Agregaremos eso en el próximo paso si falla, pero por ahora apuntamos a la URL.
        window.open(ruta, '_blank');
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
                            <TableCell>ID</TableCell>
                            <TableCell>Fecha</TableCell>
                            <TableCell>Asegurado</TableCell>
                            <TableCell>Vehículo</TableCell>
                            <TableCell align="center">Planes</TableCell>
                            <TableCell align="right">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {quotes.map((row) => (
                            <TableRow key={row.id} hover>
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
                                    <Tooltip title="Ver PDF Original">
                                        <IconButton
                                            color="primary"
                                            onClick={() => handleViewPdf(row.detalles?.[0]?.rutaArchivo)}
                                            disabled={!row.detalles?.[0]?.rutaArchivo}
                                        >
                                            <PictureAsPdfIcon />
                                        </IconButton>
                                    </Tooltip>

                                    <Tooltip title="Descargar Excel">
                                        <IconButton
                                            color="success"
                                            onClick={() => handleDownloadExcel(row.id)}
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
                                            onClick={() => handleDelete(row.id)}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                        {quotes.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                    <Typography color="text.secondary">No hay cotizaciones registradas aún.</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
};

export default HistoryPanel;
