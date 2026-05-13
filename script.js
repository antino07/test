const video = document.getElementById('camera-stream');
const canvas = document.getElementById('filter-canvas');
const ctx = canvas.getContext('2d');
const filterSelect = document.getElementById('filter-select');
const captureBtn = document.getElementById('capture-btn');
const loadingText = document.getElementById('loading-text');

let currentFilter = 'none';

// --- 1. LOAD THE AI MODELS ---
// We load these directly from a safe, fast web server so you don't have to host them!
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/')
]).then(startVideo);

// --- 2. START THE CAMERA ---
function startVideo() {
    loadingText.innerText = "Starting Camera...";
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "user" } } })
        .then(stream => {
            video.srcObject = stream;
        })
        .catch(err => console.error("Camera error:", err));
}

// --- 3. THE AI FILTER ENGINE ---
video.addEventListener('play', () => {
    loadingText.innerText = "Ready!";
    filterSelect.disabled = false;
    captureBtn.disabled = false;

    // Match the drawing canvas to the video size
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);

    // This loop runs 30 times a second to track your face live
    setInterval(async () => {
        // Find the face
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        
        // Clear the previous frame's drawings
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (resizedDetections.length > 0) {
            const face = resizedDetections[0].box; // Get the box around the face
            
            // Apply the chosen filter
            if (currentFilter === 'love') drawLoveStuck(face);
            if (currentFilter === 'dizzy') drawDizzy(face);
            if (currentFilter === 'twirl') drawTwirl(face);
        }
    }, 50); // 50ms interval = smooth frame rate
});

// Update filter choice when dropdown changes
filterSelect.addEventListener('change', (e) => {
    currentFilter = e.target.value;
});

// --- 4. THE DRAWING FUNCTIONS ---

function drawLoveStuck(face) {
    // Draw 3 pink hearts floating above the head
    ctx.font = "40px Arial";
    ctx.fillText("💖", face.x + (face.width / 4) - 20, face.y - 10);
    ctx.fillText("💖", face.x + (face.width / 2) - 20, face.y - 30);
    ctx.fillText("💖", face.x + (face.width * 0.75) - 20, face.y - 10);
}

function drawDizzy(face) {
    // Make birds (yellow circles) spin in a circle above the head based on time
    const time = Date.now() / 300; 
    const centerX = face.x + (face.width / 2);
    const centerY = face.y - 20;
    const radius = 60;

    for (let i = 0; i < 3; i++) {
        const angle = time + (i * ((Math.PI * 2) / 3));
        const birdX = centerX + Math.cos(angle) * radius;
        const birdY = centerY + Math.sin(angle) * (radius / 3); // Oval orbit

        ctx.beginPath();
        ctx.arc(birdX, birdY, 12, 0, 2 * Math.PI);
        ctx.fillStyle = "yellow";
        ctx.fill();
        ctx.stroke();
    }
}

function drawTwirl(face) {
    // Because true pixel-distortion "twirls" crash mobile browsers, 
    // we draw funny hypnotizing spirals over the whole face area!
    const centerX = face.x + (face.width / 2);
    const centerY = face.y + (face.height / 2);
    
    ctx.font = "100px Arial";
    ctx.textAlign = "center";
    ctx.fillText("🌀", centerX, centerY + 35);
    ctx.textAlign = "start"; // reset
}

// --- 5. CAPTURE & DOWNLOAD ---
captureBtn.addEventListener('click', () => {
    // Create a temporary canvas to merge the video AND the filter overlay
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');

    // Draw video first, then draw the filters on top
    tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);

    // Download the merged image
    const link = document.createElement('a');
    link.download = `my_filter_${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
});
