import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    /*
      Step1: We have all the channel and its subscriber information in the Subscription table,
             so we can find the document which have that user and channel pair in Subscription table.
      Step2: If we find the document for that pair then we will delete that document 
      Step3: If we don't find the document for that pair then we will create new document.
    */

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Please provide channel ID.")
    }
 
    let user = req.user?._id

    // console.log("channelId :", channelId)
    // console.log("user :", user)

    if(req.user?._id.equals(channelId)){
        throw new ApiError(400, "channel can not subscribe itself.")
    }

    try {
        /*
            Step1: We have all the channel and its subscriber information in the Subscription table,
            so we can find the document which have that user and channel pair in Subscription table.
        */
        const subscriptionInfo = await Subscription.findOne(
            {
                subscriber: new mongoose.Types.ObjectId(user),
                channel: new mongoose.Types.ObjectId(channelId)
            }
        )

        // console.log("subscriptionInfo :", subscriptionInfo)

    
        /*
            Step2: If we find the document for that pair then we will delete that document 
        */
        if(subscriptionInfo && subscriptionInfo?.length !== 0){
    
            const subscriptionId = new mongoose.Types.ObjectId(subscriptionInfo._id)

            const subscriptionDelete = await Subscription.findByIdAndDelete(
                {_id: subscriptionId}
            )
    
            console.log("subscriptionDelete :", subscriptionDelete)

            if (subscriptionDelete) {
                return res
                .status(200)
                .json(
                    new ApiResponse(200, "Channel unsubscribed successfully.")
                )
            }
        }
        else {
            /*
                Step3: If we don't find the document for that pair then we will create new document.
            */
            const subscriptionCreated = await Subscription.create({
                subscriber: req.user?._id,
                channel: channelId
            })

            console.log("subscriptionCreated :", subscriptionCreated)
    
            if (subscriptionCreated) {
                return res
                .status(200)
                .json(new ApiResponse(200, "Channel subscribed successfully."))
            }
        }
    } 
    catch (error) {
        throw new ApiError(500, `"Error in toggling the subscription."`)
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Please provide channel ID.")
    }

    /*
      Step1: Apply the aggregate pipeline to fetch all the documents which have matching channelId.
      Step2: Now apply left outer join with users and fetch subscriber user details.
      Step3: If you are getting any document then return the output based on that.
    */
    try {
        const subscriberList = await Subscription.aggregate([
            {
                $match: {
                    channel: new mongoose.Types.ObjectId(channelId),
                },
            },
            {
                $lookup: {
                    from: "users",
                    localField: "subscriber",
                    foreignField: "_id",
                    as: "user",
                    pipeline: [
                        {
                            $project: {
                                fullName: 1,
                                username: 1,
                                email: 1           
                            },
                        }
                    ]
                }
            },
            {
                $project: {
                    "_id": 1,
                    "subscriber": 1,
                    "channel": 1,
                    "createdAt": 1,
                    "updatedAt": 1,
                    "user._id": 1,
                    "user.fullName": 1,
                    "user.username": 1,
                    "user.email": 1
                }
            }
        ])
    
        if (subscriberList.length === 0){
            return res
            .status(200)
            .json(
                new ApiResponse(200, subscriberList, "Nobody subscribe the channel till now.")
            )
        }
        else {
            return res
            .status(200)
            .json(
                new ApiResponse(200, subscriberList, "Subscriber list fetched successfully.")
            )
        }
    } 
    catch (error) {
        throw new ApiError(500, "Getting error in fetching the subscriber list from MongoDB database.")
    }
})     

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const {subscriberId} = req.params

    console.log("subscriberId :", subscriberId)

    if(!subscriberId){
        throw new ApiError(400, "Please provide subscriber ID.")
    }

    /*
      Step1: Apply the aggregate pipeline to fetch all the documents which have matching subscriberId.
      Step2: Now apply left outer join with users and fetch all channels user details subscribed 
             by subscriber.
      Step3: If you are getting any document then return the output based on that.
    */



    try {
        const subscriberList = await Subscription.aggregate([
            {
                $match: {
                    subscriber: new mongoose.Types.ObjectId(subscriberId)
                }
            },
            {
                $lookup:
                {
                    from: "users",
                    localField: "channel",
                    foreignField: "_id",
                    as: "user",
                    pipeline: [
                        {
                            $project:
                            {
                                fullName: 1,
                                username: 1,
                                email: 1
                            }
                        }
                    ]
                }
            },
            {
                $project: {
                    "_id": 1,
                    "subscriber": 1,
                    "channel": 1,
                    "createdAt": 1,
                    "updatedAt": 1,
                    "user._id": 1,
                    "user.fullName": 1,
                    "user.username": 1,
                    "user.email": 1
                }
            }
        ]);
    
        if(subscriberList.length === 0){
            return res
            .status(200)
            .json(
                new ApiResponse(200, subscriberList, "This subscriber is not subscribe any channel till now.")
            )
        }
        else{
            return res
            .status(200)
            .json(
                new ApiResponse(200, subscriberList, "Channel list fetched successfully.")
            )
        }
    } catch (error) {
        throw new ApiError(500, "Getting error in fetching channel list from MongoDB database.")
    }

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}