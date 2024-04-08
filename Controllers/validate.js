import User from "../Models/Schema.js";
// import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import admin from "firebase-admin";
import serviceAccountKey from "../blog-website-8411c-firebase-adminsdk-jx7sb-e28aa02dae.json" assert { type: "json" };
import { getAuth } from "firebase-admin/auth";
import aws from "aws-sdk";
import Blog from "../Models/Blog.js";
import Notification from "../Models/Notification.js";
import Comment from "../Models/Comment.js";
import generateToken from "../Utils/index.js";
// import cors from 'cors'
// import express from "express";

dotenv.config();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
});

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password

//settingup s3 bucket

const s3 = new aws.S3({
  region: "ap-south-1",
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const uploadToS3 = async () => {
  const date = new Date();
  const imageName = `${nanoid()}-${date.getTime()}.jpeg`;

  return await s3.getSignedUrlPromise("putObject", {
    Bucket: "blogwebsite-20",
    Key: imageName,
    Expires: 1000,
    ContentType: "image/jpeg",
  });
};
export const verifyJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null) {
    return res.status(401).json({ msg: "No token provided" });
  }
  jwt.verify(token, process.env.ACCESS_KEY, (err, user) => {
    if (err) {
      return res.status(404).json({ err: "Access token is invalid" });
    }
    req.user = user.id;
    next();
  });
};

const formatData = (user) => {
  // console.log("user",user)
  const accessToken = jwt.sign({ id: user.id }, process.env.ACCESS_KEY);
  return {
    accessToken,
    profile_img: user.personal_info.profile_img,
    username: user.personal_info.username,
    name: user.personal_info.name,
  };
};
const generateUserName = async (email) => {
  let name = email.split("@")[0];

  let isNotUniqueUsername = await User.find({
    "personal_info.name": name,
  }).then((result) => result);

  isNotUniqueUsername ? (name += nanoid().substring(0)) : " ";
  return name;
};

//upload  image URl route
export const uploadUrl = async (req, res) => {
  uploadToS3()
    .then((url) => res.status(200).json({ uploadURL: url }))
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.message });
    });
};

export const userDetails = async (req, res) => {
  let { name, email, password } = req.body;
  if (name.length < 3) {
    return res
      .status(404)
      .json({ error: "name must be greater than 3 characters" });
  }

  if (!email.length) {
    return res.status(500).json({ Error: "Enter Email" });
  } else if (!emailRegex.test(email)) {
    return res.status(404).json({ error: "Invalid Email Id" });
  }

  if (!password || password.length < 6) {
    return res.status(401).send("Password must be 6 to  20 characters long");
  } else if (!passwordRegex.test(password)) {
    return res
      .status(404)
      .json({
        error:
          "The Password should contain at least one upper case letter,one lowercase letter along with one numeric",
      });
  }

  bcrypt.hash(password, 10, async (err, hashed_pwd) => {
    if (err) {
      return res.status(500).json({ error: "Error hashing password" });
    }
    try {
      let name = await generateUserName(email);
      console.log(name);
      let user = new User({
        personal_info: { name, email, password: hashed_pwd },
      });

      console.log("Saving user:", user);

      await user.save();

      return res
        .status(200)
        .json({ Message: "Signup Successful!", userInfo: formatData(user) });
    } catch (error) {
      console.error("Error saving user:", error);

      if (error.code === 11000) {
        return res.status(409).json("Email or username already in use");
      }
      return res.status(500).json({ Error: error.message });
    }
  });
};
export const loginUser = async (req, res) => {
  // Validate the request body
  const { email, password } = req.body;
  User.findOne({ "personal_info.email": email })
    .then((user) => {
      // return res.status(200).json("User found");
      if (!user) {
        return res.status(401).json("Invalid Email/Password.");
      }
      if (!user.google_auth) {
        bcrypt
          .compare(password, user.personal_info.password)
          .then((valid) => {
            if (!valid) {
              return res.status(401).json("Invalid Password.");
            }
            res.json(formatData(user));
          })
          .catch((err) => {
            console.log(err);
            res.status(500).json("Server Error");
          });
      } else {
        return res.status(401).json("Please Login through Google");
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json("Server Error");
    });
};

export const googleAuth = async (req, res) => {
  let { accessToken } = req.body;
  getAuth()
    .verifyIdToken(accessToken)
    .then(async (ticket) => {
      let { email, name, picture } = ticket;

      picture = picture.replace("s96-c", "s384-c");

      let user = await User.findOne({ "personal_info.email": email })
        .select(
          "personal_info.name personal_info.username personal_info.profile_img  google_auth"
        )
        .then((result) => {
          return result || null;
        })
        .catch((err) => {
          return res.status(500).json({ error: err.message });
        });
      //login the user
      if (user) {
        if (!user.google_auth) {
          return res.status(404).json({
            error:
              "This email was signedup without google. Please login to get access",
          });
        }
        //signup the user
      } else {
        let username = await generateUserName(email);
        user = new User({
          personal_info: {
            name: name,
            email: email,
            profile_img: picture,
            username: username,
          },
          google_auth: true,
        });
        await user
          .save()
          .then((result) => {
            user = result;
          })
          .catch((err) => {
            return res.status(404).json({ error: err.message });
          });
      }
      return res.status(200).json(formatData(user));
    })
    .catch((err) =>
      res
        .status(500)
        .json({
          "Error Occured":
            "Failed to authenticate with google. Try with  different account.",
        })
    );
};

export const changePassword = (req,res) => {
  let { currentPassword, newPassword } = req.body;
   if (
     !passwordRegex.test(currentPassword) ||
     !passwordRegex.test(newPassword)
   ) {
     return res.status(403).json({error:"The Password should contain at least one upper case letter, one lowercase letter along with one numeric"
   });
  }
  User.findOne({ _id: req.user }).then((user) => {
    //checks the user is a google_auth or not and inform the user you won't change the password
    if (user.google_auth) {
         return res.status(403).json({error: "You are logged in with google, you won't able to change the password"});
    }
    bcrypt.compare(currentPassword, user.personal_info.password, (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Some error will be occured while changing the password" })
      }
      if(!result) {
             return res.status(403).json({error:"Incorrect current password"})     
      }
      bcrypt.hash(newPassword, 10, (err,hashed_pwd)=> {
        User.findOneAndUpdate(
          { _id: req.user },
          { "personal_info.password": hashed_pwd }
        )
          .then((u) => {
            return res
              .status(200)
              .json({ status: "Successfully changed your password!" });
          })
          .catch((e) => {
            console.log("ERROR IN PASSWORD CHANGE", e);
            return res
              .status(500)
              .json({ error: "Server Error! Please try again later." });
          });
      })
    })

  }).catch(err => {
     res.status(500).json({error: 'Error in server!'});
   })
}

export const latestBlog = (req, res) => {
  let { page } = req.body;
  let maxLimit = 5;
  Blog.find({ draft: false })
    .populate(
      "author",
      "personal_info.profile_img personal_info.name personal_info.username -_id"
    )
    .sort({ publishedAt: -1 })
    .select("blog_id title des content banner activity tags publishedAt -_id")
    .skip((page - 1) * maxLimit)
    .limit(maxLimit)
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((err) => {
      return res.status(404).json({ error: err.message });
    });
};

export const latestBlogCount = (req, res) => {
  Blog.countDocuments({ draft: false })
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.message });
    });
};

export const trendingBlogs = (req, res) => {
  Blog.find({ draft: false })
    .populate(
      "author",
      "personal_info.profile_img personal_info.name personal_info.username -_id"
    )
    .sort({
      "activity.total_reads": -1,
      "activity.total_likes": -1,
      publishedAt: -1,
    })
    .select("blog_id title publishedAt -_id")
    .limit(5)
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((err) => {
      return res.status(404).json({ error: err.message });
    });
};
export const searchBlog = (req, res) => {
  let { tag, page, query, author, limit, eliminate_blog } = req.body;
  let findQuery;
  if (tag) {
    findQuery = { tags: tag, draft: false, blog_id: { $ne: eliminate_blog } };
  } else if (query) {
    findQuery = { draft: false, title: new RegExp(query, "i") }; // to check the case
  } else if (author) {
    findQuery = { author, draft: false };
  }

  let maxLimit = limit ? limit : 2;
  Blog.find(findQuery)
    .populate(
      "author",
      "personal_info.profile_img personal_info.name personal_info.username -_id"
    )
    .sort({ publishedAt: -1 })
    .select("blog_id title des banner activity tags publishedAt -_id")
    .skip((page - 1) * maxLimit)
    .limit(maxLimit)
    .then((blogs) => {
      return res.status(200).json({ blogs });
    })
    .catch((err) => {
      return res.status(404).json({ error: err.message });
    });
};

export const searchBlogsCount = (req, res) => {
  let { tag, query, author } = req.body;
  let findQuery;
  if (tag) {
    findQuery = { tags: tag, draft: false };
  } else if (query) {
    findQuery = { draft: false, title: new RegExp(query, "i") }; // to check the case
  } else if (author) {
    findQuery = { author, draft: false };
  }

  Blog.countDocuments(findQuery)
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.message });
    });
};

export const searchUsers = (req, res) => {
  let { query } = req.body;
  User.find({ "personal_info.username": new RegExp(query, "i") })
    .limit(50)
    .select(
      "personal_info.name personal_info.username personal_info.profile_img -_id"
    )
    .then((users) => {
      return res.status(200).json({ users });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
};

export const getProfile = (req, res) => {
  let { name } = req.body;
  User.findOne({ "personal_info.name": name })
    .select("-personal_info.password -google_auth -updatedAt -blogs")
    .then((user) => {
      return res.status(200).json(user);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: err.message });
    });
};

export const updateProfileImg = (req, res) => {
  let { url } = req.body;
  User.findOneAndUpdate({ _id: req.user }, { "personal_info.profile_img": url }).then(() => {
    return res.status(200).json({profile_img:url})
  }).catch(err => {
    return res.status(500).json({ error: err.message });
  })
}

export const updateProfile = (req,res) => {
  let { username, bio, social_links } = req.body;

  let bioLimit = 150;
  
  if (!username || username.length < 3) {
    return res.status(403).json({error:"Username should be atleast 3 letters long."});
  }
  if (bio.length > bioLimit) { 
    return res.status(403).json({error:`Bio is too long! It should contain maximum ${bioLimit} characters.`});
  }
  let socialLinksArr = Object.keys(social_links);
  try {
    for (let i = 0; i < socialLinksArr.length; i++){
      if (social_links[socialLinksArr[i]].length) {
        let hostname = new URL(social_links[socialLinksArr[i]]).hostname;

        if (!hostname.includes(`${socialLinksArr[i]}.com`) && socialLinksArr[i] !== 'website') {
          return res.status(403).json({error:`${socialLinksArr[i]} link is invalid. You must enter a full links`})
        }

      } 
      
    }

  } catch (err){
    return res.status(500).json({ error: "You must provide full social links with http(s) included" });
  }

  let updateObj = {
    "personal_info.username": username,
    "personal_info.bio": bio,
    social_links
  }
  User.findOneAndUpdate({ _id: req.user }, updateObj, {
    runValidators: true
  }).then(() => {
    return res.status(200).json({ username });
  }).catch(err => {
    if (err.code == 11000) {
      return res.status(409).send("Username already exists.");
    }
    return res.status(500).json({ error: err.message });
  })
}


export const newNotification = (req, res) => {

  let user_id = req.user;

  Notification.exists({ notification_for: user_id, seen: false, user: { $ne: user_id } }).then(result => {
    if (result) {
         return res.status(200).json({new_notification_available:true})
    } else {
      return res.status(200).json({new_notification_available:false});
    }
  })
    .catch(err => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
})

}

export const createBlog = (req, res) => {
  let authorId = req.user;
  let { title, banner, des, tags, content, draft, id } = req.body;

  if (!title.length) {
    return res.status(401).json({ error: "Title is required" });
  }

  if (!draft) {
    if (!des.length || des.length > 200) {
      return res.status(401).json({ error: "Description is required" });
    }
    if (!banner.length) {
      return res.status(403).send("Image for Banner is required");
    }
    if (!content.blocks.length) {
      return res.status(403).json({ error: "Content is empty" });
    }
    if (!tags.length || tags.length > 10) {
      return res.status(406).json({ error: "Tags must be included." });
    }
  }

  tags = tags.map((tag) => tag.toLowerCase());
  let blog_id =
    id ||
    title
      .replace(/[^a-zA-Z0-9]/g, " ")
      .replace(/\s+/g, "-")
      .trim() + nanoid();
  if (id) {
    Blog.findOneAndUpdate(
      { blog_id },
      { title, des, banner, content, tags, draft: draft ? draft : false }
    )
      .then(() => {
        return res.status(200).json({ id: blog_id });
      })
      .catch((err) => {
        return res.status(500).json({ error: err.message });
      });
  } else {
    let blog = new Blog({
      title,
      des,
      banner,
      content,
      tags,
      author: authorId,
      blog_id,
      draft: Boolean(draft),
    });
    blog.save().then((blog) => {
      let incrementVal = draft ? 0 : 1;
      User.findOneAndUpdate(
        { _id: authorId },
        {
          $inc: { "account_info.total_posts": incrementVal },
          $push: { blogs: blog._id },
        }
      )
        .then((user) => {
          return res.status(200).json({ id: blog.blog_id });
        })
        .catch((err) => {
          return res
            .status(500)
            .json({ "Error in Saving the data to Database": err });
        })
        .catch((err) => {
          return res.status(500).json({ "Error while creating a post": err });
        });
    });
  }
};

export const getBlogs = (req, res) => {
  let { blog_id, draft, mode } = req.body;

  let incrementVal = mode !== "edit" ? 1 : 0;

  Blog.findOneAndUpdate(
    { blog_id },
    { $inc: { "activity.total_reads": incrementVal } }
  )
    .populate(
      "author",
      "personal_info.name personal_info.username personal_info.profile_img"
    )
    .select("title des content banner activity publishedAt blog_id tags")
    .then((blog) => {
      // If no params are provided then it will fetch all published posts
      User.findOneAndUpdate(
        { "personal_info.username": blog.author.personal_info.username },
        { $inc: { "account_info.total_reads": incrementVal } }
      ).catch((err) => {
        return res.status(500).json({ error: err.message });
      });
      if (blog.draft && !draft) {
        return res
          .status(403)
          .json({ error: "You can not view this post as it is a Draft Post!" });
      }
      return res.status(200).json({ blog });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
};

export const likeBlog = (req, res) => {
  let user_id = req.user;
  let { _id, isLiked } = req.body;
  let incrementVal = !isLiked ? 1 : -1;
  Blog.findOneAndUpdate(
    { _id },
    { $inc: { "activity.total_likes": incrementVal } }
  ).then((blog) => {
    if (!isLiked) {
      let like = new Notification({
        type: "like",
        blog: _id,
        notification_for: blog.author,
        user: user_id,
      });
      like.save().then((notification) => {
        return res.status(200).json({ liked_by_user: true });
      });
    } else {
      Notification.findOneAndDelete({ user: user_id, blog: _id, type: "like" })
        .then((data) => {
          return res.status(200).json({ liked_by_user: false });
        })
        .catch((err) => {
          return res.status(500).json(err);
        });
    }
  });
};

export const isLikedByUser = (req, res) => {
  let user_id = req.user;
  let { _id } = req.body;

  Notification.exists({ user: user_id, type: "like", blog: _id })
    .then((result) => {
      return res.status(200).json({ result });
    })
    .catch((err) => {
      return res.status(500).json({ error: err.message });
    });
};

export const addComment = (req, res) => {
  let user_id = req.user;
  let { _id, comment, blog_author,replying_to,notification_id } = req.body;
  if (!comment.length) {
    return res.status(404).json({ error: "The field cannot be empty." });
  }
  //creating a comment document

  let commentObj = {
    blog_id: _id,
    blog_author,
    comment,
    commented_by: user_id,
  };
  if (replying_to) { 
    commentObj.parent = replying_to; 
    commentObj.isReply = true;
  }
  new Comment(commentObj).save().then(async commentFile => {
    let { comment, commentedAt, children } = commentFile;
    Blog.findOneAndUpdate(
      { _id },
      {
        $push: { "comments": commentFile._id },
        $inc: {
          "activity.total_comments": 1,
          "activity.total_parent_comments": replying_to ?0 : 1,
        },
      }
    ).then((blog) => {
      console.log("New comment added");
    });
    let notificationObj = {
      type:replying_to ?"reply" :"comment",
      blog: _id,
      notification_for: blog_author,
      user: user_id,
      comment:commentFile._id
      
    }
    if (replying_to) {
  notificationObj.replied_on_comment = replying_to;
  await Comment.findOneAndUpdate({ _id: replying_to }, { $push: { children: commentFile._id } }).then(replyingToComment => {
    if (replyingToComment) {
      notificationObj.notification_for = replyingToComment.commented_by;
    } else {
      console.error("Error: Comment not found for replying_to ID:", replying_to);
    }
  }).catch(error => {
    console.error("Error fetching comment:", error);
  });

      if (notification_id) {
        Notification.findOneAndUpdate({ _id: notification_id }, { reply: commentFile._id }).then(notification => {
          console.log('notification updated')
        })
      }
    
    }

    new Notification(notificationObj).save().then(notification => {
      console.log(notification);
      return res.status(201).json({ comment, commentedAt, _id:commentFile._id, user_id, children , 'Notification sent' : notification});
    })
  })
};

export const getBlogComments = (req, res) => {
  let { blog_id, skip } = req.body;
  let maxLimit = 5;
  Comment.find({ blog_id, isReply: false }).populate("commented_by", "personal_info.username personal_info.name personal_info.profile_img").skip(skip).limit(maxLimit).sort({
    'commentedAt':-1
  })
    .then(comment => {
      return res.status(200).json(comment);
    }).catch(err => {
      console.log(err.message);
      return res.status(500).json({error:err.message})
  })
}


export const getReply = (req, res) => {
  
  let { _id, skip } = req.body;
  let maxLimit = 5;
  Comment.findOne({ _id }).populate({
    path: "children",
    options: {
      limit: maxLimit,
      skip: skip,
      sort:{'commentedAt': -1}
    },
    populate: {
      path: "commented_by",
      select:"personal_info.profile_img personal_info.name personal_info.username"
    },
    select:"-blog_id -updatedAt"
    
  })
    .select("children").then(doc => {
    return res.status(200).json({replies:doc.children})
    }).catch(err => {
    return res.status(500).json(err)
  })
}

const deleteComments = (_id) => {
  Comment.findOneAndDelete({ _id }).then(comment => {
    if (comment.parent) {
      Comment.findOneAndUpdate({ _id: comment.parent }, { $pull: { children: _id } }).then(data => {
        console.log('comment deleted')
      }).catch(err => console.log(err));
    }
    Notification.findOneAndDelete({ comment: _id }).then(notification => console.log("comment notification deleted"))
    Notification.findOneAndUpdate({ reply: _id },{$unset: {reply:1}}).then(notification => {
      console.log("reply notification deleted")
    })
    Blog.findOneAndUpdate({ _id: comment.blog_id }, { $pull: { comment: _id }, $inc: { "activity.total_comments": -1 }, "activity.total_parent_comments": comment.parent ? 0 : -1 }).then(blog => {
      if (comment.children.length) {
        comment.children.map(replies => {
         deleteComments(replies)
       })
   }
})
  }).catch(err => {
    console.log(err.message);
  })
}

export const deleteComment = (req, res) => {
  
  let user_id = req.user;
  let { _id } = req.body;
  Comment.findOne({ _id }).then(comment => {
    if (user_id == comment.commented_by || user_id == comment.blog_author) {
       
      deleteComments(_id)
      return res.status(200).json({msg:"Successfully deleted the comment."});
    } else {
      return res.status(403).json({error:"You are not able to delete this comment"})
    }
  })

}

export const Notifications = (req, res) => {
  let user_id = req.user;
  let { page, filter, deletedCount } = req.body;
     
  let maxLimit = 10;

  //notification which is equal to the user id

  let findQuery = { notification_for: user_id, user: { $ne: user_id } };
  
  let skipDocs = (page - 1) * maxLimit;

  if (filter != "all") { 
    findQuery.type = filter;

  }
  if (deletedCount) {
    skipDocs -= deletedCount;
  }

  Notification.find(findQuery).skip(skipDocs).limit(maxLimit).populate("blog", "title blog_id ").populate("user", "personal_info.name personal_info.username personal_info.profile_img").populate("comment", "comment").populate("replied_on_comment", "comment").populate("reply", "comment").sort({ createdAt: -1 }).select("createdAt type seen reply").then(notifications => {
    Notification.updateMany(findQuery, { seen: true })
      .skip(skipDocs)
      .limit(maxLimit).then(() => {
        console.log('notification seen');
      })
    return res.status(200).json({ notifications });
  }).catch(err => {
    console.log(err.message);
    return res.status(500).send("Internal Server Error");
  })
  

}

export const notificationCount = (req, res) => {
  
  let user_id = req.user;
   
  let { filter } = req.body;
  let findQuery = { notification_for: user_id, user: { $ne: user_id } }
  if (filter !== 'all') {
    findQuery.type = filter;

  }
  Notification.countDocuments(findQuery)
    .then((count) => {
      return res.status(200).json({ totalDocs: count });
    }).catch((error) => {
      console.log('Error in getting notification count', error);
      return res.status(500).json({error:err.message});
    });
}

export const userWrittenBlogs = (req,res) => {
  let user_id = req.user;
  let { page, draft, query, deletedCount } = req.body;
  
  let maxLimit = 5;
  let skipDocs = (page - 1) * maxLimit;

  if (deletedCount) {
    skipDocs -= deletedCount
  }
  Blog.find({ author: user_id, draft, title: new RegExp(query, 'i') }).skip(skipDocs).limit(maxLimit).sort({ publishedAt: -1 }).select("title banner publishedAt blog_id activity des draft -_id").then(blogs => {
    return res.status(200).json({blogs})
  }).catch(err => {
    return res.status(500).json({error:err.message})
  })

}


export const userWrittenCount = (req,res) => {
  let user_id = req.user;
  let { draft, query } = req.body;
  Blog.countDocuments({ author: user_id, draft, title: new RegExp(query, 'i') }).then(count => {
    return res.status(200).json({totalDocs : count})
  }).catch(err => {
    console.log(err.message);
    return res.status(500).json({error:err.message})
  })
}


export const deleteBlog = (req, res) => {
  let user_id = req.user;
  let { blog_id } = req.body;

  Blog.findOneAndDelete({ blog_id }).then(blog => {
    Notification.deleteMany({ blog: blog._id }).then(data => {
      console.log('notification deleted')
    })
    Comment.deleteMany({ blog_id: blog._id }).then(data => {
      console.log('comments deleted');
    });

    User.findByIdAndUpdate({ _id: user_id }, { $pull: { blog: blog._id }, $inc: { 'account_info.total_posts': -1 } }).then(user => {
      console.log('Blog deleted')
      return res.status(200).json({status:'Done'})
    }).catch(err => {
      return res.status(500).json({error:err.message})
    })

  })
}

export const forgotPassword =async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ "personal_info.email": email });
  if (!user) {
    return res.status(404).json({ status: "Email does not exist!" });
  }
  // Hash the new password
  const hashedPassword = await bcrypt.hash(password, 10);
  // Update user's password in the database
  user.personal_info.password = hashedPassword;
  // await user.save();

  const token = generateToken(user);

  res.json({ token });

  // const token =jwt.sign({id:user._id},ACCESS_KEY,{expiresIn:'1h'});
}


export const resetPassword = async (req, res) => {
  const { id, token } = req.params;
  console.log(req.params);
}