import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export async function downloadImagesAsZip(images: { dataUrl: string; name: string }[], zipFilename: string) {
    const zip = new JSZip();

    images.forEach((img) => {
        // dataUrl is like "data:image/png;base64,....."
        const base64Data = img.dataUrl.split(',')[1];
        zip.file(img.name, base64Data, { base64: true });
    });

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, zipFilename);
}
