import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    //TODO: create playlist

    if (!name){
        throw new ApiError(400, "Please give name of playlist.")
    }
 
    if (!description){
        throw new ApiError(400, "Please give description of playlist.")
    }

    try {
        const newPlaylist = await Playlist.create({
            name: name,
            description: description,
            owner: req.user?._id
        })
    
        if(!newPlaylist){
            throw new ApiError(500, "Error in creating playlist.")
        }
    
        return res
        .status(200)
        .json(
            new ApiResponse(200, {newPlaylist}, "Playlist created successfully.")
        )
    } 
    catch (error) {
        throw new ApiError(500, "Getting error in creating the playlist.")
    }

})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists

    if (!userId){
        throw new ApiError(400, "Please give user ID")
    }

    try {
        const playlist = await Playlist.aggregate([
            {
                $match: 
                {
                    owner: new mongoose.Types.ObjectId(userId)
                },
            },
            {
                $lookup:
                {
                    from: "videos",
                    localField: "videos",
                    foreignField: "_id",
                    as: "videos",
                    pipeline: [
                        {
                            $match: 
                            {
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
                                as : "videoOwner",
                                pipeline: [
                                    {
                                        $project: {
                                            username: 1,
                                            email: 1,
                                            fullName: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                likes: 
                                {
                                    $cond: {
                                        if: { $eq: [{ $size: "$likes.totalLikes" }, 0] }, // Check if likes array is empty
                                        then: 0, // If empty, project 0
                                        else: { $first: "$likes.totalLikes" } // Otherwise, project the total likes count
                                    }
                                },
                                videoOwner: 
                                {
                                    $first: "$videoOwner"
                                },
                            }
                        },
                        {
                            $project: 
                            {
                                _id: 1,
                                videoFile: 1,
                                thumbnail: 1,
                                title: 1,
                                description: 1,
                                duration: 1,
                                createdAt: 1,
                                views: 1,
                                likes: 1,
                                videoOwner: 1,
                            }
                        }
                    ]
                }
            },
            {
                $addFields: 
                {
                    totalVideos: 
                    {
                        $size: "$videos"
                    },
                    totalViews: 
                    {
                        $sum: "$videos.views"
                    },
                    playlistLikes: 
                    {
                        $sum: "$videos.likes"
                    }
                }
            },
            {
                $project: 
                {
                    name: 1,
                    description: 1,
                    totalVideos: 1,
                    totalViews: 1,
                    playlistLikes: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    videos: {
                        _id: 1,
                        videoFile: 1,
                        thumbnail: 1,
                        title: 1,
                        description: 1,
                        duration: 1,
                        createdAt: 1,
                        views: 1,
                        likes: 1,
                        videoOwner: 1
                    },
                }
            }
        
        ])
    
        if (!playlist){
            throw new ApiError(500, "Error in getting the playlists.")
        }
    
        return res
        .status(200)
        .json(
            new ApiResponse(200, playlist, "Playlists fetched successfully.")
        )
    } 
    catch (error) {
        throw new ApiError(500, "Getting error in fetching the playlist information.")
    }
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id

    if (!playlistId){
        throw new ApiError(400, "Please give playlist ID")
    }


    try {
        const playlist = await Playlist.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(playlistId)
                }
            },
            {
                $lookup:
                {
                    from: "videos",
                    localField: "videos",
                    foreignField: "_id",
                    as: "videos",
                    pipeline: [
                        {
                            $match: 
                            {
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
                                as : "videoOwner",
                                pipeline: [
                                    {
                                        $project: {
                                            username: 1,
                                            email: 1,
                                            fullName: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                likes: 
                                {
                                    $cond: {
                                        if: { $eq: [{ $size: "$likes.totalLikes" }, 0] }, // Check if likes array is empty
                                        then: 0, // If empty, project 0
                                        else: { $first: "$likes.totalLikes" } // Otherwise, project the total likes count
                                    }
                                },

                                videoOwner: 
                                {
                                    $first: "$videoOwner"
                                }
                            }
                        },
                        {
                            $project: 
                            {
                                _id: 1,
                                videoFile: 1,
                                thumbnail: 1,
                                title: 1,
                                description: 1,
                                duration: 1,
                                createdAt: 1,
                                views: 1,
                                likes: 1,
                                videoOwner: 1
                            }
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
                    as: "owner"
                }
            },
            {
                $addFields:
                {
                    playlistLikes: 
                    {
                        $sum: "$videos.likes"
                    },
                    totalViews:
                    {
                        $sum: "$videos.views"
                    },
                    owner: {
                        $first: "$owner"
                    },
                    totalVideos:
                    {
                        $size: "$videos"
                    }
                }
            },
            {
                $project:
                {
                    _id: 1,
                    name: 1,
                    description: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    totalVideos: 1,
                    totalViews: 1,
                    playlistLikes: 1,
                    videos: {
                        _id: 1,
                        videoFile: 1,
                        thumbnail: 1,
                        title: 1,
                        description: 1,
                        duration: 1,
                        createdAt: 1,
                        views: 1,
                        likes: 1,
                        videoOwner: 1
                    },
                    owner: {
                        username: 1,
                        fullName: 1,
                    }
                }
            }
        ])
    
        if(!playlist){
            throw new ApiError(500, "Playlist not found.")
        }
    
        return res
        .status(200)
        .json(
            new ApiResponse(200, playlist[0], "Playlist fetched successfully.")
        )
    } 
    catch (error) {
        throw new ApiError(500, `"Getting error in fetching the response. Error is ${error}"`)
    }
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params

    if(!playlistId){
        throw new ApiError(400, "Please give playlist ID where you want to add the video.")
    }

    if(!videoId){
        throw new ApiError(400, "Please give video ID which you want to add in the playlist.")
    }

    try {

        const playList = await Playlist.findById(playlistId)
        const video = await Video.findById(videoId)
    
        if(!playList){
            throw new ApiError(500, "Playlist not found.")
        }
    
        if(!video){
            throw new ApiError(500, "Video not found.")
        }

        const objectIdValues = playList.videos
        let valueExists = false;

        for (let objectId of objectIdValues) {
            if (objectId.equals(videoId)) {
              valueExists = true;
              break; // No need to continue once found
            }
        }

        if(playList.owner?.toString() !== req.user?._id.toString()){
            throw new ApiError(500, "Only playlist owner can add the videos in the playlist.")
        }
    
        /* 
          $addToSet operator adds a value to an array field only if it does not already exist 
                    in the array.
          $push operator appends a specified value to an array field in a MongoDB document.
        */
        if (!valueExists) {
            const addVideoToPlaylist = await Playlist.findByIdAndUpdate(
                playlistId,
                {
                    $addToSet:
                    {
                        videos: videoId
                    },
        
                },
                { new: true }
            )
        
            if(!addVideoToPlaylist){
                throw new ApiError(500, "Error in adding video to playlist.")
            }
        
            return res
            .status(200)
            .json(
                new ApiResponse(200, {addVideoToPlaylist}, "Video added to playlist.")
            )
        }
        else {
            return res
            .status(200)
            .json(
                new ApiResponse(200, "Video already added in the playlist.")
            )
        }
    } 
    catch (error) {
        throw new ApiError(500, `"Getting error in adding video to playlist. Error is ${error}"`)
    }
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

    if(!playlistId){
        throw new ApiError(400, "Please give playlist ID where you want to remove/delete the video.")
    }

    if(!videoId){
        throw new ApiError(400, "Please give video ID which you want to remove/delete from the playlist.")
    }

    try {

        const playList = await Playlist.findById(playlistId)
        const video = await Video.findById(videoId)
    
        if(!playList){
            throw new ApiError(500, "Playlist not found.")
        }
    
        if(!video){
            throw new ApiError(500, "Video not found.")
        }

        const objectIdValues = playList.videos
        let valueExists = false;

        for (let objectId of objectIdValues) {
            if (objectId.equals(videoId)) {
              valueExists = true;
              break; // No need to continue once found
            }
          }

        if(playList.owner?.toString() !== req.user?._id.toString()){
            throw new ApiError(500, "Only playlist owner can update the playlist.")
        }
    
        /* 
          $pull operator remove a specified value to an array field in a MongoDB document.
        */
        
        if (valueExists) {
            const removeVideoToPlaylist = await Playlist.findByIdAndUpdate(
                playlistId,
                {
                    $pull:
                    {
                        videos: videoId
                    },
        
                },
                { new: true }
            )
        
            if(!removeVideoToPlaylist){
                throw new ApiError(500, "Error in removing video to playlist.")
            }
        
            return res
            .status(200)
            .json(
                new ApiResponse(200, {removeVideoToPlaylist}, "Video removed from playlist.")
            )
        }
        else {
            return res
            .status(200)
            .json(
                new ApiResponse(200, "Video is not exist in playlist.")
            )
        }
    } 
    catch (error) {
        throw new ApiError(500, `"Getting error in removing video to playlist. Error is ${error}"`)
    }
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist

    if(!playlistId){
        throw new ApiError(400, "Please give playlist ID which you want to delete.")
    }

    try {
        const playList = await Playlist.findById(playlistId)
    
        if(!playList){
            throw new ApiError(500, "Playlist not found.")
        }

        if(playList.owner?.toString() !== req.user?._id.toString()){
            throw new ApiError(500, "Only playlist owner can delete the playlist.")
        }

        const deletePlaylist = await Playlist.findByIdAndDelete(playlistId)
    
        if(!deletePlaylist){
            throw new ApiError(500, "Error in deleting the playlist.")
        }
    
        return res
        .status(200)
        .json(
            new ApiResponse(200, {deletePlaylist}, "Deleted the playlist.")
        )
    } 
    catch (error) {
        throw new ApiError(500, `"Getting error in deleting the playlist. Error is ${error}"`)
    }

})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist

    if(!playlistId){
        throw new ApiError(400, "Please give playlist ID which you want to update.")
    }

    if (!name){
        throw new ApiError(400, `"Please give new name of playlist."`)
    }

    if (!description){
        throw new ApiError(400, `"Please give new description of playlist."`)
    }

    try {

        const userId = req.user?._id
        const oldPlaylist = await Playlist.findById(playlistId)

        if (oldPlaylist.owner.equals(userId)) {

            const updatedPlaylist = await Playlist.findByIdAndUpdate(
                playlistId,
                {
                    $set: 
                    {
                        name: name || oldPlaylist?.name,
                        description: description || oldPlaylist?.description
                    }
                },
                { new: true }
            )
        
            if (!updatedPlaylist){
                throw new ApiError(500, "Error in updating the playlist name or description.")
            }
        
            return res
            .status(200)
            .json(
                new ApiResponse(200, updatedPlaylist, "Playlist name or description updated successfully.")
            )
        }
        else {
            throw new ApiError(500, "Only owner can update the playlist.")
        }
    } 
    catch (error) {
        throw new ApiError(500, `"Getting error in updating the playlist name or description. Error is ${error}"`)
    }
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
