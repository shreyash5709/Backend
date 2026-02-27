import { Router } from "express";
import {verifyJWT} from "../middlewares/userAuth.middleware.js"
import {
    toggleSubscription,
    getChannelSubscribers,
    getSubscribedChannels
} from "../controllers/subscription.controller.js"


const router = Router();

router.use(verifyJWT)

router.route("/channel-subscribers/:channelId")
    .get(getChannelSubscribers)
    .patch(toggleSubscription)

router.route("/subscribed-channels").get(getSubscribedChannels)


export default router;