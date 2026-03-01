import {asyncHandler, ApiError, ApiResponse} from "../utils/index.utils.js"
import { User } from "../models/index.model.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"



const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({
            validateBeforeSave: false
        })
        return {
            accessToken,
            refreshToken
        }
    } 
    catch (error) {
        console.log("error while generating access and refresh token : ", error)
        throw new ApiError(500, "Something went wrong while generating access and refresh token")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to claudinary, avatar
    // create user object - create entry in db
    // remove password and referesh token field from response
    // check for user creation
    // return res

    const { username, email, fullName, password } = req.body;
    // console.log("email", email)

    if(
        [username, email, fullName, password].some(
            (field) => field?.trim() === ""
        )
    ){
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [
            {username},
            {email}
        ]
    })

    if(existedUser){
        throw new ApiError(409, "User already exists")
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path
    // const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath = ""
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath, "User_assests")
    const coverImage = await uploadOnCloudinary(coverImageLocalPath, "User_assests")

    if(!avatar){
        throw new ApiError(400, "Avatar upload failed")
    }

    const user = await User.create({
        username: username.toLowerCase(),
        email,
        fullName,
        password,
        avatar: {
            url: avatar.url,
            public_id: avatar.public_id
        },
        coverImage: {
            url: coverImage?.url,
            public_id: coverImage?.public_id
        }
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200, "User registered successfully", createdUser)
    )

})  

const loginUser = asyncHandler( async (req, res) => {
    // get login detail from frontend
    // username or email
    // find the user
    // password check
    // access and referesh token
    // send cookie

    const {username, email, password} = req.body;

    if(!(username || email)){
        throw new ApiError(400, "Username or password is required")
    }

    // Here is an alternative of above code 
    // if(!username && !email){
    //     throw new ApiError(400, "Username or email is required")
    // }

    const user = await User.findOne({
        $or: [
            {username},
            {email}
        ]
    })

    if(!user){
        throw new ApiError(404, "User does not exists")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(password)

    if(!isPasswordCorrect){
        throw new ApiError(401, "Incorrect username or password.")
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const cookieOptions = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
        new ApiResponse(
            200, 
            "User logged in successfully",
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            }
        )
    )
})

const logoutUser = asyncHandler( async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id, 
        {
            refreshToken: ""
        },
        {
            // new: true  old syntax
            returnDocument: "after" // new syntax
        }
    )
    const cookieOptions = {
        httpOnly: true,
        secure: true
    }
    return res
    .status(200)
    .cookie("accessToken", "", cookieOptions)
    .cookie("refreshToken", "", cookieOptions)
    .json(
        new ApiResponse(
            200, 
            "User logged out successfully"
        )
    )
})

const refreshAccessToken = asyncHandler( async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized access")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        )
    
        const user = await User.findById(decodedToken?._id)
        console.log(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if(user?.refreshToken !== incomingRefreshToken){
            throw new ApiError(401, "Refresh token is expired or used")
        }
    
        const cookieOptions = {
            httpOnly: true,
            secure: true
        }
    
        const { accessToken, refreshToken: newRefreshToken} = await generateAccessAndRefreshToken(user._id);
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, cookieOptions)
        .cookie("refreshToken", newRefreshToken, cookieOptions)
        .json(
            new ApiResponse(
                200, 
                "Access token refreshed successfully",
                {
                    accessToken,
                    newRefreshToken
                }
            )
        )
    } 
    catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changePassword = asyncHandler( async (req, res) => {
    const {oldPassword, newPassword} = req.body

    if(!oldPassword || !newPassword){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(401, "Incorrect old password")
    }

    user.password = newPassword
    await user.save({
        validateBeforeSave: false
    })

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Password changed successfully")
    )
})

const getCurrentUser = asyncHandler( async (req, res) => {
    return res
    .status(200)
    .json(
        new ApiResponse(200, "User fetched successfully", req.user)
    )
})

const updateAccountDetails = asyncHandler( async (req, res) => {
    const {email, fullName} = req.body
    if(!email || !fullName){
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id, 
        {
            $set: {
                email: email.toLowerCase(),
                fullName: fullName
            }
        },
        {
            returnDocument: "after"
        }
    ).select("-password")

    return res
    .status(200)    
    .json(
        new ApiResponse(200, "Account details updated successfully", user)
    )
})

const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    // 1. Upload new image
    const newAvatar = await uploadOnCloudinary(avatarLocalPath, "User_assests");
    console.log("newAvatar",newAvatar.url)

    if (!newAvatar?.url) {
        throw new ApiError(400, "Error while uploading avatar");
    }

    // 2. Capture the old public_id before we overwrite it in the DB
    const user = await User.findById(req.user?._id);
    const oldPublicId = user?.avatar?.public_id;

    // 3. Update the Database
    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: {
                    url: newAvatar.url,
                    public_id: newAvatar.public_id
                }
            }
        },
        { 
            returnDocument: "after"
        } 
    ).select("-password");

    // 4. Clean up the old file from Cloudinary

    if (oldPublicId) {
        try {
            await deleteFromCloudinary(oldPublicId);
        } catch (error) {
            console.log("Old avatar deletion failed:", error.message);
        }
    }

    return res
        .status(200)
        .json(new ApiResponse(200, "Avatar updated successfully", updatedUser));
});

const updateCoverImage = asyncHandler( async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover image file is missing")
    }

    const user = await User.findById(req.user?._id)
    const oldPublicId = user?.coverImage?.public_id

    const newCoverImage = await uploadOnCloudinary(coverImageLocalPath, "User_assests")

    if(!newCoverImage.url){
        throw new ApiError(400, "Error while uploading on cover image")
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id, 
        {
            $set: {
                coverImage: {
                    url: newCoverImage.url,
                    public_id: newCoverImage.public_id
                }
            }
        },
        {
            returnDocument: "after"
        }
    ).select("-password")

    if(oldPublicId){
        try {
            await deleteFromCloudinary(oldPublicId)
        } 
        catch (error) {
            console.log("Old cover image deletion failed: ", error.message)
        }
    }

    return res
    .status(200)    
    .json(
        new ApiResponse(200, "Cover image updated successfully", updatedUser)
    )
})

const getUserChannelProfile = asyncHandler( async (req, res) => {
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400, "Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers"
                },
                channelSubscribedToCount: {
                    $cond: {
                        if: {$eq: [new mongoose.Types.ObjectId(req.user?._id), "$_id"]},
                        then: {$size: "$subscribedTo"},
                        else: 0
                    }
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                _id: 1,
                subscriberCount: 1,
                channelSubscribedToCount: 1,
                isSubscribed: 1,
                fullName: 1,
                username: 1,
                email: 1,
                avatar: 1,
                coverImage: 1,
            }
        }
    ])

    console.log("channel", channel);
    
    if(!channel?.length){
        throw new ApiError(404, "Channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, "User channel profile fetched successfully", channel[0])
    )

})

const getWatchHistory = asyncHandler( async (req, res) => {
    const user = User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $unwind: "$watchHistory"
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "videoDetails",
                pipeline:[
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline:[
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                
                                }
                            ]
                        }
                    },
                    {
                        $unwind: {
                            path: "$owner",
                            preserveNullAndEmptyArrays: true
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$videoDetails"
        },
        {
            $replaceRoot: {
                newRoot: "$videoDetails"
            }
        }
    ])

    const options = {
        page: 10,
        limit: 10,
    }

    const result = await User.aggregatePaginate(user, options)

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Watch history fetched successfully", result)
    )
})

const searchChannels = asyncHandler( async (req, res) => {
    const {query, page = 1, limit = 10} = req.query

    if(!query?.trim()){
        throw new ApiError(400, "Query is required")
    }

    const regexQuery = new RegExp(query, "i")

    const searchAggregate = User.aggregate([
        {
            $match: {
                $or: [
                    {
                        username: regexQuery
                    },
                    {
                        fullName: regexQuery
                    }
                ],
                // Login user ko search results mein khud ka profile nahi dikhna chahiye
                _id: {
                    $ne: req.user?._id ? new mongoose.Types.ObjectId(req.user._id) : null
                }
            }
        },
        {
            // Subscription check kaene ke liye join
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $addFields: {
                // follows ki ginti
                subscriberCount: {
                    $size: "$subscribers"
                },
                // Kya current user ne ise subscribe kiya hai?
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                _id: 1,
                subscriberCount: 1,
                isSubscribed: 1,
                fullName: 1,
                username: 1,
                avatar: 1
            }
        },
        {
            $sort:{
                subscriberCount: -1,
                fullName: 1,
                username: 1
            }
        }
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        customLabels: {
            totalDocs: "totalChannels",
            docs: "channels",
        },
    }

    const result = await User.aggregatePaginate(searchAggregate, options)

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            "Channels fetched successfully",
            {
                totalChannels: result.totalChannels,
                channels: result.channels,
                totalPage: result.totalPages,
                currentPage: result.page,
                hasNextPage: result.hasNextPage,
                hasPrevPage: result.hasPrevPage
            }
        )
    )
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory,
    searchChannels
}