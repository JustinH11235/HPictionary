var socket = io();
socket.emit('init player', USERNAME);
const canvas = document.getElementById('canvas');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext('2d');
const curWord = document.getElementById('cur-word');

var isDrawer = false;

// position of mouse used for drawing by drawing handler
var pos = { x: 0, y: 0 };



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
    } else {
        console.log('ignored new canvas from server, am current drawer')
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



// Drawing Handler

canvas.addEventListener('mousemove', draw);
// Needed in case they just click and let go without moving
canvas.addEventListener('mousedown', setPosAndDot);
// May need to replace later with a timer so its more fluid
document.addEventListener('mouseup', sendCanvas);
// This makes sure it draws correctly when you start your line outside of the canvas
canvas.addEventListener('mouseenter', setPosition);
// This makes sure it still draws when you quickly move off of canvas
canvas.addEventListener('mouseleave', draw);

function sendCanvas(e) {
    if (isDrawer) {
        var curCanvas = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data;
        socket.emit('new canvas', Array.from(curCanvas));
    } else {
        console.log('blocked sendCanvas')
    }
}

function setPosition(e) {
    if (isDrawer) {
        pos.x = e.clientX - canvas.offsetLeft;
        pos.y = e.clientY - canvas.offsetTop;
    } else {
        console.log('blocked SetPosition')
    }
}

function setPosAndDot(e) {
    if (isDrawer) {
        setPosition(e);
        ctx.beginPath(); // begin
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#c0392b';
        ctx.moveTo(pos.x-1, pos.y-1); // from
        ctx.lineTo(pos.x-1, pos.y-1); // to
        ctx.stroke(); // draw it!
    } else {
        console.log('blocked setPosAndDot')
    }
}

function draw(e) {
    if (isDrawer) {
        // mouse left button must be pressed
        if (e.buttons !== 1) return;

        ctx.beginPath(); // begin

        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#c0392b';

        ctx.moveTo(pos.x-1, pos.y-1); // from
        setPosition(e);
        ctx.lineTo(pos.x-1, pos.y-1); // to

        ctx.stroke(); // draw it!
    } else {
        console.log('blocked draw')
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
