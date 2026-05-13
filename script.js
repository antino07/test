const video = document.getElementById('camera-stream');
const canvas = document.getElementById('filter-canvas');
const ctx = canvas.getContext('2d');
const filterSelect = document.getElementById('filter-select');
const captureBtn = document.getElementById('capture-btn');
const loadingText = document.getElementById('loading-text');

let currentFilter = 'none';

// --- 1. LOAD YOUR CUSTOM IMAGES ---
const heartImg = new Image();
heartImg.src = 'heart.png'; 

const birdImg = new Image();
birdImg.src = 'bird.png';

// --- 2. LOAD THE AI MODELS ---
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/')
]).then(startVideo);

// --- 3. TURN ON THE FRONT CAMERA ---
function startVideo() {
    loadingText.innerText = "Starting Camera...";
    // "facingMode: user" forces the front selfie camera on phones
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "user" } } })
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => {
            console.error("Camera error:", err);
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

    // Loop to draw the filters constantly
    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (resizedDetections.length > 0) {
            // Apply to all faces found
            resizedDetections.forEach(detection => {
                const face = detection.box;
                
                if (currentFilter === 'love') drawLoveStuck(face);
                if (currentFilter === 'dizzy') drawDizzy(face);
                if (currentFilter === 'twirl') drawTwirl(face);
            });
        }
    }, 50); 
});

filterSelect.addEventListener('change', (e) => {
    currentFilter = e.target.value;
});

// --- 5. THE DRAWING FUNCTIONS ---
function drawLoveStuck(face) {
    if (heartImg.complete) {
        ctx.drawImage(heartImg, face.x, face.y - 40, 40, 40);
        ctx.drawImage(heartImg, face.x + (face.width / 2) - 20, face.y - 60, 50, 50);
        ctx.drawImage(heartImg, face.x + face.width - 40, face.y - 30, 35, 35);
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

function drawTwirl(face) {
    // Emoji spiral (true pixel distortion crashes mobile browsers without WebGL)
    const centerX = face.x + (face.width / 2);
    const centerY = face.y + (face.height / 2);
    
    ctx.font = "100px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🌀", centerX, centerY + 35);
    ctx.textAlign = "start"; 
}

// --- 6. CAPTURE & DOWNLOAD ---
captureBtn.addEventListener('click', () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');

    // Flip horizontally to match what the user sees on screen
    tempCtx.translate(tempCanvas.width, 0);
    tempCtx.scale(-1, 1);

    tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

    const link = document.createElement('a');
    link.download = `Selfie_${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
});
