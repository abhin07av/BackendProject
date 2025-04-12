import {v2 as cloudinary} from 'cloudinary';
import fs from "fs";
          
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
  });
  
const uploadOnCloudinary = async (localFilePath) =>{
    try {
        if(!localFilePath){
            console.log("No File Path");
            return null;
        }

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        //file uploaded Successfully
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath) //removes the locally saved temporary files as the upload operation got failed
    }
}

const deleteFromCloudinary = async (publicId) => {
    try {
        if (!publicId) return null;
        
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error("Error deleting from Cloudinary:", error);
        return null;
    }
}

export { uploadOnCloudinary, deleteFromCloudinary };