// Canvas drawing functionality
class SignaturePad {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.isDrawing = false;
        this.points = [];
        
        this.setupEvents();
        this.setupStyle();
    }

    setupStyle() {
        this.ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color');
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
    }

    setupEvents() {
        // Mouse events
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startDrawing(e.touches[0]);
        });
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.draw(e.touches[0]);
        });
        this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
    }

    startDrawing(e) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.points = [{x, y}];
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    }

    draw(e) {
        if (!this.isDrawing) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.points.push({x, y});
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }

    stopDrawing() {
        this.isDrawing = false;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.points = [];
    }
}

// Function to convert signature fields to canvas
function initializeSignatureFields() {
    const signatureFields = document.querySelectorAll('.signature-field');
    signatureFields.forEach(field => {
        const container = document.createElement('div');
        container.className = 'signature-container';
        
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 100;
        canvas.className = 'signature-canvas';
        
        const clearBtn = document.createElement('button');
        clearBtn.textContent = 'Clear Signature';
        clearBtn.className = 'clear-signature';
        
        container.appendChild(canvas);
        container.appendChild(clearBtn);
        field.parentNode.replaceChild(container, field);
        
        const signaturePad = new SignaturePad(canvas);
        clearBtn.addEventListener('click', () => signaturePad.clear());
    });
}

// Function to convert text fields to input elements
function initializeTextFields() {
    const textFields = document.querySelectorAll('.text-field');
    textFields.forEach(field => {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-input';
        input.placeholder = field.getAttribute('data-placeholder') || 'Enter text here';
        field.parentNode.replaceChild(input, field);
    });
}

// Initialize everything when the document loads
document.addEventListener('DOMContentLoaded', () => {
    initializeSignatureFields();
    initializeTextFields();
    
    // Add PDF save functionality
    const saveButton = document.getElementById('savePDF');
    if (saveButton) {
        saveButton.addEventListener('click', generatePDF);
    }
});

// Function to generate and save PDF
function generatePDF() {
    // Hide the save button temporarily
    const saveButton = document.getElementById('savePDF');
    saveButton.style.display = 'none';

    // Get the content container
    const element = document.getElementById('pdf-content');

    // Get the document title to use as filename
    const filename = document.title.toLowerCase().replace(/\s+/g, '-') + '.pdf';

    // Configure PDF options
    const opt = {
        margin: [15, 15, 15, 15],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { 
            scale: 1.5,
            useCORS: true,
            logging: false,
            scrollX: 0,
            scrollY: 0,
            windowWidth: 900,
            letterRendering: true,
            removeContainer: true
        },
        jsPDF: { 
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait',
            compress: true
        },
        pagebreak: { 
            mode: ['avoid-all', 'css', 'legacy'],
            before: '.page-break',
            avoid: ['tr', 'td', '.signature-container']
        }
    };

    // Create worker
    const worker = html2pdf().set(opt);

    // Promise chain
    worker
        .from(element)
        .toContainer()
        .then(container => {
            // Let the content adjust to the container
            return worker.toCanvas();
        })
        .then(canvas => {
            // Convert to PDF
            return worker.toPdf();
        })
        .save()
        .then(() => {
            saveButton.style.display = 'block';
        })
        .catch(err => {
            console.error('Error generating PDF:', err);
            saveButton.style.display = 'block';
        });
} 