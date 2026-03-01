import { Router } from "express";
import {verifyJWT} from "../middlewares/userAuth.middleware.js"
import {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
} from "../controllers/tweet.controller.js"

const router = Router();

router.use(verifyJWT)

router.route("/").post(createTweet)
router.route("/user-tweets").get(getUserTweets)
router.route("/:tweetId")
    .delete(deleteTweet)
    .patch(updateTweet)

export default router;