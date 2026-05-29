import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

async function optimizeImage(filepath, size = { width: 192, height: 192 }) {
    if (!fs.existsSync(filepath)) {
        console.log(`File not found: ${filepath}`);
        return;
    }

    try {
        const stats = fs.statSync(filepath);
        console.log(`Original size of ${filepath}: ${(stats.size / 1024).toFixed(2)} KB`);
        
        const metadata = await sharp(filepath).metadata();
        console.log(`Original dimensions: (${metadata.width}, ${metadata.height})`);

        const buffer = await sharp(filepath)
            .resize({
                width: size.width,
                height: size.height,
                kernel: sharp.kernel.lanczos3
            })
            .png({ quality: 100, compressionLevel: 9 })
            .toBuffer();

        fs.writeFileSync(filepath, buffer);

        const newStats = fs.statSync(filepath);
        console.log(`New size of ${filepath}: ${(newStats.size / 1024).toFixed(2)} KB`);
        
        const newMetadata = await sharp(filepath).metadata();
        console.log(`New dimensions: (${newMetadata.width}, ${newMetadata.height})`);

    } catch (e) {
        console.error(`Error processing ${filepath}: ${e}`);
    }
}

async function main() {
    await optimizeImage("public/favicon.png", { width: 192, height: 192 });

    if (fs.existsSync("star_style.png")) {
        try {
            const stats = fs.statSync("star_style.png");
            const metadata = await sharp("star_style.png").metadata();
            console.log(`star_style.png dimensions: (${metadata.width}, ${metadata.height})`);
            console.log(`star_style.png size: ${(stats.size / 1024).toFixed(2)} KB`);
        } catch (e) {
            console.error(e);
        }
    }
}

main();
