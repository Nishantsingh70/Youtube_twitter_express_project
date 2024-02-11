import { v2 as cloudinary } from "cloudinary";

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
});


const deleteOldFile = async (oldPublicId, type="image") => {
    try {
        console.log("Old delete file. File path is: ", oldPublicId);
        
        // Check if the old file exists
        if (oldPublicId) {
            // Delete the old file from Cloudinary
                const public_idWithExtension = oldPublicId.substring(oldPublicId.lastIndexOf('/') + 1)
                const public_id = public_idWithExtension.split('.').slice(0, -1).join('.')

                const response = await cloudinary.uploader.destroy(public_id, {
                    resource_type: `${type}`,   
                })

                console.log("Old file deleted from Cloudinary. Response is: ", response);
                return response;
        }
    } 
    catch (error) {
        return null;
    }
}

export { deleteOldFile };
