var socket = io();
socket.emit('init player', USERNAME);
const canvas = document.getElementById('canvas');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext('2d');

const curWord = document.getElementById('cur-word');
const curColor = document.getElementById('cur-color');
const curWidth = document.getElementById('cur-width');
const colorHistoryElems = [document.getElementById('color0'), document.getElementById('color1'), document.getElementById('color2'), document.getElementById('color3'), document.getElementById('color4')];

var isDrawer = false;

// position of mouse used for drawing by drawing handler
var pos = { x: 0, y: 0 };

var colorHistory = ['#FFFFFF', '#FFFFFF', '#FFFFFF','#FFFFFF','#FFFFFF'];



// Socket.io Message Handlers

socket.on('disconnect', () => {
    setTimeout(() => { window.location.replace('/') }, 5000);
    console.log('Game Over!')
});

socket.on('new canvas', newCanvas => {
    // Only update my canvas if I am Not current drawer
    if (!isDrawer) {
        console.log('got new canvas from server')
        // console.log(newCanvas)
        let newUInt8Arr = new Uint8ClampedArray(newCanvas)
        // console.log(newUInt8Arr)
        let newImageData = new ImageData(newUInt8Arr, CANVAS_WIDTH, CANVAS_HEIGHT)
        // console.log(newImageData)
        ctx.putImageData(newImageData, 0, 0);
    }
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
  
socket.on('scoreboard update', data => {
    let scoreboard = document.getElementById('scoreboard');
    scoreboard.innerHTML = '';
    for (let player = 0, len = data.length; player < len; player++) {
        let score = document.createElement("li");
        score.classList.add("list-group-item");
        score.style.color = data[player].color;
        score.innerHTML = '<h5>' + data[player].username.toString() + '&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp&nbsp' + data[player].score.toString() + '</h5>';
        scoreboard.appendChild(score);
    }
});



// Helper Functions

function updateColorHistory(color) {
    // Update colorHistory array
    if (colorHistory.includes(color)) {
        // This color is already in history but we should pull it to the front
        var removed = colorHistory.splice(colorHistory.indexOf(color), 1)[0];
        colorHistory.unshift(removed);
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

function setColor(e) {
    var elemColor = e.target.style.fill;
    console.log(rgbToHex(elemColor));
    curColor.value = rgbToHex(elemColor);
    updateColorHistory(elemColor);
}

function hexToRGB(hex) {
    return `rgb(${parseInt(hex.substring(1, 3), 16)}, ${parseInt(hex.substring(3, 5), 16)}, ${parseInt(hex.substring(5, 7), 16)})`;
}

function rgbToHex(rgb) {
    rgb = rgb.split(',');
    var r = parseInt(rgb[0].substring(4));
    var g = parseInt(rgb[1]);
    var b = parseInt(rgb[2]);
    return `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
}

// End Helper Functions



// Event Listeners

for (let elem = 0; elem < colorHistoryElems.length; ++elem) {
    colorHistoryElems[elem].addEventListener("click", setColor); 
}

canvas.addEventListener('mousemove', draw);
// Needed in case they just click and let go without moving
canvas.addEventListener('mousedown', setPosAndDotAndColorHistory);
// May need to replace later with a timer so its more fluid
document.addEventListener('mouseup', sendCanvas);
// This makes sure it draws correctly when you start your line outside of the canvas
canvas.addEventListener('mouseenter', setPosition);
// This makes sure it still draws when you quickly move off of canvas
canvas.addEventListener('mouseleave', draw);

// End Event Listeners



// Drawing Handler

function sendCanvas(e) {
    if (isDrawer) {
        var curCanvas = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
        socket.emit('new canvas', Array.from(curCanvas));
    }
}

function setPosition(e) {
    if (isDrawer) {
        pos.x = e.clientX - canvas.offsetLeft;
        pos.y = e.clientY - canvas.offsetTop;
    }
}

function setPosAndDotAndColorHistory(e) {
    if (isDrawer) {
        setPosition(e);

        ctx.beginPath(); // begin
        ctx.lineWidth = curWidth.value;
        ctx.lineCap = 'round';
        ctx.strokeStyle = curColor.value;
        ctx.moveTo(pos.x-1, pos.y-1); // from
        ctx.lineTo(pos.x-1, pos.y-1); // to
        ctx.stroke(); // draw it!

        updateColorHistory(hexToRGB(curColor.value));
    }
}

function draw(e) {
    if (isDrawer) {
        // mouse left button must be pressed
        if (e.buttons !== 1) return;

        ctx.beginPath(); // begin
        
        ctx.lineWidth = curWidth.value;
        ctx.lineCap = 'round';
        ctx.strokeStyle = curColor.value;

        ctx.moveTo(pos.x-1, pos.y-1); // from
        setPosition(e);
        ctx.lineTo(pos.x-1, pos.y-1); // to

        ctx.stroke(); // draw it!
    }
}
// End Drawing Handler
  











// old code

//   socket.on('disconnect', () => {
//     console.log('Player Left Game');
//     setTimeout(() => { window.location.replace('/') }, 1);
//   });


// // Start of Mobile Swipe Handler
// document.addEventListener('touchstart', handleTouchStart, false);
// document.addEventListener('touchmove', handleTouchMove, false);

// var xDown = null;
// var yDown = null;
// function getTouches(evt) {
//   return evt.touches ||             // browser API
//     evt.originalEvent.touches; // jQuery
// }

// function handleTouchStart(evt) {
//   const firstTouch = getTouches(evt)[0];
//   xDown = firstTouch.clientX;
//   yDown = firstTouch.clientY;
// };

// function handleTouchMove(evt) {
//   if (!xDown || !yDown) {
//     return;
//   }

//   var xUp = evt.touches[0].clientX;
//   var yUp = evt.touches[0].clientY;

//   var xDiff = xDown - xUp;
//   var yDiff = yDown - yUp;

//   if (Math.abs(xDiff) > Math.abs(yDiff)) {
//     if (xDiff > 0) {
//       /* left swipe */
//       socket.emit('change direction', 'left');
//     } else {
//       /* right swipe */
//       socket.emit('change direction', 'right');
//     }
//   } else {
//     if (yDiff > 0) {
//       /* up swipe */
//       socket.emit('change direction', 'up');
//     } else {
//       /* down swipe */
//       socket.emit('change direction', 'down');
//     }
//   }
//   /* reset values */
//   xDown = null;
//   yDown = null;
// };
// // End Mobile Swipe Handler
