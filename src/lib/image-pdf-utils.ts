import { PDFDocument } from 'pdf-lib';

/**
 * Creates a PDF document from an array of image files.
 * Supports PNG and JPG formats.
 * Each image is placed on a new page matching the image dimensions.
 */
export async function createPdfFromImages(
    imageFiles: File[]
): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    for (const file of imageFiles) {
        const buffer = await file.arrayBuffer();
        let image;

        try {
            if (file.type === 'image/jpeg' || file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg')) {
                image = await pdfDoc.embedJpg(buffer);
            } else if (file.type === 'image/png' || file.name.toLowerCase().endsWith('.png')) {
                image = await pdfDoc.embedPng(buffer);
            } else {
                // Fallback: Try embedding as PNG if type is unknown but might be supported, or skip
                // For now, continue and let it fail if it's really not supported, or just skip
                console.warn(`Unsupported file type: ${file.type} (${file.name})`);
                continue;
            }
        } catch (e) {
            console.error(`Failed to embed image: ${file.name}`, e);
            continue;
        }

        if (image) {
            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, {
                x: 0,
                y: 0,
                width: image.width,
                height: image.height,
            });
        }
    }

    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
}

export function readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
