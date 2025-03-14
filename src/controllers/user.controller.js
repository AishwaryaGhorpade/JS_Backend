import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens=async(userId)=>{
    try {
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})
        return {accessToken,refreshToken}
    } catch (error) {
        throw new ApiError(501,"Something went wrong while generate access and refresh token")
    }
}


const registerUser = asyncHandler(async (req, res) => {


    console.log(req.body)

    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    // get user details from frontend
    const {fullName, email, username, password }=req.body   //form data and json data can be access using req.body


    //validation -for not emaplt field
    /* if(fullName==="")
    {
        throw new ApiError(400,"Full name is required")
    } */  //this validation apply only to fullName field
     
    //for appling all feid once

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }


    //  check if user already exists: username, email
   const existedUser= await User.findOne({
    $or:[{username},{email}]
   })

   if(existedUser)
   {
    throw new ApiError(409,"user with email or username already exist")
   }

    //   console.log(req.files)

   // check for images, check for avatar
   const avatarLocalPath=req.files?.avatar[0]?.path;
//    const caverImageLocalPath=req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0)
  {
    coverImageLocalPath=req.files.coverImage[0].path;
  }


   if(!avatarLocalPath)
   {
    throw new ApiError(400,"Avatar file is required")
   }

   //upload them to cloudinary, avatar,coverImage
   const avatar=await uploadOnCloudinary(avatarLocalPath)
   const coverImage=await uploadOnCloudinary(coverImageLocalPath)

   if(!avatar)
    {
     throw new ApiError(400,"Avatar file is required")
    }

    // create user object - create entry in db
    const user=await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url ||"",
        email,
        password,
        username:username.toLowerCase()
    })

    //remove password and refresh token field from response
    const createdUser=await User.findById(user._id).select("-password -refreshToken")

    // check for user creation
    if(!createdUser)
    {
        throw new ApiError(500,"something went wrong while registering the user")
    }

    return res.status(200).json(
        new ApiResponse(200,createdUser,"user registered successfully!!")
    )

});

const loginUser=asyncHandler(async (req,res)=>{

    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie


    // req body -> data
    
      const {username,password,email} =req.body


      // username or email
      if(!(username || email))
      {
        throw new ApiError(400,"email or username required")
      }

      //find the user
      const user=await User.findOne({
        $or:[{username},{email}]
      })
      

      if(!user)
      {
        throw new ApiError(404,"user doesnot exist")
      }
      console.log(!user)
  
      //password check
      const isPasswordValid=await user.isPasswordCorrect(password)
    //   console.log(isPasswordValid)

      if(!isPasswordValid)
        {
          throw new ApiError(401,"Invalid user credentials")
        }

        //access token and refresh token
        const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)
        // console.log(accessToken,refreshToken)

        //send cookies
        const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
        console.log(loggedInUser)

        const options={
            httpOnly:true,
            secure:true
        }


        return res.status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    user:loggedInUser,accessToken,refreshToken
                },
                "User logged In successfully"
            )
        )
});

const logoutUser=asyncHandler(async(req,res)=>{

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))

})

const refreshAccessToken=asyncHandler(async(req,res)=>{
    const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
    // req.body.refreshToken =>taking refreshToken from mobile app
    // req.cookies.refreshToken =>taking refreshToken from web app

    if(!incomingRefreshToken)
    {
        throw new ApiError(401,"Unauthorized request")
    }
    try {
        const decodedToken=jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        )
        const user=await User.findById(decodedToken._id)
        if(!user)
        {
            throw new ApiError(401,"Inavalid Refresh Token")
        }
        if(incomingRefreshToken!==user?.refreshToken)
        {
            throw new ApiError(401,"Refresh Token is expired or used") 
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
         const {accessToken ,newRefreshToken}= await generateAccessAndRefreshTokens(user._id)
        return res
        .status(200)    
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken,
                    refreshToken:newRefreshToken
                },
                "Access Token Refreshed"
            )
        )
    } catch (error) {
        ApiError(401,error?.message || "Invalid Refresh Token")
    }

})
const changeCurrentPassword=asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body

    if(!currentPassword || !newPassword)
    {
        throw new ApiError(400,"Current password and new password are required")
    }

    const user=await User.findById(req.user._id)
    const isPasswordValid=await user.isPasswordCorrect(oldPassword)

    if(!isPasswordValid)
    {
        throw new ApiError(401,"Old password is incorrect")
    }

    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200).json(new ApiResponse(200,{},"Password changed successfully"))
})

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res.status(200).json(new ApiResponse(200,req.user,"User details"))
})

const updateAccountDetails=asyncHandler(async(req,res)=>{
    const {fullName,email,username}=req.body
    const user=await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                fullName,
                email:email,
                username:username.toLowerCase()
            }
        },
        {
            new:true   //return updated user details
        }
    ).select("-password -refreshToken")

    return res.status(200).json(new ApiResponse(200,user,"User details updated successfully"))

})

const updateUserAvatar=asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.files.path
    if(!avatarLocalPath)
    {
        throw new ApiError(400,"Avatar file is required")
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url)
    {
        throw new ApiError(400,"Error while uploading avatar")
    }
    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {
            new:true
        }
    ).select("-password -refreshToken")

return res
.status(200)
.json(
    new ApiResponse(200,user,"Avatar updated successfully")
)
    
})

const updateUserCoverImage=asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.files.path
    if(!coverImageLocalPath)
    {
        throw new ApiError(400,"coverImage file is required")
    }
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url)
    {
        throw new ApiError(400,"Error while uploading coverImage")
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImageLocal:coverImage.url
            }
        },
        {
            new:true
        }
    ).select("-password -refreshToken")

    return res
   .status(200)
   .json(
    new ApiResponse(200,user,"Cover Image updated successfully")
    )
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
 };