let audioCtx, source, gainNode;

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

    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
}