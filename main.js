let audioCtx, panner, source, gainNode;
let spaceX, spaceZ;
let isDragging = false;

const startBtn = document.getElementById('startBtn');
const gateSlider = document.getElementById('gateSlider');
const gainSlider = document.getElementById('gainSlider');
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');

startBtn.onclick = async () => {
    if (audioCtx) return;
    audioCtx = new AudioContext({ latencyHint: 'interactive' });

    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
        }
    });

    source = audioCtx.createMediaStreamSource(stream);
    gainNode = audioCtx.createGain();

    panner = new PannerNode(audioCtx, {
        panningModel: 'HRTF',
        distanceModel: 'inverse',
        rolloffFactor: 5,
        refDistance: 1,
        positionX: 1,
        positionY: 0,
        positionZ: -1
    });

    source.connect(panner);
    panner.connect(gainNode);
    gainNode.connect(audioCtx.destination);
}

//マウス操作
canvas.addEventListener('mousedown', () => {
    isDragging = true;
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('mouseleave', () => {
    isDragging = false;
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const normX = x / canvas.width;
    const normY = y / canvas.height;

    spaceX = (normX - 0.5) * 10;
    spaceZ = (normY - 0.5) * 10;

    const now = audioCtx.currentTime;
    panner.positionX.setTargetAtTime(spaceX, now, 0.05);
    panner.positionZ.setTargetAtTime(spaceZ, now, 0.05);

});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 方向表示
    ctx.fillStyle = "rgb(177, 177, 177)";
    ctx.font = "16px sans-serif";
    ctx.fillText("Front", canvas.width / 2 - 20, 30);
    ctx.fillText("Rear", canvas.width / 2 - 20, canvas.height - 20);

    ctx.fillText("Left", 20, canvas.height / 2);
    ctx.fillText("Right", canvas.width - 60, canvas.height / 2);

    // リスナーを描画
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 10, 0, Math.PI * 2);
    ctx.fill();

    // 音源の描画
    if (panner) {
        const drawX = (spaceX + 5) / 10 * canvas.width;
        const drawZ = (spaceZ + 5) / 10 * canvas.height;
        ctx.fillStyle = "#007bff";
        ctx.beginPath();
        ctx.arc(drawX, drawZ, 8, 0, Math.PI * 2);
        ctx.fill();
    }

    requestAnimationFrame(draw);
}

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
draw()