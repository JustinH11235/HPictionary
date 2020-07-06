var socket = io();
const USERNAME = document.getElementById('username').innerHTML;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 200;
const canvas = document.getElementById('canvas');
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
const ctx = canvas.getContext('2d');

// Testing
// ctx.fillRect(0, 0, CANVAS_WIDTH/2, CANVAS_HEIGHT/2);
// pixel_arr = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
// console.log(pixel_arr)
// //

// Drawing Handler
var pos = { x: 0, y: 0 };

canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mousedown', setPosAndDot);
canvas.addEventListener('mouseup', sendCanvas);
canvas.addEventListener('mouseenter', setPosition);

function sendCanvas(e) {
    var curCanvas = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    console.log(curCanvas)
    socket.emit('new canvas', curCanvas);
}

function setPosition(e) {
    pos.x = e.clientX - canvas.offsetLeft;
    pos.y = e.clientY - canvas.offsetTop;
}

function setPosAndDot(e) {
    pos.x = e.clientX - canvas.offsetLeft;
    pos.y = e.clientY - canvas.offsetTop;
    ctx.beginPath(); // begin
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#c0392b';
    ctx.moveTo(pos.x-1, pos.y-1); // from
    ctx.lineTo(pos.x-1, pos.y-1); // to
    ctx.stroke(); // draw it!
}

function draw(e) {
    // mouse left button must be pressed
    if (e.buttons !== 1) return;

    ctx.beginPath(); // begin

    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#c0392b';

    ctx.moveTo(pos.x, pos.y); // from
    setPosition(e);
    ctx.lineTo(pos.x, pos.y); // to

    ctx.stroke(); // draw it!
}
// End Drawing Handler
  
socket.on('new canvas', newCanvas => {
    // console.log('Tick took ' + (Date.now() - lastTime).toString() + ' milliseconds.');
    // lastTime = Date.now();
    // ### ONLY UPDATE IF I AM CURRENT DRAWER
    ctx.putImageData(newCanvas, 0, 0);
    // console.log('render() took ' + (Date.now() - lastTime).toString() + ' milliseconds.');
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
