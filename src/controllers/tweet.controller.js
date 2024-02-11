import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {

    const user = req.user?._id
    const {content} = req.body

    console.log("content: ", content)
    console.log("user: ", user)
    try {
        if(!content){
            throw new ApiError(400, "Please give content of tweet.")
        }

        console.log("content-1: ", content)

        const tweet = await Tweet.create({
            content: content,
            owner: user
        });
    
        const tweetdetails = await Tweet.findById(tweet).select("content owner")
        console.log("tweet: ", tweet)

        if(!tweet){
            throw new ApiError(500, "Error posting your tweet")    
        }
    
        return res
        .status(200)
        .json(
            new ApiResponse(200, tweetdetails, "Tweet posted")
        )
    
    } 
    catch (error) {
        throw new ApiError(500, `"Getting error in creating the tweet. error is ${error}"`)
    }
})

const getUserTweets = asyncHandler(async (req, res) => {
    // const {user} = req.params;
    // const user = req.user?._id

    const {user} = req.query
    
    console.log("user: ", user)

    try {
        const tweets = await Tweet.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(user)
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "user"
                }
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "tweet",
                    as: "tweetlikes",
                    pipeline: [
                        {
                            $project: {
                                likedBy: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    likesCount: {
                        "$size": "$tweetlikes"
                    }
                }
            },
            {
                $project: {
                    "_id": 1,           
                    "content": 1,
                    "user.username": 1,
                    "likesCount" : 1,
                    "tweetlikes.likedBy": 1
                }
            }
        ])

        console.log("tweets :", tweets)
    
        if (!tweets){
            throw new ApiError(500, "Error fetching your tweets")
        }
        
        return res
        .status(200)
        .json(
            new ApiResponse(200, {tweets}, "Tweets fetched successfully")
        )
    } 
    catch (error) {
        throw new ApiError(500, "Getting error in fetching the tweets.")
    }
})

const updateTweet = asyncHandler(async (req, res) => {

    const {tweetId} = req.params
    const newContent = req.body

    console.log("tweetId :", tweetId)
    console.log("newContent :", newContent)

    try {
        if(!tweetId){
            throw new ApiError(400, "Please provide tweet ID.")
        }
    
        if(!newContent){
            throw new ApiError(400, "Please provide content which you want to update in previous tweet.")
        }
    
        console.log("newContent :", newContent)
        const updatedTweet = await Tweet.findByIdAndUpdate(
            tweetId,
            {
                $set: {
                    content: newContent.newContent 
            }
            },
            { new: true }
        )
    
        if (!updatedTweet){
            throw new ApiError(500, "Error in updating the tweet.")
        }
    
        return res
        .status(200)
        .json(
            new ApiResponse(200, {updatedTweet}, "Tweet updated successfully.")
        )
    } 
    catch (error) {
        throw new ApiError(500, "Getting error in updating the tweet.")      
    }

})

const deleteTweet = asyncHandler(async (req, res) => {

    const {tweetId} = req.params

    if(!tweetId){
        throw new ApiError(400, "Please provide the tweet ID.")
    }

    const checkingTweet = await Tweet.findById(tweetId)

    if (!checkingTweet) {
        throw new ApiError(500, "Tweet does not exist in database.")
    }

    try {
       
        if (checkingTweet) {
            console.log("checkingTweet :", checkingTweet)
            const deletedTweet = await Tweet.findByIdAndDelete(
                new mongoose.Types.ObjectId(tweetId)
            ) 
            console.log("checkingTweet-1 :", checkingTweet)

        
            if (!deletedTweet){
                throw new ApiError(500, "Error in deleting the tweet.")
            }
        
            return res
            .status(200)
            .json(
                new ApiResponse(200, {}, "Tweet deleted successfully.")
            )
        }
    } 
    catch (error) {
        throw new ApiError(500, "Getting error in deleting the tweet.")
    }
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
