const cloudinary = require("../config/cloudinary");
const AppError = require("../utils/AppError");

const uploadImageBuffer = async (
  file,
  {
    folder = "stves/uploads",
    publicId = "",
  } = {}
) => {
  if (!file || !file.buffer) {
    throw new AppError("Image file is required.", 400);
  }

  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new AppError("Cloudinary is not configured in backend .env.", 500);
  }

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: "image",
      overwrite: true,
      invalidate: true,
    };

    if (publicId) {
      uploadOptions.public_id = publicId;
    }

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          return reject(
            new AppError(error.message || "Cloudinary upload failed.", 500)
          );
        }

        return resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
        });
      }
    );

    stream.end(file.buffer);
  });
};

module.exports = {
  uploadImageBuffer,
};