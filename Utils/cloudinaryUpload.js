
import cloudinary from "../Configs/cloudinary.js";
import { Readable } from "stream";

export const uploadToCloudinary = (fileBuffer, folder) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: "image"
            },
            (error, result) => {
                if (error) {
                    return reject(error);
                }

                resolve(result);
            }
        );

        Readable.from(fileBuffer).pipe(uploadStream);
    });
};

export const deleteFromCloudinary = async (publicId) => {
    if (!publicId) return;

    return cloudinary.uploader.destroy(publicId, {
        resource_type: "image"
    });
};
