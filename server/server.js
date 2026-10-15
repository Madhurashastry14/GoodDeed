const express = require("express");
const app = express();
const PORT = 3000;
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to GoodDeed API!");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
