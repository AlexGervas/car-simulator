console.log("start rename-browser-to-docs.js");
const fs = require('fs-extra');
const path = require('path');

async function renameFolder() {
    const distPath = 'dist/car-simulator';
    const oldPath = path.join(distPath, 'browser');
    const newPath = path.join(distPath, 'docs');

    try {
        const existsOld = await fs.pathExists(oldPath);
        const existsNew = await fs.pathExists(newPath);
        
        console.log(`Does ${oldPath} exist? ${existsOld}`);
        console.log(`Does ${newPath} exist? ${existsNew}`);

        if (existsNew) {
            console.log(`Removing existing ${newPath}`);
            await fs.remove(newPath);
        }

        if (existsOld) {
            await fs.rename(oldPath, newPath);
            console.log(`Successfully renamed ${oldPath} to ${newPath}`);
        } else {
            console.log(`${oldPath} does not exist, skipping rename.`);
        }
    } catch (err) {
        console.error(err);
    }
}

renameFolder();
