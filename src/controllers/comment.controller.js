import {asyncHandler, ApiError, ApiResponse} from "../utils/index.utils.js"
import {Comment, Video} from "../models/index.model.js"
import mongoose from "mongoose"

const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video ID")
    }

    const commentAggregation = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
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
                foreignField: "comment",
                as: "likes"
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
                            $in: [new mongoose.Types.ObjectId(req.user?._id), "$likes.likedBy"]
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
        },
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const videoComments = await Comment.aggregatePaginate(commentAggregation, options)

    if(!videoComments){
        throw new ApiError(500, "Something went wrong while fetching comments")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Comments fetched successfully", videoComments)
    )
})

const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {content} = req.body
    if(!content?.trim()){
        throw new ApiError(400, "Content is required")
    }

    if(!mongoose.isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video ID")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video not found")
    }

    const newComment = await Comment.create({
        content,
        owner: req.user?._id,
        video: videoId
    })

    if(!newComment){
        throw new ApiError(500, "Something went wrong while adding comment")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(201, "Comment added successfully", newComment)
    )
})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const {content} = req.body

    if(!content?.trim()){
        throw new ApiError(400, "Content is required")
    }

    if(!mongoose.isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid Comment ID")
    }

    const comment = await Comment.findOneAndUpdate(
        {
            _id: commentId,
            owner: req.user?._id
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

    if(!comment){
        throw new ApiError(404, "Comment not found or you are not the owner of the comment")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Comment updated successfully", comment)
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params

    if(!mongoose.isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid Comment ID")
    }

    const comment = await Comment.findOneAndDelete({
        _id: commentId,
        owner: req.user?._id
    })

    if(!comment){
        throw new ApiError(404, "Comment not found or you are not the owner of the comment")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Comment deleted successfully")
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}