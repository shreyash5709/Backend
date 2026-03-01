import {asyncHandler, ApiError, ApiResponse} from "../utils/index.utils.js"
import {Tweet} from "../models/index.model.js"
import mongoose from "mongoose"

const createTweet = asyncHandler(async (req, res) => {
    const {content} = req.body
    if(!content){
        throw new ApiError(400, "Content is required")
    }
    const newTweet = await Tweet.create({
        content,
        owner: req.user?._id
    })

    if(!newTweet){
        throw new ApiError(500, "Something went wrong while creating tweet")
    }
    return res
    .status(201)
    .json(
        new ApiResponse(201, "Tweet created successfully", newTweet)
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const tweetAggregation = Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$owner"
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "likes",
            }
        },
        {
            $addFields: {
                likeCount: {
                    $size: "$likes"
                },
                isLiked: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$likes.likedBy"]
                        },
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                likes: 0
            }
        }
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    }

    const userTweets = await Tweet.aggregatePaginate(tweetAggregation, options)
    if(!userTweets){
        throw new ApiError(500, "Something went wrong while fetching user tweets")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, "User tweets fetched successfully", userTweets)
    )

})

const updateTweet = asyncHandler(async (req, res) => {
    const {content} = req.body
    const {tweetId} = req.params
    
    if(!content?.trim()){
        throw new ApiError(400, "Content is required")
    }

    if(!mongoose.isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid Tweet ID")
    }

    const newTweet = await Tweet.findOneAndUpdate(
        {
            _id: tweetId,
            owner: req.user?._id // Security: ensures only the owner can update
        },
        {
            $set: {
                content
            }
        },
        {
            new: true
        }
    )

    if(!newTweet){
        throw new ApiError(404, "Tweet not found or you are not the owner of the tweet")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Tweet updated successfully", newTweet)
    )

})

const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    if(!mongoose.isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid Tweet ID")
    }

    const tweet = await Tweet.findById(tweetId)
    if(!tweet){
        throw new ApiError(404, "Tweet not found")
    }

    const ownerId = tweet.owner.toString()

    if(ownerId === req.user?._id.toString()){
        await Tweet.findByIdAndDelete(tweetId)
    }
    else{
        throw new ApiError(403, "You are not the owner of the tweet")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Tweet deleted successfully")
    )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}