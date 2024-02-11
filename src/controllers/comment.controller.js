import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {Video} from "../models/video.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const pageNumber = parseInt(page);
    const pageSize = parseInt(limit);

    if(!videoId){
        throw new ApiError(400, "Please give video ID.")
    }

    // if([page, limit].some((field) => field?.trim() === "")){
    //     throw new ApiError(400, "Please give the document limit and page number.")
    // }

    try {
        const video = await Video.findById(videoId)
    
        if(!video){
            throw new ApiError(500, "Video not found.")
        }
    
        const comments = await Comment.aggregate([
            // Stage 1: Match your criteria, if any
            { 
                $match: { 
                    video: new mongoose.Types.ObjectId(video?._id)
                } 
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "username",
                }
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "comment",
                    as: "likes",
                },
            },
            {
                $addFields: {
                    username: {
                        $first: "$username"
                    },
                    likesCount: {
                        $size: "$likes",
                    },
                    isLiked: {
                        $cond: {
                            if: {$in: [req.user?._id, "$likes.likedBy"]},
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: {
                    content: 1,
                    likesCount: 1,
                    "username.username": 1,
                    "username.fullName": 1,
                    "username.email": 1,
                    createdAt: 1,
                    isLiked: 1
                }
            },
          
            // Stage 3: Skip the documents based on the page number and page size
            { 
                $skip: 
                     (pageNumber - 1) * pageSize 
            },
          
            // Stage 4: Limit the number of documents per page
            { 
                $limit: pageSize 
            }
        ]);
        
        if(comments.length === 0){
            return res
            .status(200)
            .json(
                new ApiResponse(200, {}, "No comment found on this video.")
            )
        }
        else {
            return res
            .status(200)
            .json(
                new ApiResponse(200, {comments}, "Comments fetched successfully.")
            )
        }
    } 
    catch (error) {
        throw new ApiError(500, "Getting error in finding the comments on this video.")
    }

})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video

    const {videoId} = req.params
    const {content} = req.body


    console.log("videoId :", videoId)
    console.log("content :", content)

    const user = req.user?._id
    
    if(!videoId){
        throw new ApiError(400, "Please provide the video on which you want to comment.")
    }

    if(!content){
        throw new ApiError(400, "Please give the comment")
    }

    try {
        const video = await Video.findById(videoId)
    
        if(!video._id){
            throw new ApiError(500, "No video found in database.")
        }
    
        const createComment = await Comment.create({
            owner: user,
            video: videoId,
            content: content
        })
    
        if(!createComment){
            throw new ApiError(500, "Error in creating the comment")
        }
    
        return res
        .status(200)
        .json(
            new ApiResponse(200, createComment, "Comment added on the video.")
        )
    } 
    catch (error) {
        throw new ApiError(500, "Getting error in adding the comment.")
    }
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params
    const {newComment} = req.body

    if(!commentId){
        throw new ApiError(400, "Please give comment ID which you want to update.")
    }

    if(!newComment){
        throw new ApiError(400, "Please give new comment.")
    }

    try {
        const comment = await Comment.findByIdAndUpdate(
            commentId,
            {
                $set:
                {
                    content: newComment
                }
            },
            {
                new: true
            }
        )
    
        // console.log("comment :", comment)

        if(!comment){
            throw new ApiError(500, "Error in updating the comment.")
        }
    
        return res
        .status(200)
        .json(
            new ApiResponse(200, comment, "Comment updated successfully.")
        )
    } 
    catch (error) {
        throw new ApiError(500, "Getting error in updating the comment.")
    }
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment

    const {commentId} = req.params

    if(!commentId){
        throw new ApiError(400, "Please give comment ID which you want to update.")
    }

    try {
        const comment = await Comment.findByIdAndDelete(commentId)
    
        if(!comment){
            throw new ApiError(500, "Error in deleting the comment.")
        }
    
        return res
        .status(200)
        .json(
            new ApiResponse(200, {}, "Comment deleted successfully.")
        )
    } 
    catch (error) {
        throw new ApiError(500, "Getting error in deleting the comment.")
    }
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
    }
