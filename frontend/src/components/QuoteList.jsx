import React from 'react';
import { Card, CardContent, Typography, Grid, Chip, Box, Divider, Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const QuoteList = ({ data }) => {
    if (!data) return null;

    const handleDownload = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `cotizacion_${data.asegurado || 'export'}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Resultado del Análisis</Typography>
                    <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CheckCircleIcon fontSize="small" /> Procesado con Éxito
                    </Typography>
                </Box>
                <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleDownload}>
                    Descargar JSON
                </Button>
            </Box>

            {/* Resumen Cliente/Auto */}
            <Box className="glass-card" sx={{ mb: 4, p: 3, background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.1) 100%)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="overline" sx={{ color: '#a78bfa', fontWeight: 600, letterSpacing: 1 }}>Asegurado</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>{data.asegurado || 'No identificado'}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <Typography variant="overline" sx={{ color: '#a78bfa', fontWeight: 600, letterSpacing: 1 }}>Vehículo</Typography>
                        <Typography variant="h5" sx={{ fontWeight: 700 }}>{data.vehiculo || 'No identificado'}</Typography>
                    </Grid>
                </Grid>
            </Box>

            {/* Grid de Cotizaciones */}
            <Grid container spacing={3}>
                {data.cotizaciones && data.cotizaciones.map((quote, index) => (
                    <Grid item xs={12} md={6} lg={4} key={index}>
                        <Card className="glass-card" sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease', '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 12px 24px rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.5)' } }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" gutterBottom sx={{ fontWeight: 800, color: '#fff' }}>
                                    {quote.compania || 'Compañía Desconocida'}
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 600, mb: 3, color: '#a78bfa' }}>
                                    {quote.plan || 'Plan Base'}
                                </Typography>

                                <Box sx={{ bgcolor: 'rgba(0,0,0,0.2)', p: 2, borderRadius: 1, mb: 2 }}>
                                    <Grid container justifyContent="space-between" textAlign="center">
                                        <Grid item>
                                            <Typography variant="caption" color="text.secondary">UF 3</Typography>
                                            <Typography variant="body1" color="success.main" fontWeight="bold">{quote.primas?.uf3 || '-'}</Typography>
                                        </Grid>
                                        <Grid item>
                                            <Typography variant="caption" color="text.secondary">UF 5</Typography>
                                            <Typography variant="body1" color="success.main" fontWeight="bold">{quote.primas?.uf5 || '-'}</Typography>
                                        </Grid>
                                        <Grid item>
                                            <Typography variant="caption" color="text.secondary">UF 10</Typography>
                                            <Typography variant="body1" color="success.main" fontWeight="bold">{quote.primas?.uf10 || '-'}</Typography>
                                        </Grid>
                                    </Grid>
                                </Box>

                                <Divider sx={{ my: 1 }} />

                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="body2"><strong>RC:</strong> {quote.rc_monto} <Typography component="span" variant="caption" color="text.secondary">({quote.rc_tipo})</Typography></Typography>
                                    <Typography variant="body2"><strong>Taller:</strong> {quote.taller_marca}</Typography>
                                    <Typography variant="body2"><strong>Reposición:</strong> {quote.reposicion_meses ? `${quote.reposicion_meses} meses` : '-'}</Typography>
                                </Box>

                                {quote.observaciones && (
                                    <Typography variant="caption" sx={{ display: 'block', mt: 2, fontStyle: 'italic', color: 'secondary.main' }}>
                                        "{quote.observaciones}"
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {(!data.cotizaciones || data.cotizaciones.length === 0) && (
                <Typography textAlign="center" color="text.secondary" sx={{ mt: 4 }}>
                    No se encontraron cotizaciones en el documento.
                </Typography>
            )}
        </Box>
    );
};

export default QuoteList;
