import asyncHandler from "../utils/asynchandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()    

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating Refresh or Access Token")
    }
}
const registerUser = asyncHandler(async (req,res)=>{
    // get user details from frontend
    // validation not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const {username, email, fullName, password}=req.body
    //console.log("email: ", email);

    // if (username === ""){
    //     throw new ApiError(400, "Username is required")
    // }
    // if()... check for every field

    if([username, email, fullName, password].some((field)=>
    field?.trim() === "")
    ){
        throw new ApiError(400, "All fields are required")
    }

    const existedUsername = await  User.findOne({ username });
    if(existedUsername){
        throw new ApiError(409, "Username already exists");
    }

    const existedEmail = await User.findOne({ email });
    if(existedEmail){
        throw new ApiError(409, "Email already exists");
    }
    
    //*To Validate multiple fields at the same time*

    // const existedUser= User.findOne({
    //     $or: [{username}, {email}]
    // })
    // if(existedUser){
    //     throw new ApiError(409, "Username or Email already exists");
    // }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath=req.files.coverImage[0].path
    }

    // console.log("Avatar Local Path:", avatarLocalPath);
    // console.log("Cover Image Local Path:", coverImageLocalPath);

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file path is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage =await uploadOnCloudinary(coverImageLocalPath)
    // console.log("Avatar :", avatar);

    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    const createdUser= await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User Registered Successfully")
    )
})

const loginUser=asyncHandler(async (req,res)=>{
        //req body -> data
        //username or email 
        //find the user
        //password check
        //access and refresh token
        //send cookie

        const {email, username, password} = req.body
        if(!(username || email)){
            throw new ApiError(400, "Username or Email is required");
        }

        const user = await User.findOne({
            $or : [{username}, {email}]
        })

        if(!user){
            throw new ApiError(404, "User does not exist")
        }

        const isPasswordValid = await user.isPasswordCorrect(password)

        if(!isPasswordValid){
            throw new ApiError (401, "Invalid user credentials")
        }

        const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id);

        const loggedInUser = await User.findById(user._id).select( "-password -refreshToken" );

        const options ={
            httpOnly: true,
            secure: true
        }
        return res
        .status(200)
        .cookie("accessToken",accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged in successfully"
            )
        )
})

const logoutUser = asyncHandler(async (req, res, next) => {
        try {
            await User.findByIdAndUpdate(req.user._id, {
                $set: { refreshToken: undefined }
            }, { new: true });
    
            const options = {
                httpOnly: true,
                secure: true
            };
    
            return res
                .status(200)
                .clearCookie("accessToken", options)
                .clearCookie("refreshToken", options)
                .json(new ApiResponse(200, {}, "User logged out successfully"));
        } catch (error) {
            return next(new ApiError(500, error.message || "Logout failed"));
        }
});
    
const refreshAccessToken = asyncHandler(async (req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorised Access");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = User.findById(decodedToken?._id);
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token");
        }   
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh Token expired or used");
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} =await generateAccessAndRefreshToken(user._id);
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access Token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
    }

});


const changeCurrentPassword = asyncHandler ( async (req,res) => { 
    const  {oldPassword, newPassword} = req.body;

    const user = await User.findById (req.user?.id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if(!isPasswordCorrect){
        throw new ApiError(400, "Invlaid Old password")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
});

const getUser = asyncHandler ( async (req, res) => {
    return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully")
})

const updateAccountDetails = asyncHandler ( async (req, res)=>{
    const {fullName, email} = req.body

    if(!(fullName || !email)){
        throw new ApiError(400, "All fields are required")
    }

    const user = User.findByIdAndUpdate( 
        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, "Account Details Updated Succesfully"))

})

const updateUserAvatar = asyncHandler (async (req,res)=>{
    const AvatarLocalPath = req.file?.path;

    if(!AvatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(AvatarLocalPath);
    if(!avatar.url){
        throw new ApiError(400, "Error while uploading Avatar")
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Avatar Updated successfully")
    )
})
const updateUserCoverImage = asyncHandler (async (req,res)=>{
    const CoverImageLocalPath = req.file?.path;

    if(!CoverImageLocalPath){
        throw new ApiError(400, "Cover Image file is missing")
    }

    const coverImage = await uploadOnCloudinary(CoverImageLocalPath);
    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading Cover Image")
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, "Cover Image Updated successfully")
    )
})
export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
};