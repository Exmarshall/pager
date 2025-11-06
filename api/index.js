require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const passport = require("passport");

const app = express();

// ✅ Allow expo + mobile traffic
app.use(cors({ origin: "*", methods: "GET,POST" }));
app.use(bodyParser.json());
app.use(passport.initialize());

// ✅ Serve uploaded images
app.use("/files", express.static("files"));

const PORT = process.env.PORT || 8000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;

// ✅ Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

const User = require("./models/user");
const Message = require("./models/message");

// ✅ Registration
app.post("/register", async (req, res) => {
  try {
    const { name, email, password, image } = req.body;

    const newUser = new User({ name, email, password, image });
    await newUser.save();

    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Registration failed" });
  }
});

// ✅ Token Generator
const createToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
};

// ✅ Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.password !== password)
      return res.status(400).json({ message: "Invalid password" });

    const token = createToken(user._id);
    res.json({ token });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Login failed" });
  }
});

// ✅ Get all users except self
app.get("/users/:userId", async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.params.userId } });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error retrieving users" });
  }
});

// ✅ Send friend request
app.post("/friend-request", async (req, res) => {
  try {
    const { currentUserId, selectedUserId } = req.body;

    await User.findByIdAndUpdate(selectedUserId, {
      $push: { freindRequests: currentUserId },
    });

    await User.findByIdAndUpdate(currentUserId, {
      $push: { sentFriendRequests: selectedUserId },
    });

    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(500);
  }
});

// ✅ Get received friend requests
app.get("/friend-request/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate(
      "freindRequests",
      "name email image"
    );

    res.json(user.freindRequests);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Accept friend request
app.post("/friend-request/accept", async (req, res) => {
  try {
    const { senderId, recepientId } = req.body;

    const sender = await User.findById(senderId);
    const receiver = await User.findById(recepientId);

    sender.friends.push(recepientId);
    receiver.friends.push(senderId);

    receiver.freindRequests = receiver.freindRequests.filter(
      (id) => id.toString() !== senderId.toString()
    );

    sender.sentFriendRequests = sender.sentFriendRequests.filter(
      (id) => id.toString() !== recepientId.toString()
    );

    await sender.save();
    await receiver.save();

    res.json({ message: "Friend request accepted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Get accepted friends
app.get("/accepted-friends/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate(
      "friends",
      "name email image"
    );

    res.json(user.friends);
  } catch (err) {
    res.status(500).json({ message: "Error loading friends" });
  }
});

// ✅ File Upload (Messages)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "files/"),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// ✅ Send message
app.post("/messages", upload.single("imageFile"), async (req, res) => {
  try {
    const { senderId, recepientId, messageType, messageText } = req.body;

    const newMessage = new Message({
      senderId,
      recepientId,
      messageType,
      message: messageText,
      timestamp: new Date(),
      imageUrl: messageType === "image" ? req.file.path : null,
    });

    await newMessage.save();
    res.json({ message: "Message sent" });
  } catch (err) {
    res.status(500).json({ message: "Error sending message" });
  }
});

// ✅ Get messages between two users
app.get("/messages/:senderId/:recepientId", async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.params.senderId, recepientId: req.params.recepientId },
        { senderId: req.params.recepientId, recepientId: req.params.senderId },
      ],
    }).populate("senderId", "_id name");

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Error fetching messages" });
  }
});

// ✅ Delete messages
app.post("/deleteMessages", async (req, res) => {
  try {
    await Message.deleteMany({ _id: { $in: req.body.messages } });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting" });
  }
});

// ✅ Get user profile
app.get("/user/:userId", async (req, res) => {
  const user = await User.findById(req.params.userId);
  res.json(user);
});
