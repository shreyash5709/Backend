import {asyncHandler, ApiError, ApiResponse} from "../utils/index.utils.js"
import {Playlist, Video} from "../models/index.model.js"
import mongoose from "mongoose"

const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    if([name, description].some((field) => field?.trim() === "")){
        throw new ApiError(400, "Name and description are required")
    }

    const existingPlaylist = await Playlist.findOne({
        name: name,
        owner: req.user?._id
    })

    if(existingPlaylist){
        throw new ApiError(409, "Playlist already exists")
    }

    const newPlaylist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    })

    if(!newPlaylist){
        throw new ApiError(500, "Something went wrong while creating playlist")
    }

    return res
    .status(201)
    .json(
        new ApiResponse(201, "Playlist created successfully", newPlaylist)
    )

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    if(!mongoose.isValidObjectId(userId)){
        throw new ApiError(400, "Invalid User ID")
    }

    const playlists = await Playlist.find({
        owner: userId
    })

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Playlists fetched successfully", playlists)
    )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!mongoose.isValidObjectId(playlistId)) {
        throw new ApiError(400, "Invalid Playlist ID");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
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
                    }
                ]
            }
        },
        {
            $unwind: {
                path: "$videos",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $group: {
                _id: "$_id",
                name: { $first: "$name" },
                description: { $first: "$description" },
                owner: { $first: "$owner" },
                videos: { $push: "$videos" },
                updatedAt: { $first: "$updatedAt" }
            }
        }
    ]);

    if (!playlist.length) {
        throw new ApiError(404, "Playlist not found");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, playlist[0], "Playlist fetched successfully")
        );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(![playlistId, videoId].every((id) => mongoose.isValidObjectId(id))){
        throw new ApiError(400, "Invalid Playlist or Video ID")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    const playlist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user?._id
        },
        {
            $addToSet: {
                videos: videoId
            }
        },
        {
            new: true
        }
    )

    if(!playlist){
        throw new ApiError(404, "Playlist not found or you are not the owner of the playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Video added to playlist successfully", playlist)
    )
    
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(![playlistId, videoId].every((id) => mongoose.isValidObjectId(id))){
        throw new ApiError(400, "Invalid Playlist or Video ID")
    }

    const video = await Video.findById(videoId)

    if(!video){
        throw new ApiError(404, "Video not found")
    }

    const playlist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user?._id
        },
        {
            $pull: {
                videos: videoId
            }
        },
        {
            new: true
        }
    )

    if(!playlist){
        throw new ApiError(404, "Playlist not found or you are not the owner of the playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Video removed from playlist successfully", playlist)
    )

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    if(!mongoose.isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid Playlist ID")
    }
    
    const playlist = await Playlist.findById(playlistId)
    if(!playlist){
        throw new ApiError(404, "Playlist not found")
    }

    if(playlist.owner.toString() !== req.user?._id.toString()){
        throw new ApiError(403, "You are not the owner of the playlist")
    }

    await Playlist.findByIdAndDelete(playlistId)

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Playlist deleted successfully")   
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    if(![name, description].every((field) => field?.trim() !== "")){
        throw new ApiError(400, "Name and description are required")
    }

    if(!mongoose.isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid Playlist ID")
    }

    const playlist = await Playlist.findOneAndUpdate(
        {
            _id: playlistId,
            owner: req.user?._id
        },
        {
            $set: {
                name,
                description
            }
        },
        {
            new: true
        }
    )
    
    if(!playlist){
        throw new ApiError(404, "Playlist not found or you are not the owner of the playlist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Playlist updated successfully", playlist)
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}