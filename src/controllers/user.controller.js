import asyncHandler from "../utils/asynchandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/Cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

export {registerUser};