import {asyncHandler, ApiError, ApiResponse} from "../utils/index.utils.js"
import {Like, Video, Comment, Tweet} from "../models/index.model.js"
import mongoose, {isValidObjectId} from "mongoose"


const toggleVideoLikes = asyncHandler(async (req, res) => {

    const {videoId} = req.params

    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video ID")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    const userId = req.user?._id

    const existingLike = await Like.findOne({
        video: videoId,
        likedBy: userId
    })

    if(existingLike){
        await Like.findByIdAndDelete(existingLike._id)
        await video.updateOne({
            $inc: {
                likes: -1
            }
        })
        return res
        .status(200)
        .json(
            new ApiResponse(200, "Video unliked successfully", {isLiked: false})
        )
    }

    const newVideoLike = await Like.create({
        video: videoId,
        likedBy: req.user?._id
    })

    await video.updateOne({
        $inc: {
            likes: 1
        }
    })


    if(!newVideoLike){
        throw new ApiError(500, "Something went wrong while liking video")
    }
    return res
    .status(200)
    .json(
        new ApiResponse(200, "Video liked successfully", {isLiked: true})
    )
})

const toggleCommentLikes = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid Comment ID")
    }

    const comment = await Comment.findById(commentId)

    if(!comment){
        throw new ApiError(404, "Comment not found")
    }

    const userId = req.user?._id

    const existingLike = await Like.findOne({
        comment: commentId,
        likedBy: userId
    })

    if(existingLike){
        await Like.findByIdAndDelete(existingLike._id)
        return res
        .status(200)
        .json(
            new ApiResponse(200, "Comment unliked successfully", {isLiked: false})
        )
    }

    const newCommentLike = await Like.create({
        comment: commentId,
        likedBy: req.user?._id
    })

    await comment.updateOne({
        $inc: {
            likes: 1
        }
    })

    if(!newCommentLike){
        throw new ApiError(500, "Something went wrong while liking comment")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Comment liked successfully", {isLiked: true})
    )
})

const toggleTweetLikes = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid Tweet ID")
    }

    const tweet = await Tweet.findById(tweetId)

    if(!tweet){
        throw new ApiError(404, "Tweet not found")
    }

    const userId = req.user?._id

    const existingLike = await Like.findOne({
        tweet: tweetId,
        likedBy: userId
    })

    if(existingLike){
        await Like.findByIdAndDelete(existingLike._id)
        return res
        .status(200)
        .json(
            new ApiResponse(200, "Tweet unliked successfully", {isLiked: false})
        )
    }

    const newTweetLike = await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    await tweet.updateOne({
        $inc: {
            likes: 1
        }
    })

    if(!newTweetLike){
        throw new ApiError(500, "Something went wrong while liking tweet")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Tweet liked successfully", {isLiked: true})
    )
})

const getLikedVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10 } = req.query;
    const likeAggregation = Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
                video: {
                    $exists: true
                }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideos",
                pipeline: [
                    {   $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullName: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $unwind: "$owner"
                    }
                ]
            }
        },
        {
            $unwind: "$likedVideos"
        },
        {
            $replaceRoot: {
                newRoot: "$likedVideos"
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    }

    const likedVideos = await Like.aggregatePaginate(likeAggregation, options)

    if(!likedVideos){
        throw new ApiError(500, "Something went wrong while fetching liked videos")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Liked videos fetched successfully", likedVideos)
    )
})

export {
    toggleCommentLikes,
    toggleTweetLikes,
    toggleVideoLikes,
    getLikedVideos
}