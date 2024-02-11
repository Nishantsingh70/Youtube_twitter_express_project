import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import fs from 'fs'
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {deleteOldFile} from "../utils/cloudinaryDelete.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    // TODO: get all videos based on query, sort, pagination
    
    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);
    const skip = (pageNumber - 1) * pageSize;
    
    // console.log("page :", page)
    // console.log("limit :", limit)
    // console.log("query :", query)
    // console.log("sortBy :", sortBy)
    // console.log("sortType :", sortType)
    // console.log("userId :", userId)

    if (!query){
        throw new ApiError(400, "Please give query to retrieve video.")
    }

    if (!sortBy){
        throw new ApiError(400, "Please give sortBy value to sort the videos.")
    }
    
    if (!sortType){
        throw new ApiError(400, "Please give sortType value of video.")
    }

    if (!userId){
        throw new ApiError(400, "Please give user Id.")
    }

    // Create match object based on query parameters
    try {
        // Add query logic based on the 'query' parameter
        // Create aggregation pipeline
        
        const videos = await Video.aggregate([
            { $match:
                    {
                        $or:
                        [ 
                            { title: {$regex: query, $options: 'i'}},
                            { description: { $regex: query, $options: 'i'}}
                        ],
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
                        $cond: {
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

            { $sort: { [sortBy]: sortType === 'asc' ? 1 : -1 } },
            { $skip: skip },
            { $limit: pageSize }        
        ]);
        
        // console.log("videos :", videos)
        if(videos.length === 0){

            return res
            .status(200)
            .json(
                new ApiResponse(200, "No video available.")
            )
        }
        else {

            return res
            .status(200)
            .json(
                new ApiResponse(200, {videos}, "Video fetched successfully.")
            )
        }
    } 
    catch (error) {
        throw new ApiError(500, `"Getting error in fetching the videos from database. error is ${error}"`)      
    }
})

const publishAVideo = asyncHandler(async (req, res) => {
    const {title, description} = req.body

    /*
       Step1: First we have to take title and description and check it.
       Step2: Get the videoFile and thumbnail from middleware.
       Step3: Fetch the local path of videoFile and thumbnail, then update it on cloudinary.
       Step4: Create the mongoDB document for the new video.
    */

    try {
       // Step1: First we have to take title and description and check it.
       if([title, description].some(field => field.trim() === "")){
           throw new ApiError(400, "Please provide title and description")
       }
   
       if (!title){
        throw new ApiError(400, "Please give title of video.")
       }

       if (!description){
        throw new ApiError(400, "Please give description of video.")
       }

       const userId = req.user?._id
   
       // Step2: Get the videoFile and thumbnail from middleware.
       const videoFilePath = req.files?.videoFile[0].path
       const thumbnailPath = req.files?.thumbnail[0].path
   
       if(!videoFilePath){
           throw new ApiError(400, "Error in fetching the video file local path.")
       }
   
       if(!thumbnailPath){
           throw new ApiError(400, "Error in fetching the thumbnail file local path.")
       }
   
   
       // Step3: Fetch the local path of videoFile and thumbnail, then update it on cloudinary.
       const videoFileCloudinaryPath = await uploadOnCloudinary(videoFilePath)
       const thumbnailPathCloudinaryPath = await uploadOnCloudinary(thumbnailPath)
   
       // console.log("videoFileCloudinaryPath :", videoFileCloudinaryPath)
       // console.log("thumbnailPathCloudinaryPath :", thumbnailPathCloudinaryPath)
   
       if(!videoFileCloudinaryPath){
           throw new ApiError(400, "Error in updating the video file in cloudinary.")
       }
   
       if(!thumbnailPathCloudinaryPath){
           throw new ApiError(400, "Error in updating the thumbnail in cloudinary.")
       }
   
       // console.log("videoFileCloudinaryPath.secure_url :", videoFileCloudinaryPath.secure_url)
       // console.log("videoFileCloudinaryPath.duration :", videoFileCloudinaryPath.duration)
       // console.log("thumbnailPathCloudinaryPath.secure_url :", thumbnailPathCloudinaryPath.secure_url)
       // console.log("title :", title)
       // console.log("description :", description)

       
       // Step4: Create the mongoDB document for the new video
       if (videoFileCloudinaryPath && thumbnailPathCloudinaryPath) {
            const video = await Video.create({
               videoFile: videoFileCloudinaryPath.secure_url,
               thumbnail: thumbnailPathCloudinaryPath.secure_url,
               title:  title,
               description: description,
               duration: videoFileCloudinaryPath.duration,
               views: 0,
               owner: userId
            })
 
            console.log("video :", video)
 
            if(!video){
                await deleteOldFile(videoFileCloudinaryPath)
                await deleteOldFile(thumbnailPathCloudinaryPath)
                throw new ApiError(500, "Error in creating the document in MongoDB.") 
            }
    
        return res
        .status(200)
        .json(new ApiResponse(200, video, "Video uploaded Successfully."))
       }
   
    } 
    catch (error) {
        throw new ApiError(500, `"Getting error while uploading the video. Error is ${error}"`)  
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if (!videoId){
        throw new ApiError(400, "Please give video ID")
    }

    try{
        const video2 = await Video.findById(videoId)

        console.log("video2 :", video2)

        if (!video2) {
            throw new ApiError(400, "There is no video available with this video ID")
        }

        const video = await Video.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(videoId)
                }
            },
            {
                $lookup:
                {
                    from: "likes",
                    localField: "_id",
                    foreignField: "video",
                    as: "likes"
                }
            },
            {
                $addFields: {
                        likes: {
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
                $project:
                {
                    "videoFile.url": 1,
                    "title": 1,
                    "description": 1,
                    "views": 1,
                    "createdAt": 1,
                    "duration": 1,
                    "comments": 1,
                    "likes": 1,
                    "isLiked": 1
                }
            }
    ]);

      console.log("video :", video)

        return res
        .status(200)
        .json(new ApiResponse(200, video, "Video fetched successfully."))

    }
    catch(error){
        throw new ApiError(500, "Getting error while getting the video")
    }
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    if(!videoId){
        throw new ApiError(400, "Please give video ID.")
    }

    /*
      Step1: First we have to take title and description and check it.
      Step2: Get the thumbnail from middleware & get the user detail.
      Step3: Find the old video document detail from MongoDB & check that it exist or not.
      Step4: Check the old video document owner and the user which are trying to update 
             video is same or not.
      Step5: Upload the new thumbnail file if we got from user then only and remove old 
             thumbnail file from Cloudinary.
      Step6: Now update the video file which field you want to update in title, description
             and thumbnail.
    */

    // Step1: First we have to take title and description and check it.
    const { title="latest video", description="This is the latest modified video" } = req.body

    if(!title && !description){
        throw new ApiError(400, "Please provide the title or description");
    }

    // console.log("videoId :" , videoId)
    // console.log("title :" , title)
    // console.log("description :" , description)

    // Step2: Get the thumbnail from middleware & get the user detail.
    const thumbnailPath = req.file?.path
    const user = req.user?._id

    // console.log("req.file :" , req.file)
    // console.log("thumbnailPath :" , thumbnailPath)
    
    try {  

        // Step3: Find the old video document detail from MongoDB & check that it exist or not.
        const oldVideo = await Video.findById(videoId)

        if(!oldVideo){
            throw new ApiError(400, "There is no video available with this video ID")
        }

        /*  
            Step4: Check the old video document owner and the user which are trying to update 
            video is same or not.
        */
        if(oldVideo?.owner.equals(user)){
            
            /*
               Step5: Upload the new thumbnail file if we got from user then only and remove old 
               thumbnail file from Cloudinary.
            */
            let uploadedThumbnail;
            if (thumbnailPath){
                uploadedThumbnail = await uploadOnCloudinary(thumbnailPath);

                console.log("uploadedThumbnail :", uploadedThumbnail)

                if (!uploadedThumbnail){
                    throw new ApiError(400, "Error while uploading the new thumbnail.")
                }

                if(oldVideo.thumbnail && uploadedThumbnail){
                    await deleteOldFile(oldVideo.thumbnail)
                }
            }

            /*
                Step6: Now update the video file which field you want to update in title, 
                    description and thumbnail.
            */
            const video = await Video.findByIdAndUpdate(
                videoId,
                {
                  $set: {
                    title: title || oldVideo.title,
                    description: description || oldVideo.description,
                    thumbnail: uploadedThumbnail.secure_url || oldVideo.thumbnail
                  },
                },
                { new: true }
            )

            return res
            .status(200)
            .json(new ApiResponse(200, video, "Video title, "))
        
        }
    }    
    catch (error) {
        throw new ApiError(500, "Getting error while updating the video.") 
    }

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const user = req.user?._id

    if(!videoId){
        throw new ApiError(400, "Please give video ID.")
    }

    try{
        const video = await Video.findById(videoId) 

        if(!video) {
            throw new ApiError(400, "There is no video available with this video ID")
        }

        // console.log("user :", user)
        // console.log("video?.owner :", video?.owner)
        // console.log("video.thumbnail :", video.thumbnail)
        // console.log("video.videoFile :", video.videoFile)

        if (video?.owner.equals(user)) {
            if (video.thumbnail) {
                const deleteThumbnail = await deleteOldFile(video.thumbnail);
                if(!deleteThumbnail){
                    throw new ApiError(500, "Error in deleting the thumbnail file from cloudinary.")
                }
            }
          
            if (video.videoFile) {
                const deleteVideofile = await deleteOldFile(video.videoFile, "video");
                if(!deleteVideofile){
                    throw new ApiError(500, "Error in deleting the video file from cloudinary.")
                }
            }
    
            const deletedVideo = await Video.findByIdAndDelete(videoId)
            if (deletedVideo){
                return res
                .status(200)
                .json(new ApiResponse(200, "Video deleted Successfully."))
            }
        }
        else {
            console.log("User is not allowed to delete the video")
        }
    }
    catch(error){
        throw new ApiError(500, "Getting error while deleting video.")
    }

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    try {
        const video = await Video.findById(videoId)
        
        if (!video){
            throw new ApiError(400, "There is no video available with this video ID")
        }
    
        video.isPublished = !video.isPublished
        await video.save({ validateBeforeSave: false })
    
        return res
        .status(200)
        .json(new ApiResponse(200, video, "Video toggle changed Successfully."))
    } 
    catch (error) {
        throw new ApiError(500, "Getting error while toggling the video.")  
    }
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
