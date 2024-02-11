import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    
    const userId = req.user?._id

    try {
        // Subscriber count
        const countSubs = await Subscription.countDocuments(
                {
                    channel: new mongoose.Types.ObjectId(userId)
                },
        ) 

        // total video views, total video likes & total videos fetched from this pipeline.
        const videosInfo = await Video.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId)
                }
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
                $project: {
                    _id: 0,
                    likes: {
                        $size: "$likes"
                    },
                    views: "$views",
                    videos: 1
                }
            },
            {
                $group: {
                    _id: null,
                    totalLikes: {
                        $sum: "$likes"
                    },
                    totalViews: {
                        $sum: "$views"
                    },
                    totalvideos: {
                        $sum: 1
                    }
                }
            }
        ]);

        console.log("videosInfo :", videosInfo)

        const channelStats = {
            subscriberCount : `${countSubs}` || 0,
            totalLikesCount: videosInfo[0]?.totalLikes || 0,
            totalViewsCount: videosInfo[0]?.totalViews || 0,
            totalVideosCount: videosInfo[0]?.totalvideos || 0
        };

        console.log("channelStats :", channelStats)
        
        return res
            .status(200)
            .json(
                new ApiResponse(200, {channelStats}, "Dashboard created successfully.")
            )
    } 
    catch (error) {
        new ApiError(500, "Getting error in fetching the dashboard stats.")
    }
})


const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const { page, limit } = req.query;

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;

    const videos = await Video.aggregate([
        { $match:
                {
                    owner: req.user?._id,
                    isPublished: true
                }
        },
        {
            $lookup:
            {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
                pipeline: [
                    {
                        $count: "totalLikes"
                    }
                ]

            }
        },
        {
            $lookup: 
            {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                {
                    $project: 
                    {
                        username: 1,                           
                    }
                },
                ]
            },
        },
        {
            $addFields:
            {
                owner: 
                {
                    $first: "$owner.username"
                },
                likes: 
                {
                    $cond: 
                    {
                        if: { $eq: [{ $size: "$likes.totalLikes" }, 0] }, // Check if likes array is empty
                        then: 0, // If empty, project 0
                        else: { $first: "$likes.totalLikes" } // Otherwise, project the total likes count
                    }
                },
            },
        },
        {
            $project:
            {
                "_id": 1,
                "videoFile": 1,
                "thumbnail": 1,
                "title": 1,
                "description": 1,
                "duration": 1,
                "views": 1,
                "isPublished": 1,
                "owner": 1,
                "createdAt": 1,
                "updatedAt": 1,
                "likes": 1,
            }
        },

        { $sort: {  createdAt: -1 } },
        { $skip: skip },
        { $limit: pageSize }        
    ]);

    if (videos.length === 0){
        return res
        .status(200)
        .json(
            new ApiResponse(200, "No video available in this channel.")
        )
    }
    else {
       return res
       .status(200)
       .json(new ApiResponse(200, videos, "Videos fetched successfully"))
    }
})

export {
    getChannelStats, 
    getChannelVideos
    }
