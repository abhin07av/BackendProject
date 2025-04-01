import asyncHandler from "../utils/asynchandler.js";

const registerUser = asyncHandler(async (requestAnimationFrame,res)=>{
    requestAnimationFrame.status(200).json({
        message: "ok"
    })
})

export {registerUser};