import mongoose from "mongoose";
import {asyncHandler, ApiError, ApiResponse} from "../utils/index.utils.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"
import {User, Video, Like, Comment, Playlist} from "../models/index.model.js"

const getAllVideos = asyncHandler( async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    const pipeline = [];

    if(query){
        pipeline.push({
            $match: {
                $or: [
                    {
                        title: {
                            $regex: query,
                            $options: "i"
                        }
                    },
                    {
                        description: {
                            $regex: query,
                            $options: "i"
                        }
                    }
                ]
            }
        })
    }

    if(userId){
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new ApiError(400, "Invalid User ID");
        }
        pipeline.push(
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                },
            }
        )
    }

    pipeline.push({
        $match: {
            isPublished: true,
        }
    })

    pipeline.push(
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
                            avatar: 1,
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$owner"
        }
    )

    // Sorting logic
    const sortField = sortBy || "createdAt";
    const sortOrder = sortType === "asc" ? 1 : -1;
    pipeline.push({
        $sort: { [sortField]: sortOrder }
    });

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const videoAggregate = Video.aggregate(pipeline);
    const result = await Video.aggregatePaginate(videoAggregate, options)

    if (!result || result.docs.length === 0) {
        // Not always an error; could just be an empty page. 
        // Returning 200 with an empty list is usually better than a 404 for search.
        return res.status(200).json(new ApiResponse(200, "No videos found", []));
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Videos fetched successfully", result)
    )
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    if ([title, description].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Title and description are required");
    }

    const videoLocalPath = req.files?.videoFile?.[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path

    if(!videoLocalPath || !thumbnailLocalPath){
        throw new ApiError(400, "Video and thumbnail are required")
    }

    const video = await uploadOnCloudinary(videoLocalPath, "Videos")
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath, "Videos")

    if(!video){
        throw new ApiError(400, "Video upload failed")
    }

    const newVideo = await Video.create({
        videoFile: {
            url: video.url,
            public_id: video.public_id
        },
        thumbnail: {
            url: thumbnail.url,
            public_id: thumbnail.public_id
        },
        title,
        description,
        duration: video.duration,
        owner: req.user?._id,
        isPublished: true
    })

    if(!newVideo){
        throw new ApiError(500, "Something went wrong while publishing video")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Video published successfully", newVideo)
    )

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Invalid Video ID");
    }

    const videoAggregation = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
                isPublished: true
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
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers",
                        }
                    },
                    {
                        $addFields: {
                            subscriberCount: {
                                $size: "$subscribers"
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
                            username: 1,
                            fullName: 1,
                            avatar: 1,
                            subscriberCount: 1,
                            isSubscribed: 1
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
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: {
                isLiked: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$likes.likedBy"]
                        },
                        then: true,
                        else: false
                    }
                },
                likeCount: {
                    $size: "$likes"
                }
            }
        },
        {
            $project: {
                _id: 1,
                title: 1,
                description: 1,
                videoFile: 1,
                thumbnail: 1,
                duration: 1,
                views: 1,
                isLiked: 1,
                likeCount: 1,
                owner: 1,
            }
        }
    ])

    if(!videoAggregation?.length){
        throw new ApiError(404, "Video not found")
    }

    let video = videoAggregation[0]
    if(req.user?._id){
        const user = await User.findById(req.user?._id)
        const isAlreadyWatch = user?.watchHistory?.some(id => id.toString() === videoId)
        if(!isAlreadyWatch){
            await Video.findByIdAndUpdate(videoId, {
                $inc: {
                    views: 1
                }
            })

            video.views += 1
        }

        const cleanHistory = user.watchHistory.filter(id => id.toString() !== videoId)
        user.watchHistory = [video._id, ...cleanHistory].slice(0, 100)
        await user.save({validateBeforeSave: false})
    }

    return res
    .status(200)
    .json(new ApiResponse(200, "Video fetched successfully", video));

})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

    const { title, description } = req.body

    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400, "Invalid Video ID")
    }

    if(!title || !description){
        throw new ApiError(400, "Title and description are required")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    if(video.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403, "You are not authorized to update this video")
    }

    const thumbnailLocalPath = req.file?.path
    if(!thumbnailLocalPath){
        throw new ApiError(400, "Thumbnail is required")
    }

    const newThumbnail = await uploadOnCloudinary(thumbnailLocalPath, "Videos")
    if(!newThumbnail){
        throw new ApiError(400, "Thumbnail upload failed")
    }

    const oldPublicId = video?.thumbnail?.public_id

    const newVideo = await Video.findByIdAndUpdate(
        videoId, 
        {
            $set: {
                title,
                description,
                thumbnail: {
                    url: newThumbnail.url,
                    public_id: newThumbnail.public_id
                }
            }
        },
        {
            returnDocument: "after"
        }
    )

    if(oldPublicId){
        try {
            await deleteFromCloudinary(oldPublicId)
        } 
        catch (error) {
            console.log("Old thumbnail deletion failed: ", error.message)
        }
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Video updated successfully", newVideo)
    )

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400, "Invalid Video ID")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video not found")
    }

    if(video.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403, "You are not authorized to delete this video")
    }

    const oldVideoPublicId = video?.videoFile?.public_id
    const oldThumbnailPublicId = video?.thumbnail?.public_id
 
    await Promise.all([
        deleteFromCloudinary(oldVideoPublicId, "video"),
        deleteFromCloudinary(oldThumbnailPublicId),
        Video.findByIdAndDelete(videoId),
        Like.deleteMany({
            video: videoId
        }),
        Comment.deleteMany({
            video: videoId
        }),
        // Playlist fix: Delete the video reference from all playlists
        Playlist.updateMany(
            { videos: videoId }, // Find all playlists containing this video
            { 
                $pull: { 
                    videos: videoId 
                } 
            } // Remove (pull) only this video from the array
        )
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Video deleted successfully")
    )

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: toggle publish status

    if(!mongoose.Types.ObjectId.isValid(videoId)){
        throw new ApiError(400, "Invalid Video ID")
    }

    const video = await Video.findById(videoId)
    if(!video){
        throw new ApiError(404, "Video not found")
    }

    if(video.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403, "You are not authorized to toggle publish status of this video")
    }

    video.isPublished = !video.isPublished
    await video.save({
        validateBeforeSave: false
    })

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            `Video status changed to ${video.isPublished ? "Published" : "Unpublished"}`,
            video
        )
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}