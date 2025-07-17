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

// Text-to-Speech functionality
let voices = [];
const populateVoiceList = () => {
  voices = window.speechSynthesis.getVoices();
};

populateVoiceList();
if (window.speechSynthesis.onvoiceschanged !== undefined) {
  window.speechSynthesis.onvoiceschanged = populateVoiceList;
}

function speak(text, callbacks = {}) {
  if (typeof text !== 'string' || !text.trim()) {
    if (callbacks.onend) callbacks.onend();
    return;
  }

  window.speechSynthesis.cancel(); // Cancel any previous speech

  const utterance = new SpeechSynthesisUtterance(text);

  if (callbacks.onstart) utterance.onstart = callbacks.onstart;
  if (callbacks.onend) utterance.onend = callbacks.onend;
  if (callbacks.onerror) utterance.onerror = callbacks.onerror;

  const preferredVoiceType = localStorage.getItem('ttsVoice') || 'male';

  // Language setting from prompts.html
  const selectedLang = localStorage.getItem('selectedLanguage') || 'en';
  const langMap = {
      'en': 'en-US', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE', 'it': 'it-IT',
      'pt': 'pt-BR', 'ru': 'ru-RU', 'zh': 'zh-CN', 'ja': 'ja-JP', 'ko': 'ko-KR',
      'ar': 'ar-SA', 'hi': 'hi-IN'
  };
  utterance.lang = langMap[selectedLang] || 'en-US';

  if (voices.length > 0) {
    let selectedVoice = null;
    // 1. Exact language match (e.g., 'es-ES')
    const langVoices = voices.filter(voice => voice.lang === utterance.lang);
    
    // 2. Filter by preferred gender if available
    const gender = (preferredVoiceType === 'female') ? 'female' : 'male';
    let genderVoices = langVoices.filter(voice => voice.name.toLowerCase().includes(gender));

    if (genderVoices.length > 0) {
        selectedVoice = genderVoices[0];
    } else if (langVoices.length > 0) {
        // 3. Fallback to any voice for the language if gender preference not met
        selectedVoice = langVoices[0];
    } else {
        // 4. Broader language match (e.g., 'en' for 'en-GB' if 'en-US' not found)
        const baseLang = utterance.lang.split('-')[0];
        const anyLangVersionVoices = voices.filter(voice => voice.lang.startsWith(baseLang));
        if (anyLangVersionVoices.length > 0) {
            selectedVoice = anyLangVersionVoices[0];
        }
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
  }

  window.speechSynthesis.speak(utterance);
}

// Function to validate if an action is a valid spoken choice
function isValidSpokenChoice(action) {
    if (typeof action !== 'string') return false;
    
    // Only accept actions that indicate something was spoken from the allowed pages
    const validPrefixes = [
        'Pic Choice Spoken:',
        'Prompt Spoken:',
        'Keyboard Spoken:'
    ];
    
    return validPrefixes.some(prefix => action.startsWith(prefix));
}

// Core logging function - now logs to the current patient
function logAction(action) {
    try {
        const timestamp = new Date().toISOString();

        // Only accept log entries that are spoken choices from specific pages
        if (!isValidSpokenChoice(action)) {
            // console.log("Invalid log action:", action); // Optional: for debugging
            return; // Ignore invalid log entries
        }

        // Ensure action is a string
        let actionText = action;
        if (typeof action !== 'string') {
            return; // Ignore non-string actions
        }

        const logEntry = { action: actionText, timestamp };
        
        let patients = JSON.parse(localStorage.getItem('patients') || '[]');
        let currentPatient = JSON.parse(localStorage.getItem('currentPatient'));

        if (currentPatient && currentPatient.firstName && currentPatient.lastName && currentPatient.dob) {
            let patientFound = false;
            for (let i = 0; i < patients.length; i++) {
                if (patients[i].firstName === currentPatient.firstName && 
                    patients[i].lastName === currentPatient.lastName &&
                    patients[i].dob === currentPatient.dob) {
                    if (!patients[i].activities) {
                        patients[i].activities = [];
                    }
                    patients[i].activities.push(logEntry);
                    // Limit activities per patient
                    if (patients[i].activities.length > 500) {
                        patients[i].activities.shift();
                    }
                    patientFound = true;
                    break;
                }
            }

            if (patientFound) {
                localStorage.setItem('patients', JSON.stringify(patients));
            } else {
                // Fallback to global log if patient somehow not in patients list
                const log = JSON.parse(localStorage.getItem('ccpcsLog') || '[]');
                log.push(logEntry);
                localStorage.setItem('ccpcsLog', JSON.stringify(log));
            }
        } else {
             // Fallback to global log if no current patient
            const log = JSON.parse(localStorage.getItem('ccpcsLog') || '[]');
            log.push(logEntry);
            if (log.length > 1000) { // Limit global log size
                log.shift();
            }
            localStorage.setItem('ccpcsLog', JSON.stringify(log));
        }
    } catch (error) {
        console.error("Error logging action:", error);
    }
} 