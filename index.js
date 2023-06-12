const express = require("express");
const app = express();
const cors = require("cors");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_SK);
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
      const email = req.query.email;
      if (email) {
        const emailFilter = await classes
          .find({ instructorEmail: email })
          .toArray();
        if (emailFilter.length == 0) {
          return res.send({ message: "invalid email address" });
        }
        return res.send(emailFilter);
      }
      res.send(result);
    });
    app.put("/classes/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const result = await classes.updateOne(
        { _id: new ObjectId(id) },
        { $set: data },
        { upsert: true }
      );
      res.send(result);
    });
    app.post("/classes", async (req, res) => {
      const classData = req.body;
      const result = await classes.insertOne(classData);
      res.send(result);
    });

    // selected class related apis
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
    app.delete("/selected-classes", async (req, res) => {
      const id = req.query.id;
      const result = await selectedClasses.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    //user related apis
    app.post("/user", async (req, res) => {
      const user = req.body;

      const existingUser = await users.findOne({ email: user?.email });

      if (existingUser) {
        return res.send({ message: "user already exist!" });
      }
      const result = await users.insertOne(user);
      res.send(result);
    });
    app.get("/user", async (req, res) => {
      const userEmail = req.query.email;

      if (!userEmail) {
        const result = await users.find().toArray();
        return res.send(result);
      }

      const result = await users.findOne({ email: userEmail });
      if (result == null) {
        return res.send({ message: "user not found!" });
      }
      res.send(result);
    });
    app.put("/user", async (req, res) => {
      const id = req.query.id;
      const user = req.body;
      const result = await users.updateOne(
        { _id: new ObjectId(id) },
        { $set: user },
        { upsert: true }
      );
      res.send(result);
    });

    // create payment intent
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

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
