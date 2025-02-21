const fs = require('fs-extra');
const path = require('path');

async function renameFolder() {
    const distPath = 'dist/car-simulator';
    const oldPath = path.join(distPath, 'browser');
    const newPath = path.join(distPath, 'docs');

    try {
        const exists = await fs.pathExists(oldPath);
        console.log(`Does ${oldPath} exist? ${exists}`);

        await fs.remove(newPath);
        await fs.rename(oldPath, newPath);
        console.log(`Successfully renamed ${oldPath} to ${newPath}`);
    } catch (err) {
        console.error(err);
    }
}

renameFolder();
