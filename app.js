// -----------------------------------------------------------------------------
// ***** Setup ROSLIB connection *****
// -----------------------------------------------------------------------------

// Extract the base URL, where this page is being served
const baseUrl = window.location.hostname;
// Duckiebot's IP address or [hostname].local
const ROBOT_IP = baseUrl;
const ROBOT_HOSTNAME = baseUrl.replace(".local", "");
const ROSBRIDGE_PORT = '9001';

// Initialize ROSLIB
const ros = new ROSLIB.Ros({
    url: `ws://${ROBOT_IP}:${ROSBRIDGE_PORT}`
});

ros.on('connection', () => {
    console.log(`Connected to ROS on: ${ROBOT_IP}:${ROSBRIDGE_PORT}`);
    // // check topics
    // ros.getTopics(function(topics) {
    //     console.log('Available topics:', topics.topics);
    // });

    // update info
    document.getElementById("info-banner").innerText = `Connected to: ${ROBOT_IP}`;
});

ros.on('error', (error) => {
    console.error('Error connecting to ROS:', error);
});

ros.on('close', () => {
    console.log('Connection to ROS closed.');
});


// -----------------------------------------------------------------------------
// ***** Setup ROS publishers *****
// -----------------------------------------------------------------------------

// Publisher for WheelsCmd
const wheelsCmd = new ROSLIB.Topic({
    ros: ros,
    name: `/${ROBOT_HOSTNAME}/wheels_driver_node/wheels_cmd`,
    messageType: 'duckietown_msgs/WheelsCmdStamped'
});

// Function to publish wheel commands
function sendWheelsCmd(left, right) {
    const msg = new ROSLIB.Message({
        header: {
            stamp: {
                secs: Math.floor(Date.now() / 1000),
                nsecs: (Date.now() % 1000) * 1000000
            },
            frame_id: ''
        },
        vel_left: left,
        vel_right: right
    });
    wheelsCmd.publish(msg);
}


// -----------------------------------------------------------------------------
// ***** Setup ROS subscribers *****
// -----------------------------------------------------------------------------

// Subscriber for camera stream
const imageListener = new ROSLIB.Topic({
    ros: ros,
    name: `/${ROBOT_HOSTNAME}/camera_node/image/compressed`,
    messageType: 'sensor_msgs/CompressedImage'
});

imageListener.subscribe(function(message) {
    // Assuming the image is in JPEG format
    const imageData = 'data:image/jpeg;base64,' + message.data;
    document.getElementById('video-stream').src = imageData;
});


// -----------------------------------------------------------------------------
// ***** Setup DOM elements for common access *****
// -----------------------------------------------------------------------------
// slider and value elements for left and right wheel limits
const sliderLimLeft = document.getElementById('slider1');
const sliderLimRight = document.getElementById('slider2');
const sliderValLimLeft = document.getElementById('slider1-value');
const sliderValLimRight = document.getElementById('slider2-value');


// -----------------------------------------------------------------------------
// ***** Joystick and Keyboard Controls *****
// -----------------------------------------------------------------------------

// Joystick Control
const joystickContainer = document.getElementById('joystick-container');
const joystick = document.getElementById('joystick');
// mouse is dragging?
let dragging = false;

// Utility function to clamp values
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

// function to reset joystick and send stop command
function resetJoystick() {
    joystick.style.left = (joystickContainer.clientWidth / 2 - joystick.offsetWidth / 2) + 'px';
    joystick.style.top = (joystickContainer.clientHeight / 2 - joystick.offsetHeight / 2) + 'px';
    sendWheelsCmd(0, 0);
}

let animationFrameId;

// Function to update joystick position and send commands
function updateJoystick(x, y) {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    animationFrameId = requestAnimationFrame(() => {
        const containerRect = joystickContainer.getBoundingClientRect();
        const maxOffset = (containerRect.width - joystick.offsetWidth) / 2;
        const newX = clamp(x, -maxOffset, maxOffset);
        const newY = clamp(y, -maxOffset, maxOffset);

        joystick.style.left = (containerRect.width / 2 + newX - joystick.offsetWidth / 2) + 'px';
        joystick.style.top = (containerRect.height / 2 - newY - joystick.offsetHeight / 2) + 'px';

        // Normalize to [-1, 1]
        const normX = newX / maxOffset;
        const normY = newY / maxOffset;

        // Get slider values
        const limitLeft = parseInt(sliderLimLeft.value) / 100.0; // 0 to 1
        const limitRight = parseInt(sliderLimRight.value) / 100.0; // 0 to 1

        // Map joystick to left and right wheel velocities with limits
        const maxSpeed = 1.0; // allowed input range: [-1.0, 1.0]
        const leftSpeed = clamp(normY + normX, -1, 1) * maxSpeed * limitLeft;
        const rightSpeed = clamp(normY - normX, -1, 1) * maxSpeed * limitRight;

        sendWheelsCmd(leftSpeed, rightSpeed);
    });
}

// Mouse events for joystick
joystick.addEventListener('mousedown', (e) => {
    dragging = true;
});

document.addEventListener('mousemove', (e) => {
    if (dragging) {
        const rect = joystickContainer.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = - (e.clientY - rect.top - rect.height / 2);
        updateJoystick(x, y);
    }
});

document.addEventListener('mouseup', (e) => {
    if (dragging) {
        dragging = false;
        // Reset joystick to center
        joystick.style.left = (joystickContainer.clientWidth / 2 - joystick.offsetWidth / 2) + 'px';
        joystick.style.top = (joystickContainer.clientHeight / 2 - joystick.offsetHeight / 2) + 'px';
        sendWheelsCmd(0, 0);
    }
});

// Keyboard controls
const keysPressed = {};

document.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key) && !keysPressed[e.key]) {
        keysPressed[e.key] = true;
        updateFromKeys();
    }
});

document.addEventListener('keyup', (e) => {
    if (keysPressed[e.key]) {
        delete keysPressed[e.key];
        updateFromKeys();
    }
});

function updateFromKeys() {
    let x = 0;
    let y = 0;

    if (keysPressed['ArrowUp'] || keysPressed['w']) y += 1;
    if (keysPressed['ArrowDown'] || keysPressed['s']) y -= 1;
    if (keysPressed['ArrowLeft'] || keysPressed['a']) x -= 1;
    if (keysPressed['ArrowRight'] || keysPressed['d']) x += 1;

    // Clamp to max values
    x = clamp(x, -1, 1);
    y = clamp(y, -1, 1);

    // Update joystick UI
    const containerRect = joystickContainer.getBoundingClientRect();
    const maxOffset = (containerRect.width - joystick.offsetWidth) / 2;
    joystick.style.left = (containerRect.width / 2 + x * maxOffset - joystick.offsetWidth / 2) + 'px';
    joystick.style.top = (containerRect.height / 2 - y * maxOffset - joystick.offsetHeight / 2) + 'px';

    // Get slider values
    const limitLeft = parseInt(sliderLimLeft.value) / 100.0; // 0 to 1
    const limitRight = parseInt(sliderLimRight.value) / 100.0; // 0 to 1

    // Map joystick to left and right wheel velocities with proportional limits
    const maxSpeed = 1.0;
    const leftSpeed = clamp(y + x, -1, 1) * maxSpeed * limitLeft;
    const rightSpeed = clamp(y - x, -1, 1) * maxSpeed * limitRight;

    // Send wheel commands
    sendWheelsCmd(leftSpeed, rightSpeed);
}

// -----------------------------------------------------------------------------
// ***** Actions at Page Visibility Change *****
// -----------------------------------------------------------------------------

var windowInFocus = true;
// Event listener when the page gains focus
window.addEventListener('focus', function() {
    console.log('Page is in focus');
    windowInFocus = true;
});

// Event listener when the page loses focus
window.addEventListener('blur', function() {
    console.log('Page has lost focus');
    windowInFocus = false;
    resetJoystick();
});


// Periodic actions
setInterval(() => {
    // pause all commands if window is not in focus
    if (!windowInFocus) {
        resetJoystick();
        return;
    }
    // reset joystick if no keys are pressed and no mouse movement
    if (!dragging && Object.keys(keysPressed).length === 0) {
        resetJoystick();
    }
}, 100);

// -----------------------------------------------------------------------------

function getQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        slider1: urlParams.get('lim-left') || 50,  // Default to 50 if no value is provided
        slider2: urlParams.get('lim-right') || 50   // Default to 50 if no value is provided
    };
}

// Function to initialize sliders with values from URL
function initializeSliders() {
    const params = getQueryParams();

    // Set initial values
    sliderLimLeft.value = params.slider1;
    sliderValLimLeft.textContent = params.slider1;

    sliderLimRight.value = params.slider2;
    sliderValLimRight.textContent = params.slider2;

    // Update displayed value when sliders are changed
    sliderLimLeft.addEventListener('input', function() {
        sliderValLimLeft.textContent = slider1.value;
    });

    sliderLimRight.addEventListener('input', function() {
        sliderValLimRight.textContent = sliderLimRight.value;
    });
}

// Initialize sliders on page load
window.onload = initializeSliders;