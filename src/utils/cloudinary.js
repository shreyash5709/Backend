import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath, folderName) => {
  try {
    if(!localFilePath) return null
    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: folderName
    })
  
    // file has been uploaded successfully
    // console.log("File is successfully uploaded on cloudinary", response.url);

    // remove the locally saved temporary file
    if(fs.existsSync(localFilePath)){
      fs.unlinkSync(localFilePath)
    }

    return response

  } 
  catch (error) {

    if(fs.existsSync(localFilePath)){
      fs.unlinkSync(localFilePath)
    }

    console.error("Cloudinary upload error: ", error.message)
    // remove the locally saved temporary file as the upload operation got faild
    return null
  }
}

const deleteFromCloudinary = async (public_id) => {
  try {
    if(!public_id) return null
    const response = await cloudinary.uploader.destroy(public_id)
    return response
  } catch (error) {
    console.error("Cloudinary deletion error: ", error.message)
    return null
  }
}
    
export {uploadOnCloudinary, deleteFromCloudinary}