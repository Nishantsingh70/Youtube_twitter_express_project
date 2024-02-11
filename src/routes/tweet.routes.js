import { Router } from 'express';
import {
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet,
} from "../controllers/tweet.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router.route("/").post(verifyJWT, createTweet);
// router.route("/user/:userId").get(getUserTweets);  // This is for req.params type data fetch.
router.route("/user").get(getUserTweets);             // This is for req.query type data fetch.
router.route("/:tweetId").patch(updateTweet).delete(deleteTweet);

export default router