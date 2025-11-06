const mongoose = require("mongoose");
const User = require("./models/user"); // ✅ make sure the path is correct

mongoose
  .connect("mongodb+srv://Marshall:hayatudeen@cluster0.74zap7p.mongodb.net/", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log("✅ Connected to MongoDB");

    const users = [
      {
        name: "Lukman Bello",
        email: "lukman@example.com",
        password: "lukman123",
        image: "https://randomuser.me/api/portraits/men/10.jpg",
      },
      {
        name: "Anas Ibrahim",
        email: "anas@example.com",
        password: "anas123",
        image: "https://randomuser.me/api/portraits/men/12.jpg",
      },
      {
        name: "Zainab Huwaib",
        email: "zainab@example.com",
        password: "zainab123",
        image: "https://randomuser.me/api/portraits/women/14.jpg",
      },
      {
        name: "Benji Adams",
        email: "benji@example.com",
        password: "benji123",
        image: "https://randomuser.me/api/portraits/men/18.jpg",
      },
      {
        name: "Bilal Musa",
        email: "bilal@example.com",
        password: "bilal123",
        image: "https://randomuser.me/api/portraits/men/22.jpg",
      },
    ];

    // Optional: clear old users to avoid duplicates
    await User.deleteMany({});
    console.log("🧹 Old users removed");

    await User.insertMany(users);
    console.log("✅ 5 Users inserted successfully!");

    mongoose.connection.close();
  })
  .catch((err) => {
    console.error("❌ Error inserting users:", err);
    mongoose.connection.close();
  });
