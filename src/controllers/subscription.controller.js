import mongoose, { isValidObjectId } from "mongoose";
import { ApiError, ApiResponse, asyncHandler} from "../utils/index.utils.js";
import { User, Subscription } from "../models/index.model.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid Channel ID")
    }

    if(req.user?._id.toString() === channelId){
        throw new ApiError(400, "You cannot subscribe to your own channel")
    }

    const existingSubscription = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId
    })

    if(existingSubscription){
        await Subscription.findByIdAndDelete(existingSubscription._id)
        return res
        .status(200)
        .json(
            new ApiResponse(200, "Unsubscribed successfully", {isSubscribed: false})
        )
    }

    const newSubscription = await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId
    })

    if(!newSubscription){
        throw new ApiError(500, "Something went wrong while subscribing")
    }   

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Subscribed successfully", {isSubscribed: true})
    )
})

// controller to return subscriber list of a channel
const getChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    const { page = 1, limit = 10 } = req.query;

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid Channel ID")
    }

    const subscriberAggregate = Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
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
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
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
            $unwind: "$subscriber"
        },
        {
            $replaceRoot: {
                newRoot: "$subscriber"
            }
        },
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        customLabels: {
            totalDocs: "subscriberCount",
            docs: "subscriberList",
        },
    }

    const channelSubscribers = await Subscription.aggregatePaginate(subscriberAggregate, options)

    const isOwner = req.user?._id.toString() === channelId.toString()
    const response = {
        subscriberCount: channelSubscribers.subscriberCount,
        subscriberList: isOwner ? channelSubscribers.subscriberList : [],
        totalPage: channelSubscribers.totalPages,
        currentPage: channelSubscribers.page,
        hasNextPage: channelSubscribers.hasNextPage,
        hasPrevPage: channelSubscribers.hasPrevPage
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200, 
            "Subscribers fetched successfully", 
            response
        )
    )

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const subscriberId  = req.user?._id
    
    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400, "Invalid Subscriber ID")
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channelSubscribed",
                pipeline: [{
                    $project: {
                        username: 1,
                        fullName: 1,
                        avatar: 1
                    }
                }]
            },
            
        },
        {
            $unwind: "$channelSubscribed"
        },
        {
            $replaceRoot: {
                newRoot: "$channelSubscribed"
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Subscribed channels fetched successfully", subscribedChannels)
    )
})

export {
    toggleSubscription,
    getChannelSubscribers,
    getSubscribedChannels
}  