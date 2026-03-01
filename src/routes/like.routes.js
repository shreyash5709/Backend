import { Router } from "express";
import {verifyJWT} from "../middlewares/userAuth.middleware.js"
import {
    toggleCommentLikes,
    toggleTweetLikes,
    toggleVideoLikes,
    getLikedVideos
} from "../controllers/like.controller.js"

const router = Router();

router.use(verifyJWT)

router.route("/video-likes/:videoId").patch(toggleVideoLikes)
router.route("/comment-likes/:commentId").patch(toggleCommentLikes)
router.route("/tweet-likes/:tweetId").patch(toggleTweetLikes)
router.route("/liked-videos").get(getLikedVideos)


export default router;