require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')
const morgan = require('morgan')

const port = process.env.PORT || 9000
const app = express()
// middleware
const corsOptions = {
  origin: ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))

app.use(express.json())
app.use(cookieParser())
app.use(morgan('dev'))

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token

  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.w0iow.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})
async function run() {
  try {
    const db = client.db('plantNet-session');
    const userCollection = db.collection('users');
    const plantsCollection = db.collection('plants');
    const ordersCollection = db.collection('orders');

    // Generate jwt token
    app.post('/jwt', async (req, res) => {
      const email = req.body
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '365d',
      })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
        })
        .send({ success: true })
    })
    // Logout
    app.get('/logout', async (req, res) => {
      try {
        res
          .clearCookie('token', {
            maxAge: 0,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
      } catch (err) {
        res.status(500).send(err)
      }
    })

    // user related api
    // save or update a user in bd
    app.post('/users/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      console.log(user, email);
      const query = { email: email }
      const isExist = await userCollection.findOne(query)
      if (isExist) {
        return res.send(isExist)
      }
      const result = await userCollection.insertOne({
        ...user,
        role: 'customer',
        timestamp: Date.now()
      });
      res.send(result)
    })

    // manage user status and role
    app.patch('/users/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await userCollection.findOne(query);
      if (!user || user?.status === 'Requested') {
        return res.status(400).send('You have already requested, wait for some time.')
      }
      const updateDoc = {
        $set: {
          status: 'Requested',
        }
      }
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result)
    })

    // get user role
    app.get('/users/role/:email', async (req, res) => {
      const email = req.params.email;
      // const query = {email: email}
      const result = await userCollection.findOne({email});
      res.send({role: result?.role});
    })

    // plant related api
    app.post('/plants', verifyToken, async (req, res) => {
      const plant = req.body
      const result = await plantsCollection.insertOne(plant);
      res.send(result);
    })

    app.get('/plants', async (req, res) => {
      const result = await plantsCollection.find().toArray();
      res.send(result);
    })

    app.get('/plants/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await plantsCollection.findOne(query);
      res.send(result);
    })
    // Save order data in db
    app.post('/order', verifyToken, async (req, res) => {
      const orderInfo = req.body
      console.log(orderInfo)
      const result = await ordersCollection.insertOne(orderInfo);
      res.send(result);
    })

    // get all orders for specific customer
    app.get('/customer-orders/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { 'customer.email': email };
      const result = await ordersCollection.aggregate([
        {
          $match: query, //matching with query
        },
        {
          $addFields: {
            plantId: { $toObjectId: '$plantId' }, //convert stringId to ObjectId
          },
        },
        {
          $lookup: {
            from: 'plants', //from plantsCollection
            localField: 'plantId', //orderCollection
            foreignField: '_id', //matching plantsCollection and orderCollection
            as: 'plants' //store new array which name plants
          },
        },
        {
          $unwind: '$plants' //convert arry to object
        },
        {
          $addFields: { //which are need data from plantsCollections
            name: '$plants.name',
            image: '$plants.image',
            category: '$plants.category',
          },
        },
        {
          $project: {
            plants: 0, // that means remove new orderCollection...
          }
        },

      ]).toArray();
      res.send(result);
    })

    // Manage plant quantity
    app.patch('/plants/quantity/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const { qunatityToUpdate, status } = req.body;
      const filter = { _id: new ObjectId(id) }
      let updateDoc = {
        $inc: { quantity: -qunatityToUpdate }
      }
      if (status === 'increase') {
        updateDoc = {
          $inc: { quantity: qunatityToUpdate }
        }
      }
      const result = await plantsCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // cancle/delete an order
    app.delete('/orders/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const order = await ordersCollection.findOne(query)
      if (order.status === 'Delivered')
        return res
          .status(409)
          .send('Cannot cancle once the product is delivered!')
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
    })

    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('Hello from plantNet Server..')
})

app.listen(port, () => {
  console.log(`plantNet is running on port ${port}`)
})
