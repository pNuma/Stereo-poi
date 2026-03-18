let audioCtx, panner, source, gainNode;
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

    const spaceX = (normX - 0.5) * 10;
    const spaceZ = (normY - 0.5) * 10;

    const now = audioCtx.currentTime;
    panner.positionX.setTargetAtTime(spaceX, now, 0.05);
    panner.positionZ.setTargetAtTime(spaceZ, now, 0.05);
});

