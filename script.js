const video = document.getElementById('camera-stream');
const canvas = document.getElementById('filter-canvas');
const ctx = canvas.getContext('2d');
const filterSelect = document.getElementById('filter-select');
const captureBtn = document.getElementById('capture-btn');
const loadingText = document.getElementById('loading-text');

let currentFilter = 'none';

// --- 1. LOAD YOUR CUSTOM IMAGES ---
const heartImg = new Image(); heartImg.src = 'heart.png'; 
const birdImg = new Image(); birdImg.src = 'bird.png';

// --- 2. LOAD THE AI MODELS ---
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/')
]).then(startVideo);

// --- 3. TURN ON THE FRONT CAMERA ---
function startVideo() {
    loadingText.innerText = "Starting Camera...";
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "user" } } })
        .then(stream => { video.srcObject = stream; })
        .catch(err => {
            loadingText.innerText = "Error: Camera access denied.";
            loadingText.style.color = "red";
        });
}

// --- 4. THE AI FILTER ENGINE ---
video.addEventListener('play', () => {
    loadingText.innerText = "Ready!";
    loadingText.style.color = "#4caf50"; 
    filterSelect.disabled = false;
    captureBtn.disabled = false;

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        // This clears everything so filters don't "stack" on top of each other
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (resizedDetections.length > 0) {
            resizedDetections.forEach(detection => {
                const face = detection.box;
                
                // FIXED: Using your exact function names here
                if (currentFilter === 'love') drawLoveStuck(face);
                if (currentFilter === 'dizzy') drawDizzy(face);
                if (currentFilter === 'twirl') drawTwirl(face);
            });
        }
    }, 50); 
});

filterSelect.addEventListener('change', (e) => { currentFilter = e.target.value; });

// --- 5. THE DRAWING FUNCTIONS ---

// FIXED: Restored your original function name and positioning
function drawLoveStuck(face) {
    if (heartImg.complete) {
        ctx.drawImage(heartImg, face.x, face.y - 40, 40, 40);
        ctx.drawImage(heartImg, face.x + (face.width / 2) - 25, face.y - 65, 50, 50);
        ctx.drawImage(heartImg, face.x + face.width - 40, face.y - 40, 40, 40);
    }
}

function drawDizzy(face) {
    if (birdImg.complete) {
        const time = Date.now() / 300; 
        const centerX = face.x + (face.width / 2);
        const centerY = face.y - 20;
        const radius = 60;

        for (let i = 0; i < 3; i++) {
            const angle = time + (i * ((Math.PI * 2) / 3));
            const birdX = centerX + Math.cos(angle) * radius - 20; 
            const birdY = centerY + Math.sin(angle) * (radius / 3) - 20;
            ctx.drawImage(birdImg, birdX, birdY, 40, 40);
        }
    }
}

// UPGRADED: Python-Style Smooth Twirl
function drawTwirl(face) {
    const pad = 50; 
    const x = Math.max(0, face.x - pad), y = Math.max(0, face.y - pad);
    const w = face.width + (pad * 2), h = face.height + (pad * 2);

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w; tempCanvas.height = h;
    const tCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    tCtx.drawImage(video, x, y, w, h, 0, 0, w, h);
    const imgData = tCtx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const copy = new Uint8ClampedArray(data);

    const midX = w / 2, midY = h / 2;
    const rad = Math.min(w, h) / 1.8; // Slightly larger radius like Python
    const str = 3.2; // Stronger twist

    for (let i = 0; i < h; i++) {
        for (let j = 0; j < w; j++) {
            const dx = j - midX, dy = i - midY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < rad) {
                // Smooth angle calculation
                const ang = Math.atan2(dy, dx) + str * Math.pow((rad - dist) / rad, 2);
                
                let sx = midX + dist * Math.cos(ang);
                let sy = midY + dist * Math.sin(ang);

                // Bilinear-style rounding for smoother edges
                const x0 = Math.floor(sx), y0 = Math.floor(sy);
                const sIdx = (Math.min(h-1, y0) * w + Math.min(w-1, x0)) * 4;
                const dIdx = (i * w + j) * 4;

                data[dIdx] = copy[sIdx];
                data[dIdx + 1] = copy[sIdx + 1];
                data[dIdx + 2] = copy[sIdx + 2];
            }
        }
    }
    tCtx.putImageData(imgData, 0, 0);
    ctx.drawImage(tempCanvas, x, y);
}

// --- 6. CAPTURE & DOWNLOAD ---
captureBtn.addEventListener('click', () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);
    tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

    const link = document.createElement('a');
    link.download = `Selfie_${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
});
