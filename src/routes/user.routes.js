import { Router } from "express";
import { 
    loginUser, registerUser, logoutUser, 
    refreshAccessToken, changePassword, getCurrentUser, 
    updateAccountDetails, updateAvatar, updateCoverImage, 
    getUserChannelProfile, getWatchHistory
} from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/userAuth.middleware.js";


const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: "avatar", 
            maxCount: 1},
        {
            name: "coverImage", 
            maxCount: 1}
    ]),
    registerUser
)

router.route("/login").post(loginUser)

// secure routes
router.route("/logout").post(
    verifyJWT,
    logoutUser
)

router.route("/refresh-token").post(refreshAccessToken)

router.route("/change-password").post(
    verifyJWT,
    changePassword
)

router.route("/current-user").get(
    verifyJWT,
    getCurrentUser
)

router.route("/update-account-details").patch(
    verifyJWT,
    updateAccountDetails
)

router.route("/update-avatar").patch(
    verifyJWT,
    upload.single("avatar"),
    updateAvatar
)

router.route("/update-cover-image").patch(
    verifyJWT,
    upload.single("coverImage"),
    updateCoverImage
)

router.route("/user-channel-profile/:username").get(
    verifyJWT,
    getUserChannelProfile
)

router.route("/watch-history").get(
    verifyJWT,
    getWatchHistory
)


export default router; 