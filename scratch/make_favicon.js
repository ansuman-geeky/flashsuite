const sharp = require('sharp');
const path = require('path');

const inputPath = path.join(__dirname, '../public/flashsuite_logo.png');
const outputPath = path.join(__dirname, '../public/favicon.ico');
const pngOutputPath = path.join(__dirname, '../public/favicon.png');

async function processImage() {
    try {
        const metadata = await sharp(inputPath).metadata();
        console.log("Original Metadata:", metadata);

        // The icon is typically square-ish on the left.
        // Assuming the image is wider than it is tall, we crop a square from the left.
        const size = metadata.height; // Use height as the size of the square
        
        // We might need to add a bit of an offset if there's padding, but let's try cropping from x=0, y=0.
        // Actually, to be safe, let's just extract a square of `height x height` from the left edge.
        const cropped = sharp(inputPath).extract({ left: 0, top: 0, width: size, height: size });

        // Save as PNG for favicon
        await cropped
            .resize(64, 64)
            .toFile(pngOutputPath);
            
        console.log("Successfully created favicon.png");
        
    } catch (err) {
        console.error("Error processing image:", err);
    }
}

processImage();
