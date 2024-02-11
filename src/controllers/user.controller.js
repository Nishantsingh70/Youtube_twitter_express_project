import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import {deleteOldFile} from "../utils/cloudinaryDelete.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

/*
const registerUser = asyncHandler( async (req, res) => {
    res.status(200).json({
        message: "chai aur code"
    })
})
*/

const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}


const registerUser = asyncHandler( async (req, res) => {
    // 1. get user details from frontend
    // 2. validation - not empty
    // 3. check if user already exists: username, email
    // 4. check for images, check for avatar
    // 5. upload avator and coverImage to cloudinary. validate avatar
    // 6. create user object - create entry in db
    // 7. remove password and refresh token field from response (We will get all the user detail in response so we have to remove credentials from that response.)
    // 8. check for user creation
    // 9. return res


    // 1. get user details from frontend
    const {fullName, email, username, password } = req.body
    console.log("req.body :",req.body);
    //console.log("email: ", email);

// ===========================================================================

    // 2. checking all field data is empty or not.
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

// ===========================================================================

    try {
        // 3. check if user already exists: username, email
        const existedUser = await User.findOne({
            $or: [{ username }, { email }]
        })
    
        if (existedUser) {
            throw new ApiError(409, "User with email or username already exists")
        }
    
    // ===========================================================================
        
        // 4. check for images, check for avatar
        // Important: express give the req.body access and multer give req.files access.
        console.log("req.files :",req.files)
        console.log("req.files?.avatar :",req.files?.avatar)
        console.log("req.files?.coverImage :",req.files?.coverImage)
    
        const avatarLocalPath = req.files?.avatar[0]?.path;
        //const coverImageLocalPath = req.files?.coverImage[0]?.path;
    
        console.log("req.files?.avatar[0]?.path :",req.files?.avatar[0]?.path)
        console.log("avatarLocalPath :",avatarLocalPath)
        console.log("avatarLocalPath.length :",avatarLocalPath.length)

        if (avatarLocalPath.length === 0) {
            throw new ApiError(400, "Avatar file is required")
        }
    
        let coverImageLocalPath;
        if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
            coverImageLocalPath = req.files.coverImage[0].path
        }
    
    // ===========================================================================
        
        // 5. upload avator and coverImage to cloudinary. validate avatar
        const avatar = await uploadOnCloudinary(avatarLocalPath)
        const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
        console.log("avatar :",avatar)
        console.log("coverImage :",coverImage)

        if (!avatar) {
            throw new ApiError(400, "Avatar file should upload on cloudinary.")
        }
      
    // ===========================================================================
    
        // 6. create user object - create entry in db
        const user = await User.create({
            fullName,
            avatar: avatar.url,
            coverImage: coverImage?.url || "",
            email, 
            password,
            username: username.toLowerCase()
        })
    
    // ===========================================================================
    
        // 7. remove password and refresh token field from response 
        // 8. check for user creation
        const createdUser = await User.findById(user._id).select(
            "-password -refreshToken"
        )
    
        if (!createdUser) {
            throw new ApiError(500, "Something went wrong while registering the user")
        }
    
    // ===========================================================================
    
        // 9. return res
        return res.status(201).json(
            new ApiResponse(200, createdUser, "User registered Successfully")
        )
    } 
    catch (error) {
        throw new ApiError(500, `"Getting error in registering the new user. error is ${error}"`)
    }

} )

const loginUser = asyncHandler(async (req, res) =>{
    // 1. req body -> data
    // 2. check user based on username or email
    // 3. find the user
    // 4. password check
    // 5. Generate access and referesh token and update refreshToken in database.
    // 6. send cookie

    // 1. req body -> data
    const {email, username, password} = req.body
    console.log(email);

   // ===========================================================================

    // 2. check user based on username or email
    if (!username && !email) {
        throw new ApiError(400, "username or email is required")
    }
    
    // Here is an alternative of above code based on logic discussed in video:
    // if (!(username || email)) {
    //     throw new ApiError(400, "username or email is required")
        
    // }

// ===========================================================================

    
    try {
        // 3. find the user
        const user = await User.findOne({
            $or: [{username}, {email}]
        })
    
        if (!user) {
            throw new ApiError(404, "User does not exist")
        }
    
    // ===========================================================================
    
       // 4. password check
       const isPasswordValid = await user.isPasswordCorrect(password)
    
       if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials")
        }
    
    // ===========================================================================
    
       // 5. Generate access and referesh token and update refreshToken in database.
       const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)
    
       /*
          now take the latest user reference after updating the access token & refresh token 
          and remove the password and refreshtoken from the final response.
       */  
        const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
    
        // For modifying the cookie only on server, client is not able to modify the cookies.
        const options = {
            httpOnly: true,
            secure: true
        }
    
        // 6. send cookie
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )
    } 
    catch (error) {
        throw new ApiError(500, "Getting error in login the user.")
    }

})

const logoutUser = asyncHandler(async(req, res) => {
    // 1. We have to remove refresh token

    try {
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $unset: {
                    refreshToken: 1 // this removes the field from document
                }
            },
            {
                new: true
            }
        )
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))
    } 
    catch (error) {
        throw new ApiError(500, "Getting error in logout the user.")
    }
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || 
                                 req.body.refreshToken // for mobile user

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword, confirmPassword} = req.body

    console.log("req.body :", req.body);

    if(newPassword !== confirmPassword){
        throw new ApiError(400, "new password is not matching with confirm password") 
    }

    console.log("oldPassword: ", oldPassword)
    console.log("newPassword: ", newPassword)
    console.log("confirmPassword: ", confirmPassword)

    try {
        const user = await User.findById(req.user?._id)
        const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    
        console.log("isPasswordCorrect: ", isPasswordCorrect)
        if (!isPasswordCorrect) {
            throw new ApiError(400, "Invalid old password")
        }
    
        user.password = newPassword
        await user.save({validateBeforeSave: false})
    
        console.log("Password changed successfully.")
    
        /* 
        This is optional step if you want to delete the refreshToken from mongoDB also then use below query.
        
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $unset: {
                    refreshToken: 1 // this removes the field from document
                }
            },
            {
                new: true
            }
        )
        */
        /* 
          After changing the password, I want user will login again with new password so I cleared the 
          accessToken & refreshToken cookies.   
        */
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "Password changed successfully"))
    } 
    catch (error) {
        throw new ApiError(500, "Getting error in changing the password.")
    }
})


const getCurrentUser = asyncHandler(async(req, res) => {
    try {
        return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "User fetched successfully"
        ))
    } catch (error) {
        throw new ApiError(500, "Getting error in fetching the user detail.")
    }
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    console.log("fullName : ", fullName)
    console.log("email : ", email)

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    try {
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    fullName: fullName,
                    email: email
    
                   /*
                    all options is same.
                    fullName,
                    email: email
    
                    fullName,
                    email
                   */
    
                }
            },
            {new: true}  // it will return the information after updating the values in mongoDB.
            
        ).select("-password -refreshToken")
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, user, "Account details updated successfully"))
    } 
    catch (error) {
        throw new ApiError(500, "Getting error in updating the account details.")
    }
})

const updateUserAvatar = asyncHandler(async(req, res) => {

    const avatarOldCloudinaryURL = req.user?.avatar;
    const avatarLocalPath = req.file?.path

    console.log("avatarOldCloudinaryURL :", avatarOldCloudinaryURL)
    console.log("avatarLocalPath :", avatarLocalPath)

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    try {
        const avatar = await uploadOnCloudinary(avatarLocalPath)
    
        console.log(`"New Image updated successfully on cloudinary, avatar URL is ${avatar.url}"`)
    
        if (!avatar.url) {
            throw new ApiError(400, "Error while uploading on avatar")
            
        }

    
        /*TODO: delete old image - assignment*/
        // Delete old Cloudinary file.
    
        if (avatar.url && avatarOldCloudinaryURL) {
            try {
                console.log("Now delete old avatar image from cloudinary")
    
                const deleteAvatar = await deleteOldFile(avatarOldCloudinaryURL)
                console.log("deleteAvatar :", deleteAvatar)
                if (!deleteAvatar){
                    throw new ApiError(500, "Old Avator image failed to delete from cloudinary")
                }
            } catch (error) {
                throw new ApiError(501, "Old Avator image failed to delete from cloudinary error : ", error)
            }
        }
    
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    avatar: avatar.url
                }
            },
            {new: true}
        ).select("-password -refreshToken")
    
        return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Avatar image updated successfully")
        )
    } 
    catch (error) {
        throw new ApiError(500, "Getting error in updating the Avatar file.")
    }
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path
    const coverImageOldCloudinaryURL = req.user?.coverImage;

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

    //TODO: delete old image - assignment


    try {
        const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    
        if (!coverImage.url) {
            throw new ApiError(400, "Error while uploading on avatar")
            
        }

        // Delete old Cloudinary file.
    
        if (coverImage.url && coverImageOldCloudinaryURL) {
            try {
                console.log("Now delete old avatar image from cloudinary")
    
                const deleteCoverImage = await deleteOldFile(coverImageOldCloudinaryURL)
                console.log("deleteCoverImage :", deleteCoverImage)
                if (!deleteCoverImage){
                    throw new ApiError(500, "Old Cover image failed to delete from cloudinary")
                }
            } catch (error) {
                throw new ApiError(501, `"Old Cover image failed to delete from cloudinary error : ${error}"`)
            }
        }
    
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set:{
                    coverImage: coverImage.url
                }
            },
            {new: true}
        ).select("-password -refreshToken")
    
        return res
        .status(200)
        .json(
            new ApiResponse(200, user, "Cover image updated successfully")
        )
    } 
    catch (error) {
        throw new ApiError(500, "Getting error in updating the cover image.")
    }
})


const getUserChannelProfile = asyncHandler(async(req, res) => {
    const {username} = req.params

    console.log("username :", username)
    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    try {
        const channel = await User.aggregate([
            {
                $match: {
                    username: username?.toLowerCase()
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }
            },
            {
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: "subscribedTo"
                }
            },
            {
                $addFields: {
                    subscribersCount: {
                        $size: "$subscribers"
                    },
                    channelsSubscribedToCount: {
                        $size: "$subscribedTo"
                    },
                    isSubscribed: {
                        $cond: {
                            if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: {
                    fullName: 1,
                    username: 1,
                    subscribersCount: 1,
                    channelsSubscribedToCount: 1,
                    isSubscribed: 1,
                    avatar: 1,
                    coverImage: 1,
                    email: 1
    
                }
            }
        ])
    
        if (!channel?.length) {
            throw new ApiError(404, "channel does not exists")
        }
    
        return res
        .status(200)
        .json(
            new ApiResponse(200, channel[0], "User channel fetched successfully")
        )
    } 
    catch (error) {
        throw new ApiError(500, `"Getting error in fetching the channel details. error is ${error}"`)
    }
})


const getWatchHistory = asyncHandler(async(req, res) => {
    try {
        const user = await User.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.user?._id)
                }
            },
            {
                $lookup: {
                    from: "videos",   // here we use mongoDB tables (so we convert Video into videos)
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",  // here we use mongoDB tables
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                            fullName: 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields:{
                                owner:{
                                    $first: "$owner"
                                }
                            }
                        }
                    ]
                }
            }
        ])
    
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user[0].watchHistory,
                "Watch history fetched successfully"
            )
        )
    } 
    catch (error) {
        throw new ApiError(500, "Getting error in getting the watch history.")
    }
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}