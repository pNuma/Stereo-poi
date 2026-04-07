let audioCtx, source, analyser, gate, panner, stereoPanner, masterGain;
let spaceX = 0,
  spaceZ = 0;
let isDragging = false;
let iconX, iconZ;
let threshold = 0.02;
let destNode, recorder;
let chunks = [];
let analyserLeft, analyserRight;

const micSelect = document.getElementById("micSelect");
const recordBtn = document.getElementById("recordBtn");
const gateSlider = document.getElementById("gateSlider");
const gainSlider = document.getElementById("gainSlider");
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");

async function init(deviceId) {
  if (audioCtx) return;
  audioCtx = new AudioContext({ latencyHint: "interactive" });

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: { exact: deviceId },
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });

  spaceX = 1;
  spaceZ = 0;

  source = audioCtx.createMediaStreamSource(stream);

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;

  gate = audioCtx.createGain();
  masterGain = audioCtx.createGain();

  panner = new PannerNode(audioCtx, {
    panningModel: "HRTF",
    distanceModel: "inverse",
    rolloffFactor: 2,
    refDistance: 1,
    positionX: spaceX,
    positionY: 0,
    positionZ: spaceZ,
  });

  stereoPanner = audioCtx.createStereoPanner();

  source.connect(analyser);
  source.connect(gate);

  gate.connect(panner);
  panner.connect(stereoPanner);
  stereoPanner.connect(masterGain);
  masterGain.connect(audioCtx.destination);

  //録音用
  dest = audioCtx.createMediaStreamDestination();
  masterGain.connect(dest);
  recorder = new MediaRecorder(dest.stream);

  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: "audio/webm" });
    const url = URL.createObjectURL(blob);

    const downloadLink = document.createElement("a");
    downloadLink.href = url;
    downloadLink.download = "sonic_positioner_rec.webm";
    downloadLink.click();

    URL.revokeObjectURL(url);
    chunks = [];
  };

  //左右の音量確認用
  const splitter = audioCtx.createChannelSplitter(2);
  analyserLeft = audioCtx.createAnalyser();
  analyserRight = audioCtx.createAnalyser();
  analyserLeft.fftSize = 2048;
  analyserRight.fftSize = 2048;
  masterGain.connect(splitter);
  splitter.connect(analyserLeft, 0);
  splitter.connect(analyserRight, 1);

  updateGate();
}

async function setupMicList() {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const devices = await navigator.mediaDevices.enumerateDevices();

    micSelect.innerHTML = "";

    const placeholder = document.createElement("option");
    placeholder.textContent = "Select MIC";
    placeholder.disabled = true;
    placeholder.selected = true;
    micSelect.appendChild(placeholder);

    devices.forEach((device) => {
      if (device.kind === "audioinput") {
        const micOption = document.createElement("option");
        micOption.value = device.deviceId;
        micOption.text = device.label;
        micSelect.appendChild(micOption);
      }
    });
  } catch (err) {
    console.error("マイクの許可が取れませんでした: ", err);
    micSelect.innerHTML = '<option value="">マイクが使用できません</option>';
  }
}

recordBtn.onclick = () => {
  if (recorder.state === "inactive") {
    recorder.start();
    recordBtn.innerHTML = '<span class="icon">■</span>';
  } else {
    recorder.stop();
    recordBtn.innerHTML = '<span class="icon">●</span>';
  }
};

// スライダー操作
gateSlider.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  document.getElementById("gateVal").innerText = val.toFixed(3);

  threshold = val;
});

gainSlider.addEventListener("input", (e) => {
  const val = parseFloat(e.target.value);
  document.getElementById("gainVal").innerText = val.toFixed(2);

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
canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  iconX = ((spaceX + 5) / 10) * canvas.width;
  iconZ = ((spaceZ + 5) / 10) * canvas.height;
  const dist = Math.hypot(x - iconX, y - iconZ);
  console.log(dist)
  if (dist < 30) isDragging = true;
});

canvas.addEventListener("pointerup", () => {
  isDragging = false;
});

canvas.addEventListener("pointerleave", () => {
  isDragging = false;
});

canvas.addEventListener("pointermove", (e) => {
  if (!isDragging) return;
  if (!audioCtx) return;

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
  const dist = Math.hypot(spaceX, spaceZ);
  const pan = dist === 0 ? 0 : spaceX / dist;
  stereoPanner.pan.setTargetAtTime(pan, now, 0.05);
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

  // リスナー（自分）を中央に描画
  ctx.font = '40px "Noto Sans Symbols 2", sans-serif';
  ctx.fillStyle = "#ff9f5f";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("🎙", canvas.width / 2, canvas.height / 2);

  // 音源を計算した座標に描画
  const drawX = ((spaceX + 5) / 10) * canvas.width;
  const drawZ = ((spaceZ + 5) / 10) * canvas.height;
  ctx.fillText("🔊", drawX, drawZ);

  const leftRms = calcRms(analyserLeft);
  const rightRms = calcRms(analyserRight);

  ctx.fillStyle = "#7edcff";
  ctx.font = "14px monospace";
  ctx.fillText(`L: ${leftRms.toFixed(1)}`, canvas.width - 80, 30);
  ctx.fillText(`R: ${rightRms.toFixed(1)}`, canvas.width - 80, 50);

  requestAnimationFrame(draw);
}

function calcRms(analyser) {
  if (!analyser) return 0;
  const data = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(data);

  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / data.length);
}

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;
setupMicList();

micSelect.addEventListener("change", async (e) => {
  const selectedDeviceId = e.target.value;
  await init(selectedDeviceId);
});

draw();
