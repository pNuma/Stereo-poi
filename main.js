let audioCtx, source, analyser, gate, panner, masterGain;
let spaceX = 0, spaceZ = 0;
let isDragging = false;
let threshold = 0.02;

const startBtn = document.getElementById('startBtn');
const recordBtn = document.getElementById('recordBtn');
const gateSlider = document.getElementById('gateSlider');
const gainSlider = document.getElementById('gainSlider');
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');

function initPosition() {
    spaceX = 1;
    spaceZ = 0;
}

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

    initPosition();

    source = audioCtx.createMediaStreamSource(stream);

    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;

    gate = audioCtx.createGain();
    masterGain = audioCtx.createGain();

    panner = new PannerNode(audioCtx, {
        panningModel: 'HRTF',
        distanceModel: 'inverse',
        rolloffFactor: 5,
        refDistance: 1,
        positionX: spaceX,
        positionY: 0,
        positionZ: spaceZ
    });

    source.connect(analyser);
    source.connect(gate);

    gate.connect(panner);
    panner.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    updateGate();
};

// スライダー操作
gateSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById('gateVal').innerText = val.toFixed(3);

    threshold = val;
});

gainSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    document.getElementById('gainVal').innerText = val.toFixed(2);
    
    if (masterGain) {
        masterGain.gain.setTargetAtTime(val, audioCtx.currentTime, 0.05);
    }
});


function updateGate() {
requestAnimationFrame(updateGate);

    const data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);

    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += data[i] * data[i];
    }
    const rms = Math.sqrt(sum / data.length);

    const target = rms > threshold ? 1.0 : 0.0;
    gate.gain.setTargetAtTime(target, audioCtx.currentTime, 0.03);
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

//キャンバスの描画
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
    const drawX = ((panner ? spaceX : 0) + 5) / 10 * canvas.width;
    const drawZ = ((panner ? spaceZ : 0) + 5) / 10 * canvas.height;

    ctx.fillStyle = "#007bff";
    ctx.beginPath();
    ctx.arc(drawX, drawZ, 8, 0, Math.PI * 2);
    ctx.fill();
    requestAnimationFrame(draw);
}

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
draw()