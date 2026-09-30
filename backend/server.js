require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const morgan = require("morgan");
const app = express();
const PORT = process.env.PORT || 3000;
const cors = require('cors');
mongoose.connect(process.env.MONGO_URL);

const db = mongoose.connection;
db.on("error", (error) => console.error(error));
db.once("open", () => console.log("Connected to Database"));

app.use(cors())
app.use(morgan("dev"));
app.use(express.json());

app.use("/api/users", require("./routes/users"));
app.use("/api/recipes", require("./routes/recipes"));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
