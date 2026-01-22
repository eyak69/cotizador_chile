const dropArea = document.getElementById('drop-area');
const fileElem = document.getElementById('fileElem');
const processBtn = document.getElementById('processBtn');
const spinner = document.getElementById('spinner');
const resultSection = document.getElementById('result-section');
const downloadBtn = document.getElementById('downloadBtn');

let selectedFile = null;
let lastResult = null;

// Drag & Drop events
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

['dragenter', 'dragover'].forEach(eventName => {
    dropArea.addEventListener(eventName, highlight, false);
});

['dragleave', 'drop'].forEach(eventName => {
    dropArea.addEventListener(eventName, unhighlight, false);
});

function highlight(e) {
    dropArea.classList.add('highlight');
}

function unhighlight(e) {
    dropArea.classList.remove('highlight');
}

dropArea.addEventListener('drop', handleDrop, false);
dropArea.addEventListener('click', () => fileElem.click());
fileElem.addEventListener('change', handleFiles);

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles({ target: { files: files } });
}

function handleFiles(e) {
    const files = e.target.files;
    if (files.length > 0) {
        selectedFile = files[0];
        if (selectedFile.type !== 'application/pdf') {
            alert('Por favor, sube solo archivos PDF.');
            selectedFile = null;
            return;
        }

        // Actualizar UI
        dropArea.querySelector('h3').textContent = `Archivo seleccionado:`;
        dropArea.querySelector('p').textContent = selectedFile.name;
        dropArea.classList.add('highlight'); // Mantener highlight visual
        processBtn.disabled = false;
        processBtn.style.opacity = '1';
    }
}

processBtn.addEventListener('click', uploadFile);

async function uploadFile() {
    if (!selectedFile) return;

    // UI Loading state
    processBtn.disabled = true;
    spinner.style.display = 'block';
    processBtn.querySelector('span').textContent = 'Procesando...';
    resultSection.classList.add('hidden');

    const formData = new FormData();
    formData.append('pdfFile', selectedFile);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Error en la respuesta del servidor');
        }

        const data = await response.json();
        lastResult = data;
        displayResult(data);

    } catch (error) {
        console.error('Error:', error);
        alert('Hubo un error al procesar el archivo. Revisa la consola o intenta de nuevo.');
    } finally {
        processBtn.disabled = false;
        spinner.style.display = 'none';
        processBtn.querySelector('span').textContent = 'Procesar Cotización';
    }
}

function displayResult(data) {
    // Encabezado principal
    document.getElementById('res-asegurado').textContent = data.asegurado || 'No identificado';
    document.getElementById('res-vehiculo').textContent = data.vehiculo || 'No identificado';

    const container = document.getElementById('quotes-container');
    container.innerHTML = ''; // Limpiar anteriores

    if (data.cotizaciones && data.cotizaciones.length > 0) {
        data.cotizaciones.forEach(quote => {
            const card = document.createElement('div');
            card.className = 'quote-card';

            // Construir primas
            const primasHtml = `
                <div class="primas-grid">
                    <div class="prima-item">
                        <span class="label">UF 3</span>
                        <span class="value">${quote.primas?.uf3 || '-'}</span>
                    </div>
                    <div class="prima-item">
                        <span class="label">UF 5</span>
                        <span class="value">${quote.primas?.uf5 || '-'}</span>
                    </div>
                    <div class="prima-item">
                        <span class="label">UF 10</span>
                        <span class="value">${quote.primas?.uf10 || '-'}</span>
                    </div>
                </div>
            `;

            card.innerHTML = `
                <div class="quote-header">
                    <h4>${quote.compania || 'Compañía Desconocida'}</h4>
                    <span class="plan-name">${quote.plan || 'Plan Base'}</span>
                </div>
                
                ${primasHtml}

                <div class="quote-details">
                    <p><strong>RC:</strong> ${quote.rc_monto || '-'} (${quote.rc_tipo || '-'})</p>
                    <p><strong>Taller Marca:</strong> ${quote.taller_marca || '-'}</p>
                    <p><strong>Reposición:</strong> ${quote.reposicion_meses ? quote.reposicion_meses + ' meses' : '-'}</p>
                    ${quote.observaciones ? `<p class="obs"><em>${quote.observaciones}</em></p>` : ''}
                </div>
            `;
            container.appendChild(card);
        });
    } else {
        container.innerHTML = '<p class="no-data">No se encontraron cotizaciones en el documento.</p>';
    }

    resultSection.classList.remove('hidden');
    // Scroll suave hacia los resultados
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

downloadBtn.addEventListener('click', () => {
    if (!lastResult) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lastResult, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "cotizacion_" + (lastResult.cliente?.rut || 'generada') + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
});
