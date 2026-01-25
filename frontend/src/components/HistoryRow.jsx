import React, { useState } from 'react';
import {
    Box, Table, TableBody, TableCell, TableRow, IconButton, Typography, Chip,
    Tooltip, Collapse, TableHead
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SimCardDownloadIcon from '@mui/icons-material/SimCardDownload';
import DescriptionIcon from '@mui/icons-material/Description';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

const HistoryRow = ({ row, onDelete, onDownloadExcel, onViewPdf }) => {
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
                                        <TableCell>Reposición</TableCell>
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
                                            <TableCell>{detalleRow.reposicion_meses || '-'}</TableCell>
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

export default HistoryRow;
