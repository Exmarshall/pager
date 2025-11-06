const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const cors = require("cors");
const multer = require("multer");
const jwt = require("jsonwebtoken");

const app = express();
const port = 8000;

// ✅ CORS MUST ALLOW YOUR EXPO IP
app.use(
  cors({
    origin: "*",
    methods: "GET,POST,PUT,DELETE",
  })
);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(passport.initialize());

// ✅ Serve uploaded images
app.use("/files", express.static("files"));

mongoose
  .connect("mongodb+srv://Marshall:hayatudeen@cluster0.74zap7p.mongodb.net/", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.log("❌ MongoDB Error:", err));

app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server running at http://10.55.151.1:${port}`);
});

const User = require("./models/user");
const Message = require("./models/message");

// ✅ REGISTER USER
app.post("/register", async (req, res) => {
  const { name, email, password, image } = req.body;

  try {
    const newUser = new User({ name, email, password, image });
    await newUser.save();
    res.status(200).json({ message: "User registered successfully" });
  } catch (err) {
    console.log("Error registering user", err);
    res.status(500).json({ message: "Error registering user" });
  }
});

// ✅ CREATE JWT TOKEN
const createToken = (userId) => {
  return jwt.sign({ userId }, "Q$r2K6W8n!jCW%Zk", { expiresIn: "1h" });
};

// ✅ LOGIN USER
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(404).json({ message: "Email and password required" });

  User.findOne({ email })
    .then((user) => {
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.password !== password)
        return res.status(404).json({ message: "Invalid Password!" });

      const token = createToken(user._id);
      res.status(200).json({ token });
    })
    .catch((error) => {
      console.log("Login error:", error);
      res.status(500).json({ message: "Internal Server Error" });
    });
});

// ✅ GET ALL USERS EXCEPT LOGGED USER
app.get("/users/:userId", (req, res) => {
  User.find({ _id: { $ne: req.params.userId } })
    .then((users) => res.status(200).json(users))
    .catch((err) =>
      res.status(500).json({ message: "Error retrieving users" })
    );
});

// ✅ SEND FRIEND REQUEST
app.post("/friend-request", async (req, res) => {
  const { currentUserId, selectedUserId } = req.body;

  try {
    await User.findByIdAndUpdate(selectedUserId, {
      $push: { freindRequests: currentUserId },
    });

    await User.findByIdAndUpdate(currentUserId, {
      $push: { sentFriendRequests: selectedUserId },
    });

    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(500);
  }
});

// ✅ GET RECEIVED FRIEND REQUESTS
app.get("/friend-request/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate("freindRequests", "name email image")
      .lean();

    res.json(user.freindRequests);
  } catch (error) {
    res.status(500).json({ message: "Error fetching friend requests" });
  }
});

// ✅ ACCEPT FRIEND REQUEST
app.post("/friend-request/accept", async (req, res) => {
  const { senderId, recepientId } = req.body;

  try {
    const sender = await User.findById(senderId);
    const recepient = await User.findById(recepientId);

    sender.friends.push(recepientId);
    recepient.friends.push(senderId);

    recepient.freindRequests = recepient.freindRequests.filter(
      (id) => id.toString() !== senderId.toString()
    );

    sender.sentFriendRequests = sender.sentFriendRequests.filter(
      (id) => id.toString() !== recepientId.toString()
    );

    await sender.save();
    await recepient.save();

    res.status(200).json({ message: "Friend Request accepted" });
  } catch (error) {
    res.status(500).json({ message: "Error accepting friend request" });
  }
});

// ✅ GET FRIENDS LIST
app.get("/accepted-friends/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate(
      "friends",
      "name email image"
    );
    res.json(user.friends);
  } catch (error) {
    res.status(500).json({ error: "Error fetching friends" });
  }
});

// ✅ MULTER UPLOAD (image messages)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "files/"),
  filename: (req, file, cb) =>
    cb(
      null,
      Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        "-" +
        file.originalname
    ),
});

const upload = multer({ storage });

// ✅ SEND MESSAGE (text/image)
app.post("/messages", upload.single("imageFile"), async (req, res) => {
  try {
    const { senderId, recepientId, messageType, messageText } = req.body;

    const newMessage = new Message({
      senderId,
      recepientId,
      messageType,
      message: messageText,
      timeStamp: new Date(),
      imageUrl: messageType === "image" ? req.file.path : null,
    });

    await newMessage.save();
    res.status(200).json({ message: "Message sent" });
  } catch (error) {
    res.status(500).json({ error: "Message sending failed" });
  }
});

// ✅ GET CHAT MESSAGES
app.get("/messages/:senderId/:recepientId", async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: req.params.senderId, recepientId: req.params.recepientId },
        { senderId: req.params.recepientId, recepientId: req.params.senderId },
      ],
    }).populate("senderId", "_id name");

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Error fetching messages" });
  }
});

// ✅ DELETE MESSAGES
app.post("/deleteMessages", async (req, res) => {
  try {
    const { messages } = req.body;
    await Message.deleteMany({ _id: { $in: messages } });
    res.json({ message: "Messages deleted" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting messages" });
  }
});

// ✅ GET SENT REQUESTS
app.get("/friend-requests/sent/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate("sentFriendRequests", "name email image")
      .lean();

    res.json(user.sentFriendRequests);
  } catch (error) {
    res.status(500).json({ error: "Error fetching sent requests" });
  }
});

// ✅ GET FRIEND IDS
app.get("/friends/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate("friends");
    res.json(user.friends.map((f) => f._id));
  } catch (error) {
    res.status(500).json({ message: "Error fetching friends" });
  }
});
