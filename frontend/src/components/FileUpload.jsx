import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Button, CircularProgress, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Alert, Snackbar, Select, MenuItem, FormControl, InputLabel, Backdrop, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import VisibilityIcon from '@mui/icons-material/Visibility';
import api from '../services/api';
import SparkMD5 from 'spark-md5';

const FileUpload = ({ onQuoteProcessed }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [files, setFiles] = useState([]); // Array of { file: File, md5: string, companyId: number|string }
    const [companies, setCompanies] = useState([]);
    const [showDebug, setShowDebug] = useState(false);
    const [toastOpen, setToastOpen] = useState(false);
    const [toastMsg, setToastMsg] = useState('');
    const [debugData, setDebugData] = useState(null);

    // State for optimization suggestion
    const [suggestionOpen, setSuggestionOpen] = useState(false);
    const [suggestionData, setSuggestionData] = useState(null);

    React.useEffect(() => {
        api.get('/empresas')
            .then(res => setCompanies(res.data))
            .catch(err => console.error("Error cargando empresas:", err));

        // Cargar estado DEBUG (Opcional, desactivado para evitar 404 si no existe endpoint)
        // api.get('/parametros')...
    }, []);

    const calculateMD5 = (file) => {
        return new Promise((resolve, reject) => {
            const blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
            const chunkSize = 2097152; // 2MB
            const chunks = Math.ceil(file.size / chunkSize);
            const spark = new SparkMD5.ArrayBuffer();
            const fileReader = new FileReader();
            let currentChunk = 0;

            fileReader.onload = function (e) {
                spark.append(e.target.result);
                currentChunk++;

                if (currentChunk < chunks) {
                    loadNext();
                } else {
                    const hash = spark.end();
                    resolve(hash);
                }
            };

            fileReader.onerror = function () {
                reject('Error leyendo archivo');
            };

            function loadNext() {
                const start = currentChunk * chunkSize;
                const end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;
                fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
            }

            loadNext();
        });
    };

    const onDrop = useCallback(async (acceptedFiles) => {
        setError(null);

        // 1. Calcular MD5 de TODOS los archivos nuevos primero
        const calculatedFiles = [];
        for (const file of acceptedFiles) {
            try {
                const md5 = await calculateMD5(file);
                calculatedFiles.push({ file, md5 });
            } catch (err) {
                console.error("Error calculando hash", err);
            }
        }

        // 2. Actualizar estado de forma ATÓMICA
        setFiles(prevFiles => {
            const uniqueNewFiles = [];
            let duplicatesInBatch = 0;

            for (const candidate of calculatedFiles) {
                // Verificar contra el estado previo REAL (prevFiles)
                const existsInState = prevFiles.some(f => f.md5 === candidate.md5);
                // Verificar contra el lote actual
                const existsInBatch = uniqueNewFiles.some(f => f.md5 === candidate.md5);

                if (!existsInState && !existsInBatch) {
                    // PRE-SELECCIÓN AUTOMÁTICA DE EMPRESA
                    let matchedCompanyId = ''; // Default vacío (Obligatorio elegir)
                    if (companies && companies.length > 0) {
                        const fileNameUpper = candidate.file.name.toUpperCase();
                        const found = companies.find(c => fileNameUpper.includes(c.nombre.toUpperCase()));
                        if (found) matchedCompanyId = found.id;
                    }

                    // Agregamos companyId al objeto del archivo
                    uniqueNewFiles.push({ ...candidate, companyId: matchedCompanyId });
                } else {
                    duplicatesInBatch++;
                }
            }

            if (duplicatesInBatch > 0) {
                console.warn(`Se detectaron ${duplicatesInBatch} duplicados y fueron ignorados.`);
            }

            return [...prevFiles, ...uniqueNewFiles];
        });
    }, [companies]); // Agregamos 'companies' a dependencias para que el auto-match funcione

    const removeFile = (md5ToRemove) => {
        setFiles(files.filter(f => f.md5 !== md5ToRemove));
    };

    const handleCompanyChange = (md5, companyId) => {
        setFiles(files.map(f => f.md5 === md5 ? { ...f, companyId } : f));
    };

    const handlePreview = (file) => {
        const url = URL.createObjectURL(file);
        window.open(url, '_blank');
    };

    const processFiles = async () => {
        if (files.length === 0) return;

        setLoading(true);
        setError(null);
        setDebugData(null);
        onQuoteProcessed(null);

        // Generar ID de Lote Único
        const loteId = Date.now().toString();

        const combinedDebug = [];
        let finalQuoteRecord = null;

        try {
            for (const { file } of files) {
                const formData = new FormData();
                formData.append('loteId', loteId);
                formData.append('pdfFile', file);
                if (file.companyId) formData.append('companyId', file.companyId);

                const response = await api.post('/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                const data = response.data;
                console.log("Respuesta Individual:", data);

                // Acumulamos la respuesta RAW para el debugger
                if (data.raw_ai_response) {
                    combinedDebug.push({
                        archivo: file.name,
                        ai_json: data.raw_ai_response
                    });
                }

                // Verificamos si hay sugerencia de optimización (solo una por batch para no molestar)
                if (data.optimization_suggestion && !suggestionData) {
                    setSuggestionData(data.optimization_suggestion);
                    setSuggestionOpen(true);
                }

                // El último registro contiene todos los detalles acumulados
                finalQuoteRecord = data;
            }

            console.log("Resultados Finales:", finalQuoteRecord);
            setDebugData(combinedDebug); // Ahora pasamos un ARRAY al debugger
            onQuoteProcessed(finalQuoteRecord); // La grilla usa el registro maestro final

            setFiles([]);

        } catch (err) {
            console.error('Error uploading files:', err);
            const serverError = err.response?.data || { error: err.message };
            setDebugData(serverError); // Mostrar error del servidor en el debugger
            setError('Hubo un error al procesar. Revisa el debugger abajo 👇');
        } finally {
            setLoading(false);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        multiple: true
    });

    return (
        <Box>
            <Paper
                {...getRootProps()}
                sx={{
                    p: 5,
                    border: '2px dashed',
                    borderColor: isDragActive ? 'primary.main' : 'grey.700',
                    backgroundColor: isDragActive ? 'rgba(99, 102, 241, 0.1)' : 'background.paper',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    mb: 3,
                    '&:hover': {
                        borderColor: 'primary.main',
                        bgcolor: 'rgba(99, 102, 241, 0.05)'
                    }
                }}
            >
                <input {...getInputProps()} />
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <CloudUploadIcon sx={{ fontSize: 60, color: 'primary.main' }} />
                    <Typography variant="h6">
                        {isDragActive ? 'Suelta los archivos aquí...' : 'Arrastra y suelta tus PDFs aquí'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Validación automática de duplicados por MD5
                    </Typography>
                </Box>
            </Paper>

            {files.length > 0 && (
                <TableContainer component={Paper} sx={{ mb: 3 }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Nombre del Archivo</TableCell>
                                <TableCell>Empresa Asignada</TableCell>
                                <TableCell align="right">MD5 (Hash)</TableCell>
                                <TableCell align="right">Tamaño</TableCell>
                                <TableCell align="right">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {files.map((fileObj, index) => (
                                <TableRow key={fileObj.md5}>
                                    <TableCell component="th" scope="row">
                                        {fileObj.file.name}
                                    </TableCell>
                                    <TableCell>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>Empresa</InputLabel>
                                            <Select
                                                value={fileObj.companyId || ''}
                                                label="Empresa"
                                                onChange={(e) => handleCompanyChange(fileObj.md5, e.target.value)}
                                            >
                                                <MenuItem value="" disabled><em>Seleccione Empresa</em></MenuItem>
                                                {companies.map(c => (
                                                    <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>
                                        {fileObj.md5.substring(0, 8)}...
                                    </TableCell>
                                    <TableCell align="right">
                                        {(fileObj.file.size / 1024).toFixed(1)} KB
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton aria-label="preview" onClick={() => handlePreview(fileObj.file)} size="small" color="primary" sx={{ mr: 1 }}>
                                            <VisibilityIcon />
                                        </IconButton>
                                        <IconButton aria-label="delete" onClick={() => removeFile(fileObj.md5)} size="small" color="error">
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {files.length > 0 && (
                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    size="large"
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <AnalyticsIcon />}
                    onClick={processFiles}
                    disabled={loading || files.some(f => !f.companyId)}
                >
                    {loading ? 'Procesando con IA...' :
                        files.some(f => !f.companyId) ? 'Selecciona Empresa para Continuar' :
                            `Analizar ${files.length} Archivo(s)`}
                </Button>
            )}

            {error && (
                <Typography color="error" variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
                    {error}
                </Typography>
            )}

            <Snackbar
                open={toastOpen}
                autoHideDuration={4000}
                onClose={() => setToastOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setToastOpen(false)} severity="warning" sx={{ width: '100%' }}>
                    {toastMsg}
                </Alert>
            </Snackbar>

            {/* Dialogo de Sugerencia de Optimización */}
            <Dialog
                open={suggestionOpen}
                onClose={() => setSuggestionOpen(false)}
            >
                <DialogTitle>🚀 Optimización Detectada</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {suggestionData?.message}
                        <br /><br />
                        ¿Desea actualizar la configuración de <b>{suggestionData?.companyName}</b> para leer solo estas páginas en el futuro? Esto hará el proceso más rápido y económico.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSuggestionOpen(false)} color="secondary">
                        No, seguir leyendo todo
                    </Button>
                    <Button
                        onClick={() => {
                            if (suggestionData) {
                                api.put(`/empresas/${suggestionData.companyId}`, {
                                    paginas_procesamiento: suggestionData.suggestedPages
                                })
                                    .then(() => {
                                        setToastMsg(`✅ Configuración actualizada para ${suggestionData.companyName}`);
                                        setToastOpen(true);
                                        // Actualizar lista local de empresas para reflejar el cambio en futuros selects
                                        setCompanies(prev => prev.map(c => c.id === suggestionData.companyId ? { ...c, paginas_procesamiento: suggestionData.suggestedPages } : c));
                                    })
                                    .catch(err => {
                                        console.error("Error actualizando empresa:", err);
                                        setToastMsg("❌ Error al actualizar configuración.");
                                        setToastOpen(true);
                                    });
                            }
                            setSuggestionOpen(false);
                            setSuggestionData(null);
                        }}
                        color="primary"
                        variant="contained"
                        autoFocus
                    >
                        Sí, optimizar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Debugger Section */}
            {showDebug && debugData && (
                <Box sx={{ mt: 4, p: 2, bgcolor: '#1e1e1e', borderRadius: 2, border: '1px solid #333' }}>
                    <Typography variant="subtitle2" sx={{ color: '#aaa', mb: 1, fontFamily: 'monospace' }}>
                        🐞 DEBUGGER: Respuesta Raw del Servidor
                    </Typography>
                    <Box sx={{
                        maxHeight: '300px',
                        overflow: 'auto',
                        bgcolor: '#000',
                        p: 2,
                        borderRadius: 1,
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        color: debugData.error ? '#ff5555' : '#0f0'
                    }}>
                        <pre>{JSON.stringify(debugData, null, 2)}</pre>
                    </Box>
                </Box>
            )}
            <Backdrop
                sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1, flexDirection: 'column', gap: 2 }}
                open={loading}
            >
                <CircularProgress color="inherit" />
                <Typography variant="h6">Procesando documentos con IA...</Typography>
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Por favor espere, esto puede tomar unos segundos.</Typography>
            </Backdrop>
        </Box >
    );
};

export default FileUpload;
