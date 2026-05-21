const dns = require("node:dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const { createRemoteJWKSet, jwtVerify } = require("jose-cjs");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(
  cors({
    origin: `${process.env.CLIENT_URL}`,
    credentials: true,
  })
);
app.use(express.json());

const uri = process.env.MONGOURI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const JWKS = createRemoteJWKSet(
  new URL(`${process.env.CLIENT_URL}/api/auth/jwks`)
)

const verifyToken = async(req, res, next) => {
      const authHeader = req?.headers.authorization
      if(!authHeader){
        return res.status(401).json({
          message: "Unauthorized"
        })
      }
      const token = authHeader.split(" ")[1]

      if(!token){
        return res.status(401).json({
          message: "Unauthorized"
        })
      }

      try{
        const {payload} =await jwtVerify(token,JWKS)
      console.log(payload)
      }catch(error){
        return res.status(403).json({
          message:"forbidden"
        })
      }
      next()
    }

async function run() {
  try {
    // await client.connect();

    const db = client.db("sport-nest");
    const facilityCollection = db.collection("facilities");
    const bookingCollection = db.collection("bookings");

    // POST facility
    app.post("/facilities", async (req, res) => {
      const facility = req.body;

      const result = await facilityCollection.insertOne(facility);

      res.send(result);
    });


    app.get("/facilities/:id", verifyToken , async (req, res) => {
      try {
        const id = req.params.id;

        const query = { _id: new ObjectId(id) };

        const result = await facilityCollection.findOne(query);

        if (!result) {
          return res.status(404).json({ message: "Facility not found" });
        }

        res.json(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });


    // UPDATE facility
    app.patch("/facilities/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const updatedFacility = req.body;

        const query = { _id: new ObjectId(id) };

        const updateDoc = {
          $set: updatedFacility,
        };

        const result = await facilityCollection.updateOne(
          query,
          updateDoc
        );

        res.send(result);

      } catch (error) {
        res.status(500).send({
          message: error.message,
        });
      }
    });

    // DELETE facility
    app.delete("/facilities/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const email = req.query.email;

        const query = {
          _id: new ObjectId(id),
          owner_email: email,
        };

        const result = await facilityCollection.deleteOne(query);

        res.send(result);
      } catch (error) {
        res.status(500).send({ message: error.message });
      }
    });


    //bookings
    app.post("/bookings", verifyToken, async (req, res) => {
      const booking = req.body;

      const result = await bookingCollection.insertOne(booking);

      res.send(result);
    });

    app.get("/bookings", async (req, res) => {
      const result = await bookingCollection.find().toArray();
      res.send(result);
    });


    app.get("/bookings/:email",verifyToken, async (req, res) => {
      try {

        const email = req.params.email;

        const query = {
          user_email: email,
        };

        const result = await bookingCollection
          .find(query)
          .toArray();

        res.send(result);

      } catch (error) {

        res.status(500).send({
          message: error.message,
        });

      }
    });

app.get("/facilities", async (req, res) => {
  try {
    const { email, search, sport } = req.query;

    let query = {};

    // Filter by owner email
    if (email) {
      query.owner_email = email;
    }

    // Search by facility name
    if (search) {
      query.name = {
        $regex: search,
        $options: "i",
      };
    }

    // Filter by sport type
    if (sport) {
      query.facility_type = {
        $in: [sport],
      };
    }

    const result = await facilityCollection
      .find(query)
      .toArray();

    res.send(result);
  } catch (error) {
    console.log(error);

    res.status(500).send({
      success: false,
      message: error.message,
    });
  }
});

    app.delete("/bookings/:id",verifyToken, async (req, res) => {
      try {
        const id = req.params.id;

        const query = {
          _id: new ObjectId(id),
        };

        const result = await bookingCollection.deleteOne(query);

        res.send(result);

      } catch (error) {
        res.status(500).send({
          message: error.message,
        });
      }
    });

    // await client.db("admin").command({ ping: 1 });

    console.log("MongoDB connected successfully");
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Sport Nest Server Running");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});