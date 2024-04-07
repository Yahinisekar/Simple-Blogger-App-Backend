import express from 'express';
import { Notifications, addComment, changePassword, createBlog, deleteBlog, deleteComment, forgotPassword, getBlogComments, getBlogs, getProfile, getReply, googleAuth, isLikedByUser, latestBlog, latestBlogCount, likeBlog, loginUser, newNotification, notificationCount, resetPassword, searchBlog, searchBlogsCount, searchUsers, trendingBlogs, updateProfile, updateProfileImg, uploadUrl, userDetails, userWrittenBlogs, userWrittenCount,  } from '../Controllers/validate.js';
import { verifyJWT } from '../middlewares/jwt.js';
import Notification from '../Models/Notification.js';

const router = express.Router();
//post request for the user to signup
router.post("/signup", userDetails);
//post request for user to login
router.post("/login", loginUser);
//post request for google authentication
router.post("/google-auth", googleAuth);
//post request for creating a blog
router.post("/create-blog", verifyJWT, createBlog);
//get all uploaded url
router.get("/get-upload-url", uploadUrl)
//post request to send latest blogs
router.post("/latest-blog", latestBlog)
//get request to display all the trending blogs
router.get("/trending-blog", trendingBlogs)
//post request for the search input to search all blogs
router.post("/search-blogs", searchBlog);
//post request for all latest blogs count
router.post('/all-latest-blog-count', latestBlogCount)
//post request to search blogs count
router.post('/search-blogs-count', searchBlogsCount)
//post request to search users
router.post('/search-users', searchUsers)
//post request to get particular user profile
router.post("/get-profile", getProfile);
//post request to get blogs
router.post('/get-blog', getBlogs)
//post request to like blogs
router.post('/like-blog', verifyJWT, likeBlog);
//post request to check the user liked the post
router.post('/isliked-by-user', verifyJWT, isLikedByUser)
//request to verify user to leave a comment
router.post('/add-comment', verifyJWT, addComment);
//post request to get blog comments
router.post('/get-blog-comments',getBlogComments)

router.post('/get-replies', getReply);

router.post('/delete-comment', verifyJWT, deleteComment)

router.post('/forgot-password', forgotPassword)

router.get('/reset-password', resetPassword);

router.post('/change-password', verifyJWT, changePassword);

router.post('/update-profile-img', verifyJWT, updateProfileImg)

router.post('/update-profile', verifyJWT, updateProfile);

router.get('/new-notification', verifyJWT, newNotification);


router.post('/notifications', verifyJWT, Notifications)

router.post('/all-notifications-count', verifyJWT, notificationCount)

router.post('/user-written-blogs', verifyJWT, userWrittenBlogs)

router.post('/user-written-blogs-count', verifyJWT, userWrittenCount) 


router.post('/delete-blog', verifyJWT, deleteBlog)


export default router;