import mongoose, { Schema } from "mongoose";

let profile_collection = [
  "Garfield",
  "Tinkerbell",
  "Annie",
  "Loki",
  "Cleo",
  "Angel",
  "Bob",
  "Mia",
  "Coco",
  "Gracie",
  "Bear",
  "Bella",
  "Abby",
  "Harley",
  "Cali",
  "Leo",
  "Luna",
  "Jack",
  "Felix",
  "Kiki",
];

const UserSchema = new mongoose.Schema(
  {
    //schema for the [personal _info] collection in MongoDB
    personal_info: {
      name: {
        type: String,
        lowercase: true,
        required: true,
        minlength: [3, "Name must be atleast 3 characters"],
      },
      email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
      },
      password: String,
      username: {
        type: String,
        required: true,
        maxLength: [50, "Username should have atleast 3 characters"],
        unique: true,
      },
      bio: {
        type: String,
        maxLength: [200, "Bio should not be more than 200"],
        default:''
      },
      profile_img: {
        type: String,
        default: () => {
          return `https://api.dicebear.com/8.x/adventurer/svg?seed=${
            profile_collection[
              Math.floor(Math.random() * profile_collection.length)
            ]
          }
`;
        },
      },
    },
    social_links: {
      youtube: {
        type: String,
        default: "",
      },
      instagram: {
        type: String,
        default: "",
      },
      facebook: {
        type: String,
        default: "",
      },
      twitter: {
        type: String,
        default: "",
      },
      github: {
        type: String,
        default: "",
      },
      website: {
        type: String,
        default: "",
      },
    },
    account_info: {
      total_posts: {
        type: Number,
        default: 0,
      },
      total_reads: {
        type: Number,
        default: 0,
      },
    },
    google_auth: {
      type: Boolean,
      default: false,
    },
    blogs: {
      type: [Schema.Types.ObjectId],
      ref: "blogs",
      default: [],
    },
  },
  {
    timestamps: {
      createdAt: "joinedAt",
    },
  }
);

const User = mongoose.model("users", UserSchema);
export default User;
