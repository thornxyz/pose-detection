const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const feedbackDiv = document.querySelector('.feedback');
const recordButton = document.querySelector('.record');
let audio;
let lastBadPostureTime = 0;
let badPostureDuration = 0;
let isRecording = false;
let recordedAngle = null;
let goodPostureAngle = null;
let soundDelayTimer = null;
var blink_counter = 0;
const blink_threshold = 4;

const poseLandmarksDiv = document.querySelector('.hehe');
poseLandmarksDiv.innerText = `Blink count: ${blink_counter}`;

let lastBlinkTime = 0;
const blinkInterval = 500;

function detectBlink(facemarks) {
    const currentTime = new Date().getTime();
    let updatedText = '';

    if (currentTime - lastBlinkTime >= blinkInterval) {
        const ratio = calculateBlinkRatio(facemarks);

        if (ratio > blink_threshold) {
            blink_counter += 1;
            updatedText = `Blink Count: ${blink_counter}`;
            lastBlinkTime = currentTime; // Update the last blink timestamp
        }
    }

    // Update the poseLandmarksDiv with the updated text
    poseLandmarksDiv.innerText = updatedText;
}



function onResults(results) {
    if (!results.poseLandmarks) {
        return;
    }


    const facemarks = results.faceLandmarks;
    detectBlink(facemarks);

    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    canvasCtx.globalCompositeOperation = 'source-in';
    canvasCtx.fillStyle = '#00FF00';
    canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

    // Only overwrite missing pixels.
    canvasCtx.globalCompositeOperation = 'destination-atop';
    canvasCtx.drawImage(
        results.image, 0, 0, canvasElement.width, canvasElement.height);

    canvasCtx.globalCompositeOperation = 'source-over';
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
    drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });

    const landmarks = results.poseLandmarks;
    const a = landmarks[11];
    const b = landmarks[0];
    const c = landmarks[12];
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    const angle = Math.abs((radians * 180.0) / Math.PI);

    let normalizedAngle = angle;
    if (normalizedAngle > 180.0) {
        normalizedAngle = 360 - normalizedAngle;
    }

    const poseLandmarksDiv = document.querySelector('.pose-landmarks');
    poseLandmarksDiv.innerHTML = `Angle: ${normalizedAngle.toFixed(2)} degrees`;

    if (isRecording) {
        recordedAngle = normalizedAngle; // Record the angle during recording mode
        feedbackDiv.textContent = 'Recording...';
    } else if (recordedAngle !== null) { // Check if angle has been recorded
        if (Math.abs(normalizedAngle - recordedAngle) > 10) {
            const currentTime = new Date().getTime();
            const postureDuration = (currentTime - lastBadPostureTime) / 1000; // Convert to seconds

            if (postureDuration >= 3 && !soundDelayTimer) {
                soundDelayTimer = setTimeout(() => {
                    feedbackDiv.textContent = 'BAD';
                    playAlertSound();
                    soundDelayTimer = null;
                }, 3000);
            } else {
                feedbackDiv.textContent = 'BAD';
            }
        } else {
            feedbackDiv.textContent = 'GOOD';
            lastBadPostureTime = 0;
            badPostureDuration = 0;
            clearTimeout(soundDelayTimer);
            soundDelayTimer = null;
        }
    }
}

function calculateBlinkRatio(facemarks) {
    let rh_right = facemarks[236];
    let rh_left = facemarks[362];
    let rv_top = facemarks[386];
    let rv_bottom = facemarks[374];

    let lh_right = facemarks[133];
    let lh_left = facemarks[33];
    let lv_top = facemarks[159];
    let lv_bottom = facemarks[145];

    const rhDistance = euclideanDistance(rh_right, rh_left);
    const rvDistance = euclideanDistance(rv_top, rv_bottom);
    const lvDistance = euclideanDistance(lv_top, lv_bottom);
    const lhDistance = euclideanDistance(lh_right, lh_left);

    const reRatio = rhDistance / rvDistance;
    const leRatio = lhDistance / lvDistance;
    const ratio = (reRatio + leRatio) / 2;
    return ratio;
}

function euclideanDistance(point, point1) {
    const distance = Math.sqrt((point1.x - point.x) ** 2 + (point1.y - point.y) ** 2);
    return distance;
}

function detectBlink(facemarks) {
    const ratio = calculateBlinkRatio(facemarks);

    if (ratio > blink_threshold) {
        blink_counter += 1;
        poseLandmarksDiv.innerText = blink_counter;
    }
}

const holistic = new Holistic({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
    }
});

holistic.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: true,
    smoothSegmentation: true,
    refineFaceLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

holistic.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await holistic.send({ image: videoElement });
    },
    width: 640,
    height: 480
});
camera.start();

function recordAngle() {
    if (!isRecording) {
        isRecording = true;
        recordButton.textContent = 'Stop Recording';
        feedbackDiv.textContent = 'Recording Angle...';
    } else {
        isRecording = false;
        recordButton.textContent = 'Record Angle';
        feedbackDiv.textContent = 'Recording Stopped';
        goodPostureAngle = recordedAngle;
    }
}

function playAlertSound() {

    if (!audio || audio.paused) {
        audio = new Audio('sound.wav');
        audio.play();
    }
}

setTimeout(function () {
    document.querySelector('.loading-box').style.display = 'none';
}, 2000);

function changeBackgroundColor() {
    const feedbackElement = document.querySelector('.feedback');
    const feedElement = document.querySelector('.feed');

    if (feedbackElement.textContent.trim().toLowerCase() === 'bad') {
        feedElement.style.backgroundColor = '#992600';
    } else if (feedbackElement.textContent.trim().toLowerCase() === 'good') {
        feedElement.style.backgroundColor = '#008000';
    } else {

        feedElement.style.backgroundColor = '#008000';
    }
}

changeBackgroundColor();

const observer = new MutationObserver(changeBackgroundColor);
observer.observe(document.querySelector('.feedback'), { childList: true });