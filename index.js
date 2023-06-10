const express = require("express");
const app = express();
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 4000;

// middleware
app.use(cors());
app.use(express.json());

// mongodb connection
const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const classes = client.db("spc").collection("classes");
const users = client.db("spc").collection("users");
const selectedClasses = client.db("spc").collection("selectedClasses");

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    // classes related apis
    app.get("/classes", async (req, res) => {
      const result = await classes.find().toArray();
      res.send(result);
    });

    // users related apis
    app.post("/selected-classes", async (req, res) => {
      const classes = req.body;
      const result = await selectedClasses.insertOne(classes);
      res.send(result);
    });
    app.get("/selected-classes", async (req, res) => {
      const email = req.query.email;
      const result = await selectedClasses.find({ email }).toArray();
      res.send(result);
    });
    app.post("/user", async (req, res) => {
      const user = req.body;
      console.log(user);
      const existingUser = await users.findOne({ email: user?.email });

      if (existingUser) {
        return res.send({ message: "user already exist!" });
      }

      const result = await users.insertOne(user);

      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("server is live");
});

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
