var socket = io();
socket.emit('init player', USERNAME);
const canvas = document.getElementById('canvas');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext('2d');
ctx.lineCap = 'round';

// HTML element getters
const curWord = document.getElementById('cur-word');
const clock = document.getElementById('clock');
const curColor = document.getElementById('cur-color');
const curWidth = document.getElementById('cur-width');
const clearCanvas = document.getElementById('clear-canvas');  // Button to clear canvas

const floodFill = document.getElementById('flood-fill-bucket');  // Flood Fill Button
const eraser = document.getElementById('eraser');
const colorHistoryElems = [document.getElementById('color0'), document.getElementById('color1'), document.getElementById('color2'), document.getElementById('color3'), document.getElementById('color4')];
const chatBox = document.getElementById('chat-box');
const chat = document.getElementById('chat');
const scoreboard = document.getElementById('scoreboard');

var isDrawer = false;

// Flood fill toggle
var isFloodFill = false;  // false by default

// position of mouse used for drawing by drawing handler
var pos = { x: 0, y: 0 };

var colorHistory = ['rgb(0, 0, 0)', 'rgb(101, 47, 6)', 'rgb(255, 0, 0)', 'rgb(0, 255, 0)', 'rgb(0, 0, 255)'];

var start;
var timerClock;
var timerSendCanvas;

// Buffer to speed up draw() event handler
var drawBuffer = [];



// Socket.io Message Handlers

socket.on('disconnect', () => {
    setTimeout(() => { window.location.replace('/') }, 5000);
    curWord.innerHTML = '<b><u>Game Over!</u></b>';
    clearInterval(timerClock);
    clock.innerHTML = '&nbsp';
    console.log('Game Over!')
});

socket.on('new canvas', newCanvas => {
    console.log('got new canvas from server')
    // console.log(newCanvas)
    let newUInt8Arr = new Uint8ClampedArray(newCanvas)
    // console.log(newUInt8Arr)
    let newImageData = new ImageData(newUInt8Arr, CANVAS_WIDTH, CANVAS_HEIGHT)
    // console.log(newImageData)
    ctx.putImageData(newImageData, 0, 0);
});

socket.on('new word', newWord => {
    console.log('got new word')
    curWord.innerHTML = newWord;
});

// Triggers when server tells client it is the new drawer
socket.on('give drawer', () => {
    isDrawer = true;
});

// Triggers when server tells client it is not the drawer any more
socket.on('take drawer', () => {
    isDrawer = false;
});

// Triggers when server tells client the turn has ended
socket.on('turn start', () => {
    start = Date.now();
    updateClock();
    timerClock = setInterval(updateClock, 1000);
    chat.innerHTML = '';
});

// Triggers when server tells client the turn has started
socket.on('turn end', () => {
    clearInterval(timerClock);
    clock.innerHTML = '&nbsp';
});

socket.on('current time', time => {
    start = time;
    updateClock();
    timerClock = setInterval(updateClock, 1000);
});

// Triggers when server sends a new chat message
socket.on('new message', newMessage => {
    let msg = document.createElement("li");
    msg.innerHTML = newMessage;
    chat.appendChild(msg);
    chat.scrollTop = chat.scrollHeight;
});

// Triggers when a player joins or leaves or a player guesses correctly and thus their score changes
socket.on('scoreboard update', data => {
    scoreboard.innerHTML = '';
    for (let player = 0, len = data.length; player < len; player++) {
        let score = document.createElement("li");
        score.classList.add("list-group-item");
        score.innerHTML = '<h6>' + data[player].username.toString() + '&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp' + data[player].score.toString() + '</h6>';
        scoreboard.appendChild(score);
    }
});



// Helper Functions

function chatSend() {
    var message = chatBox.value.trim();
    if (message != '') {
        socket.emit('new message', message);
    }
    chatBox.value = '';
    return false; // Makes sure page doesn't reload
}

function updateColorHistory(color) {
    // Update colorHistory array
    if (color != 'rgb(255, 255, 255)') {
        if (colorHistory.includes(color)) {
            if (colorHistory.indexOf(color) != 0) {
                // This color is already in history but we should pull it to the front
                var removed = colorHistory.splice(colorHistory.indexOf(color), 1)[0];
                colorHistory.unshift(removed);
            }
        } else {
            // This is a new color so we should insert at front
            colorHistory.unshift(color);
            colorHistory.pop();
        }

        // Update colorHistoryElems according to colorHistory
        for (let col = 0; col < colorHistory.length; ++col) {
            colorHistoryElems[col].style.fill = colorHistory[col];
        }
    }
}

function setColor(e) {
    var elemColor = e.target.style.fill;
    curColor.value = rgbToHex(elemColor);
    updateColorHistory(elemColor);
}

function hexToRGB(hex) {
    return `rgb(${parseInt(hex.substring(1, 3), 16)}, ${parseInt(hex.substring(3, 5), 16)}, ${parseInt(hex.substring(5, 7), 16)})`;
}

function rgbToHex(rgb) {
    rgb = rgb.split(',');
    var r = parseInt(rgb[0].substring(4)).toString(16);
    var g = parseInt(rgb[1]).toString(16);
    var b = parseInt(rgb[2]).toString(16);
    if (r.length == 1) r = '0' + r;
    if (g.length == 1) g = '0' + g;
    if (b.length == 1) b = '0' + b;
    return `#${r}${g}${b}`;
}

function updateClock() {
    let timeLeft = TURN_TIME / 1000 - Math.floor((Date.now() - start) / 1000);
    let minutesLeft = Math.floor(timeLeft / 60);
    let secondsLeft = timeLeft % 60;
    minutesLeft = minutesLeft < 10 ? '0'+minutesLeft : minutesLeft;
    secondsLeft = secondsLeft < 10 ? '0'+secondsLeft : secondsLeft;
    clock.innerHTML = `${minutesLeft}:${secondsLeft}`;
}

// End Helper Functions



// Event Listeners

clearCanvas.addEventListener('click', () => {
    if(isDrawer) {
        // Clears canvas
        let blankCanvas = new Array(CANVAS_HEIGHT*CANVAS_WIDTH*4).fill(0);
        let newUInt8Arr = new Uint8ClampedArray(blankCanvas);
        let newImageData = new ImageData(newUInt8Arr, CANVAS_WIDTH, CANVAS_HEIGHT)
        ctx.putImageData(newImageData, 0, 0);
        // Sends new canvas to server
        sendCanvas();
    }
}); 

// Flood Fill Event Listener
floodFill.addEventListener('click', () => {
    if (isFloodFill) {
        isFloodFill = false;
    }
    else {
        isFloodFill = true;
    }
});


eraser.addEventListener('click', setColor);

for (let elem = 0; elem < colorHistoryElems.length; ++elem) {
    colorHistoryElems[elem].addEventListener('click', setColor); 
}

canvas.addEventListener('mousemove', draw);
// Needed in case they just click and let go without moving
// Sets new pos, makes a dot, sets an interval to send canvas, and updates color history
canvas.addEventListener('mousedown', penDown);
document.addEventListener('mouseup', penUp);
// canvas.addEventListener('mousemove', sendCanvas);
// This makes sure it draws correctly when you start your line outside of the canvas
canvas.addEventListener('mouseenter', setPosition);
// This makes sure it still draws when you quickly move off of canvas
canvas.addEventListener('mouseleave', draw);

// Mobile Draw Event Listeners
canvas.addEventListener('touchstart', penDown);
canvas.addEventListener('touchend', sendCanvas);
canvas.addEventListener('touchmove', draw);

// Flood Fill Event Listeners
canvas.addEventListener('click', doFloodFill);

// End Event Listeners



// Drawing Handler

setInterval(() => {
    if (isDrawer) {
        // If person is currently the drawer
        if (drawBuffer.length) {
            let action = drawBuffer.shift();
            if (action == 'pos') {
                // This means we need to set a position
                pos.x = drawBuffer.shift();
                pos.y = drawBuffer.shift();
            } else if (action == 'line') {
                // This means we need to draw a line from pos to given coords and set position to pos
                ctx.beginPath(); // begin
                ctx.lineWidth = curWidth.value;
                ctx.strokeStyle = curColor.value;

                ctx.moveTo(pos.x-1, pos.y-1); // from
                
                pos.x = drawBuffer.shift();
                pos.y = drawBuffer.shift();
                ctx.lineTo(pos.x-1, pos.y-1); // to
                ctx.stroke(); // draw it!
            } else if (action == 'sendCanvas') {
                sendCanvas();
            }
        }
    } else {
        // Otherwise clear buffer
        drawBuffer.length = 0;
    }
}, 10);

function sendCanvas(e) {
    if (isDrawer) {
        var curCanvas = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
        socket.emit('new canvas', Array.from(curCanvas));
    }
}

function setPosition(e) {
    drawBuffer.push('pos', e.offsetX, e.offsetY); // setPosition
}

function penDown(e) {
    if (!e.touches) {
        // Mouse click
        drawBuffer.push('pos', e.offsetX, e.offsetY, 'line', e.offsetX, e.offsetY); // setPosition and dot
        // Set interval to send canvas every 250 ms
        timerSendCanvas = setInterval(sendCanvas, 250)
    } else {
        // Mobile Touch
        var touch = e.touches[0];
        touchX = touch.pageX - touch.target.offsetLeft;
        touchY = touch.pageY - touch.target.offsetTop;
        drawBuffer.push('pos', touchX, touchY, 'line', touchX, touchY); // setPosition and dot
        e.preventDefault();
    }

    if (isDrawer) {
        updateColorHistory(hexToRGB(curColor.value));
    }
}

function penUp(e) {
    // Remove interval that sends canvas since we aren't drawing anymore
    clearInterval(timerSendCanvas);
    // Send final state of line
    // sendCanvas();
    drawBuffer.push('sendCanvas');

}

function draw(e) {
    if (!e.touches) {
        // Mouse draw
        // mouse left button must be pressed
        if (e.buttons !== 1) return;

        drawBuffer.push('line', e.offsetX, e.offsetY); // Line
    } else {
        // Mobile draw
        var touch = e.touches[0];
        touchX = touch.pageX - touch.target.offsetLeft;
        touchY = touch.pageY - touch.target.offsetTop;
        drawBuffer.push('line', touchX, touchY); // Line
        e.preventDefault();
    }
}

// End Drawing Handler

function doFloodFill(e) {
    if (isFloodFill) {
        var StartX = e.offsetX;
        var StartY = e.offsetY;

        var startPixelColor = ctx.getImageData(StartX, StartY, 1, 1).data; // returns array [r, g, b, a]
        var fillColor = hexToRGBList(curColor.value); // returns color in [R, G, B]
        var imageArray = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data; // gets 1-D array of canvas

        var pixelStack = [[StartX, StartY]];  // pushing pixel data of starting pixel onto stack
        
        //console.log(StartX, StartY, startPixelColor, fillColor, pixelStack);
        //*
        while (pixelStack.length > 0) {
            console.log(pixelStack.length);
            let newPixel = pixelStack.pop();
            let x = newPixel[0];
            let y = newPixel[1];

            newPixelIdx = (CANVAS_WIDTH * y + x) * 4;
            while (y > 0 && matchStartColor(startPixelColor, newPixelIdx)) {
                newPixelIdx -= CANVAS_WIDTH * 4;
                y--;
            }

            stackedLeft = false;
            stackedRight = false;

            while (y < CANVAS_HEIGHT && matchStartColor(startPixelColor, newPixelIdx)) {
                // 'flood filling' a pixel
                colorPixel(fillColor, newPixelIdx);
                
                // looking at pixels on left 
                if (x > 0) {  
                    if (matchStartColor(startPixelColor, newPixelIdx - 4)) {
                        if (!stackedLeft) {
                            pixelStack.push([x-1, y]);
                            stackedLeft = true;
                        }
                    }
                    else if (stackedLeft) {
                        stackedLeft = false;
                    }
                }
                
                // looking at pixel on right
                if (x < CANVAS_WIDTH - 1) {
                    if (matchStartColor(startPixelColor, newPixelIdx + 4)) {
                        if (!stackedRight) {
                            pixelStack.push([x+1, y]);
                            stackedRight = true;
                        }
                    }
                    else if (stackedRight) {
                        stackedRight = false;
                    }
                }
                
                // moving one pixel down
                newPixelIdx += CANVAS_WIDTH * 4;
                y++;
            }

        }

        // update and send canvas
        let newImageData = new ImageData(imageArray, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.putImageData(newImageData, 0, 0);
        sendCanvas();
        
        // Helper functions for doFloodFill
        function matchStartColor(startPixelColor, newPixelIdx) {
            var r = imageArray[newPixelIdx + 0];
            var g = imageArray[newPixelIdx + 1];
            var b = imageArray[newPixelIdx + 2];
            return (startPixelColor[0] == r && startPixelColor[1] == g && startPixelColor[2] == b);
        }

        function colorPixel(fillColor, newPixelIdx) {
            imageArray[newPixelIdx + 0] = fillColor[0];
            imageArray[newPixelIdx + 1] = fillColor[1];
            imageArray[newPixelIdx + 2] = fillColor[2];
            imageArray[newPixelIdx + 3] = 255;
        }
        //*/
        function hexToRGBList(hex) {
            rgbList = [];
            for (i = 1; i < 6; i += 2) {
                channel = hex.substr(i, 2);
                rgbList.push(parseInt(channel, 16));
            }
            return rgbList
        }
    }  
}
