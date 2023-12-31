const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_KEY);
const port = process.env.PORT || 4000;

// middleware
app.use(cors());
app.use(express.json());
// TODO: JWT Apply
// jwt verify function
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.stutus(401).send({ error: true, message: "Access Denai" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_KEY, (err, decoded) => {
    if (err) {
      return res.stutus(401).send({ error: true, message: "Access Denai" });
    }
    req.decoded = decoded;
    next();
  });
};

// Mongo DB

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ap8uoiz.mongodb.net/?retryWrites=true&w=majority`;

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
    // TODO: Start DB

    const usersCollection = client.db("fluencyDB").collection("users");
    const AddClassCollection = client.db("fluencyDB").collection("addClass");
    const SelectedCollection = client
      .db("fluencyDB")
      .collection("selectedClass");
    const paymentCollection = client.db("fluencyDB").collection("payment");

    // jwt api
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_KEY, {
        expiresIn: "1h",
      });
      res.send({ token });
    });
    // users api
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users",verifyJWT, async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;

      const { role } = req.body;

      // Define your condition based on the role
      let updatedRole;
      if (role === "admin") {
        updatedRole = "admin";
      } else if (role === "instructor") {
        updatedRole = "instructor";
      } else {
        return res.stutus(400).json({ error: "Invalid role" });
      }

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: updatedRole,
        },
      };

      try {
        const result = await usersCollection.updateOne(filter, updateDoc);
        res.json(result);
      } catch (error) {
        res.stutus(500).json({ error: "Failed to update user role" });
      }
    });

    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });
    // instructor api
    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ instructor: false });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { instructor: user?.role === "instructor" };
      res.send(result);
    });
    // All Classes API
    app.post("/addclass", async (req, res) => {
      const addClass = req.body;
      const result = await AddClassCollection.insertOne(addClass);
      res.send(result);
    });
    // my class
    app.get("/myclass/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await AddClassCollection.find(query).toArray();
      res.send(result);
    });
    app.delete("/myclass/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await AddClassCollection.deleteOne(query);
      res.send(result);
    });
    // all class
    app.get("/allclass", async (req, res) => {
      const result = await AddClassCollection.find().toArray();
      res.send(result);
    });
    app.get("/allclass/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await AddClassCollection.find(query).toArray();
      res.send(result);
    });
    // instructors
    app.get("/instructors", async (req, res) => {
      const quary = { role: "instructor" };
      const result = await usersCollection.find(quary).toArray();
      res.send(result);
    });

    //  approved
    app.patch("/allclass/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const { feedback, stutus } = req.body;

      const updateDoc = { $set: { feedback } };
      if (stutus) {
        updateDoc.$set.stutus = stutus;
      }
      const result = await AddClassCollection.updateOne(query, updateDoc);
      res.send(result);
    });
    //  select class
    app.post("/select", verifyJWT, async (req, res) => {
      const selectedClass = req.body;

      const existingClass = await SelectedCollection.findOne(selectedClass);
      if (existingClass) {
        res.status(400).send("Selected class already exists");
        return;
      }
      const result = await SelectedCollection.insertOne(selectedClass);
      res.send(result);
    });

    app.get("/select", verifyJWT, async (req, res) => {
      const result = await SelectedCollection.find().toArray();
      res.send(result);
    });

    app.get("/select/:user", verifyJWT, async (req, res) => {
      const user = req.params.user;
      const query = { user: user };
      const result = await SelectedCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/selected/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await SelectedCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/select/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };
      const result = await SelectedCollection.deleteOne(query);
      res.send(result);
    });

    // create payment intent
    app.post("/create-payment-intent",verifyJWT, async (req, res) => {
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

    // payment related api

    app.patch("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;

      // Insert payment document only if it doesn't exist
      const query = { className: payment.className };
      const existingPayment = await paymentCollection.findOne(query);
    console.log(existingPayment)
      if (!existingPayment) {
        const insertedResult = await paymentCollection.insertOne(payment);

        // Update the class document in paymentCollection
        const filter = { className: payment.className };
        const updateDoc = {
          $inc: {
            availableSeat: -1,
            enrolledStuNum: 1,
          },
        };

        const updatePaymentResult = await paymentCollection.updateOne(
          filter,
          updateDoc,
          { upsert: false }
        );

        // Update the class document in classCollection
        const updateClassResult = await AddClassCollection.updateOne(
          filter,
          updateDoc,
          { upsert: false }
        );

        res.send({ insertedResult, updatePaymentResult, updateClassResult });
      } else {
        // delete from selected classes //
        const deletedSelected = await SelectedCollection.deleteOne(query);

        res.send({ message: "Payment document already exists" });
      }
    });

    // pyment history 
    app.get("/payment/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });


    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Fluency is running");
});

app.listen(port, () => {
  console.log(`Fluency Server is running on port ${port}`);
});
