const fs = require('fs');
const path = require('path');

const source = path.join(__dirname, 'src', '404.html');
const destination = path.join(__dirname, 'dist', 'car-simulator', 'browser', '404.html');

fs.copyFile(source, destination, (err) => {
  if (err) {
    console.error('Error copying file:', err);
  } else {
    console.log('404.html was copied to dist/car-simulator/docs/');
  }
});
