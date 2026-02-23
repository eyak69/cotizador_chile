import React, { useState } from 'react';
import {
    Box, Table, TableBody, TableCell, TableRow, IconButton, Typography, Chip,
    Tooltip, Collapse, TableHead, Button
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SimCardDownloadIcon from '@mui/icons-material/SimCardDownload';
import DescriptionIcon from '@mui/icons-material/Description';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { quotes as quotesService } from '../services/api';

const HistoryRow = ({ row, onDelete, onDownloadExcel, onViewPdf }) => {
    const [open, setOpen] = useState(false);

    return (
        <Box sx={{
            mb: 2, p: 2, borderRadius: 3,
            background: 'rgba(20, 20, 30, 0.6)',
            border: '1px solid rgba(255,255,255,0.05)',
            position: 'relative'
        }}>
            {/* Header de la Tarjeta */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Chip
                    label={`#${row.id}`}
                    size="small"
                    sx={{ background: 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 800, borderRadius: 2 }}
                />
                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600 }}>{new Date(row.createdAt).toLocaleDateString()}</Typography>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>{new Date(row.createdAt).toLocaleTimeString()}</Typography>
                </Box>
                <Box sx={{
                    width: 45, height: 45, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 15px rgba(168,85,247,0.5)',
                    color: 'white', lineHeight: 1
                }}>
                    <Typography variant="caption" sx={{ fontSize: '0.8rem', fontWeight: 800 }}>{row.detalles ? row.detalles.length : 0}</Typography>
                    <Typography variant="caption" sx={{ fontSize: '0.5rem', fontWeight: 700 }}>PLANES</Typography>
                </Box>
            </Box>

            {/* Cuerpo de la Tarjeta */}
            <Box sx={{ mb: 2 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: 0.5 }}>ASEGURADO</Typography>
                <Typography variant="body1" sx={{ color: '#fff', fontWeight: 600, mb: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.asegurado || 'N/A'}
                </Typography>

                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, letterSpacing: 0.5 }}>VEHÍCULO</Typography>
                <Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                    🚗 {row.vehiculo || 'N/A'}
                </Typography>
            </Box>

            {/* Acciones de la Tarjeta */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, pt: 2, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Tooltip title="Descargar Excel">
                        <IconButton
                            size="small"
                            onClick={() => onDownloadExcel(row.id)}
                            sx={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderRadius: 2, '&:hover': { background: 'rgba(34, 197, 94, 0.2)' } }}
                        >
                            <SimCardDownloadIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Descargar Word">
                        <IconButton
                            size="small"
                            onClick={() => quotesService.downloadWord(row.id)}
                            sx={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: 2, '&:hover': { background: 'rgba(59, 130, 246, 0.2)' } }}
                        >
                            <DescriptionIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Eliminar Cotización">
                        <IconButton
                            size="small"
                            onClick={() => onDelete(row.id)}
                            sx={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: 2, '&:hover': { background: 'rgba(239, 68, 68, 0.2)' } }}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>

                <Button
                    size="small"
                    onClick={() => setOpen(!open)}
                    endIcon={open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    sx={{ color: '#a78bfa', textTransform: 'none' }}
                >
                    Detalles
                </Button>
            </Box>

            <Collapse in={open} timeout="auto" unmountOnExit>
                <Box sx={{ mt: 2, p: 2, background: 'rgba(0,0,0,0.2)', borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#fff', mb: 1 }}>Parámetros Cotizados</Typography>

                    {row.detalles && row.detalles.length > 0 ? (
                        row.detalles.map((detalleRow) => (
                            <Box key={detalleRow.id} sx={{ mb: 1.5, p: 1.5, borderLeft: '2px solid #a855f7', background: 'rgba(255,255,255,0.02)', borderRadius: '0 8px 8px 0' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="body2" fontWeight="bold" color="#fff">{detalleRow.compania}</Typography>
                                    <Typography variant="caption" color="#cbd5e1" sx={{ background: 'rgba(255,255,255,0.1)', px: 1, borderRadius: 1 }}>{detalleRow.plan}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                                    {detalleRow.prima_uf3 && <Chip size="small" label={`3UF: ${detalleRow.prima_uf3}`} sx={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#cbd5e1' }} />}
                                    {detalleRow.prima_uf5 && <Chip size="small" label={`5UF: ${detalleRow.prima_uf5}`} sx={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#cbd5e1' }} />}
                                    {detalleRow.prima_uf10 && <Chip size="small" label={`10UF: ${detalleRow.prima_uf10}`} sx={{ backgroundColor: 'rgba(255,255,255,0.05)', color: '#cbd5e1' }} />}
                                </Box>
                            </Box>
                        ))
                    ) : (
                        <Typography variant="body2" color="#64748b">No hay detalles disponibles</Typography>
                    )}
                </Box>
            </Collapse>
        </Box>
    );
};

export default HistoryRow;
