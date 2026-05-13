const video = document.getElementById('camera-stream');
const canvas = document.getElementById('filter-canvas');
const ctx = canvas.getContext('2d');
const filterSelect = document.getElementById('filter-select');
const captureBtn = document.getElementById('capture-btn');
const loadingText = document.getElementById('loading-text');

let currentFilter = 'none';

// Load Assets
const heartImg = new Image(); heartImg.src = 'heart.png';
const birdImg = new Image(); birdImg.src = 'bird.png';

// 1. Load AI and Start Camera
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/')
]).then(startVideo);

function startVideo() {
    loadingText.innerText = "Accessing Camera...";
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "user" } } })
        .then(stream => { video.srcObject = stream; })
        .catch(() => { loadingText.innerText = "Camera Denied!"; });
}

// 2. Main Processing Loop
video.addEventListener('play', () => {
    loadingText.innerText = "Ready!";
    filterSelect.disabled = false;
    captureBtn.disabled = false;

    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
        const resized = faceapi.resizeResults(detections, displaySize);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        resized.forEach(det => {
            const face = det.box;
            if (currentFilter === 'love') drawLove(face);
            if (currentFilter === 'dizzy') drawDizzy(face);
            if (currentFilter === 'twirl') drawTwirl(face);
        });
    }, 50);
});

filterSelect.addEventListener('change', (e) => currentFilter = e.target.value);

// 3. Filter Functions
function drawLove(face) {
    if (!heartImg.complete) return;
    ctx.drawImage(heartImg, face.x, face.y - 50, 50, 50);
    ctx.drawImage(heartImg, face.x + face.width - 50, face.y - 50, 50, 50);
}

function drawDizzy(face) {
    if (!birdImg.complete) return;
    const time = Date.now() / 250;
    const cx = face.x + face.width / 2;
    const cy = face.y - 30;
    for (let i = 0; i < 3; i++) {
        const angle = time + (i * Math.PI * 2 / 3);
        ctx.drawImage(birdImg, cx + Math.cos(angle) * 70 - 20, cy + Math.sin(angle) * 20 - 20, 40, 40);
    }
}

function drawTwirl(face) {
    const pad = 40;
    const x = Math.max(0, face.x - pad), y = Math.max(0, face.y - pad);
    const w = face.width + pad * 2, h = face.height + pad * 2;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w; tempCanvas.height = h;
    const tCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

    tCtx.drawImage(video, x, y, w, h, 0, 0, w, h);
    const imgData = tCtx.getImageData(0, 0, w, h);
    const data = imgData.data;
    const copy = new Uint8ClampedArray(data);

    const midX = w / 2, midY = h / 2, rad = Math.min(w, h) / 2, str = 2.8;

    for (let i = 0; i < h; i++) {
        for (let j = 0; j < w; j++) {
            const dx = j - midX, dy = i - midY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < rad) {
                const ang = Math.atan2(dy, dx) + str * ((rad - dist) / rad);
                let sx = Math.round(midX + dist * Math.cos(ang));
                let sy = Math.round(midY + dist * Math.sin(ang));
                sx = Math.max(0, Math.min(w - 1, sx));
                sy = Math.max(0, Math.min(h - 1, sy));
                const dIdx = (i * w + j) * 4, sIdx = (sy * w + sx) * 4;
                data[dIdx] = copy[sIdx]; data[dIdx+1] = copy[sIdx+1]; data[dIdx+2] = copy[sIdx+2];
            }
        }
    }
    tCtx.putImageData(imgData, 0, 0);
    ctx.drawImage(tempCanvas, x, y);
}

// 4. Snap Photo
captureBtn.addEventListener('click', () => {
    const snap = document.createElement('canvas');
    snap.width = video.videoWidth; snap.height = video.videoHeight;
    const sCtx = snap.getContext('2d');
    sCtx.translate(snap.width, 0); sCtx.scale(-1, 1);
    sCtx.drawImage(video, 0, 0);
    sCtx.drawImage(canvas, 0, 0);
    const link = document.createElement('a');
    link.download = `Selfie_${Date.now()}.png`;
    link.href = snap.toDataURL();
    link.click();
});
