const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Generate filename with original name and GMT timestamp
function generateFilename(originalFilename) {
  const now = new Date();
  
  // Format: YYYYMMDD_HHmmss (GMT)
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const date = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');
  
  const timestamp = `${year}${month}${date}_${hours}${minutes}${seconds}`;
  
  // Split filename and extension
  const lastDotIndex = originalFilename.lastIndexOf('.');
  let name, ext;
  
  if (lastDotIndex === -1) {
    name = originalFilename;
    ext = '';
  } else {
    name = originalFilename.substring(0, lastDotIndex);
    ext = originalFilename.substring(lastDotIndex);
  }
  
  return `${name}_${timestamp}${ext}`;
}

async function uploadBuffer(buffer, filename, folder = 'ecommerce-uploads') {
  const newFilename = generateFilename(filename);
  
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        type: 'upload',
        access_mode: 'public',
        public_id: newFilename,
        overwrite: false
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

module.exports = { cloudinary, uploadBuffer, generateFilename };
