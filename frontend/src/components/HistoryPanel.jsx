import React, { useState, useEffect } from 'react';
import {
    Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Typography, TablePagination
} from '@mui/material';
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
                                <HistoryRow
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
