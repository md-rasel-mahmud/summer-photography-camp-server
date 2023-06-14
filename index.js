const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_SK);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 4000;

// middleware
app.use(cors());
app.use(express.json());

//verify jwt
const verifyJwt = (req, res, next) => {
  const authorization = req.headers.authorization;
  // console.log(authorization);
  if (!authorization) {
    return res.status(401).send({ error: true, message: "unauthorize token" });
  }

  // token verify
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send({ error: true, message: "Forbidden Access" });
    }
    // console.log(decoded);
    req.decoded = decoded;
    next();
  });
};

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

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const classes = client.db("spc").collection("classes");
    const users = client.db("spc").collection("users");
    const selectedClasses = client.db("spc").collection("selectedClasses");
    const enrolledClass = client.db("spc").collection("enrolledClass");

    // generate json web token
    app.post("/jwt", (req, res) => {
      const email = req.body;

      const token = jwt.sign(email, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      // console.log(token);
      res.send({ token });
    });

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
    app.patch("/classes/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updateDoc = { $inc: { availableSeats: -1, enrolledStudents: 1 } };
      const result = await classes.updateOne(query, updateDoc);
      res.send(result);
    });

    // selected class related apis
    app.post("/selected-classes",verifyJwt, async (req, res) => {
      const classes = req.body;
      const result = await selectedClasses.insertOne(classes);
      res.send(result);
    });
    app.get("/selected-classes", verifyJwt, async (req, res) => {
      const email = req.query.email;
      const result = await selectedClasses.find({ email }).toArray();
      res.send(result);
    });
    app.delete("/selected-classes", verifyJwt, async (req, res) => {
      const id = req.query.id;
      const result = await selectedClasses.deleteOne({
        _id: new ObjectId(id),
      });
      return res.send(result);
    });

    //enrolled class
    app.post("/enrolled-class", verifyJwt, async (req, res) => {
      const enrollClass = req.body;
      enrollClass.enrolledAt = new Date();
      const result = await enrolledClass.insertOne(enrollClass);
      res.send(result);
    });
    app.get("/enrolled-classes",verifyJwt, async (req, res) => {
      const email = req.query.email;
      const result = await enrolledClass
        .find({ email })
        .sort({ enrolledAt: -1 })
        .toArray();
      res.send(result);
    });

    //user related apis
    app.post("/user",verifyJwt, async (req, res) => {
      const user = req.body;

      const existingUser = await users.findOne({ email: user?.email });

      if (existingUser) {
        return res.send({ message: "user already exist!" });
      }
      const result = await users.insertOne(user);
      res.send(result);
    });
    app.get("/user", verifyJwt, async (req, res) => {
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
    app.put("/user",verifyJwt, async (req, res) => {
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
    app.post("/create-payment-intent", verifyJwt, async (req, res) => {
      const { price } = req.body;
      const amount = parseFloat(price) * 100;

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        automatic_payment_methods: {
          enabled: true,
        },
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
