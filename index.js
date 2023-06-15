const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 4000;

// middleware
app.use(cors());
app.use(express.json());

// jwt verify function
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: "Access Denai" });
  }
  // bearer token
  const token = authorization.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: "Access Denai" });
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
    await client.connect();
    // TODO: Start DB

    const usersCollection = client.db("fluencyDB").collection("users");
    const AddClassCollection = client.db("fluencyDB").collection("addClass");

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

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      // if (req.decoded.email !== email) {
      //     res.send({ admin: false })
      // }
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);
  }
  )

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
        return res.status(400).json({ error: "Invalid role" });
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
        res.status(500).json({ error: "Failed to update user role" });
      }
    });
    // Added Classes API
     app.get("/addedClass", async (req, res) => {
      const result = await AddClassCollection.find().toArray();
      res.send(result);
    });
     app.get("/addedClass/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await AddClassCollection.find(query).toArray();
      res.send(result);
    });
     app.post("/addedClass", async (req, res) => {
      const addClass = req.body;
      const result = await AddClassCollection.insertOne(addClass);
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

app.get("/", (req, res) => {
  res.send("Fluency is running");
});

app.listen(port, () => {
  console.log(`Fluency Server is running on port ${port}`);
});
