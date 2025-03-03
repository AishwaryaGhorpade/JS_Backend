import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET 
    });

    const uploadOnCloudinary=async(localFilePath)=>{
        if(!localFilePath)  return null
        try {
            const response=await cloudinary.uploader.upload(localFilePath,{
                resourse_type:"auto"
            })
            //file is uploaded on cloadinary
            // console.log("file is uploaded on cloadinary",response.url)
            fs.unlinkSync(localFilePath)

            return response
        } catch (error) {
            fs.unlinkSync(localFilePath)  //remove the locally saved temporary file as the upload operation got failed
            return null
        }
    }

export {uploadOnCloudinary}