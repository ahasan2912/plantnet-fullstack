require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const jwt = require('jsonwebtoken')
const stripe = require('stripe')(process.env.PAYMENT_SECERET_KEY)
const morgan = require('morgan')
const nodemailer = require("nodemailer"); // jzue rfmw wrfz hgwk

const port = process.env.PORT || 9000
const app = express()
// middleware
const corsOptions = {
  origin: ['https://plantnet-fullstack.firebaseapp.com', 'https://plantnet-fullstack.web.app'],
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

// send eamil using nodemailer
const sendEmail = (emailAddress, emailData) => {
  // create a transpoter
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for port 465, false for other ports
    auth: {
      user: process.env.NODEMAILER_USER,
      pass: process.env.NODEMAILER_PASS,
    },
  });
  transporter.verify((error, success) => {
    if (error) {
      console.log(error)
    }
    else {
      console.log('Transpoter is ready to eamil.', success)
    }
  })

  // transporter.sendMail()
  const mailBody = {
    from: process.env.NODEMAILER_USER, // sender address
    to: emailAddress, // list of receivers
    subject: emailData?.subject, // Subject line
    html: `<p>${emailData?.message}</p>`, // html body
  }

  // send Email
  transporter.sendMail(mailBody, (error, info) => {
    if (error) {
      console.log(error)
    }
    else {
      console.log(info)
      console.log('Email Sent' + info?.response);
    }
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

    // verify Admin middleware
    const verifyAdmin = async (req, res, next) => {
      const email = req.user?.email;
      const query = { email: email }
      const result = await userCollection.findOne(query);
      if (!result || result?.role !== 'admin')
        return res
          .status(403)
          .send({ message: 'Forbidden Aceess, Admin only Actions' })

      next();
    }

    // verify Seller middleware
    const verifySeller = async (req, res, next) => {
      const email = req.user?.email;
      const query = { email: email }
      const result = await userCollection.findOne(query);
      if (!result || result?.role !== 'seller')
        return res
          .status(403)
          .send({ message: 'Forbidden Aceess, Seller only Actions' })

      next();
    }

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
      // console.log(user, email);
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
    app.patch('/users/:email', verifyToken, verifyAdmin, async (req, res) => {
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

    // get all user data
    app.get('/all-users/:email', verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const query = { email: { $ne: email } } // all users are geting without this email. and $ne means not equal to.
      const result = await userCollection.find(query).toArray();
      res.send(result);
    })

    // update a user role & status
    app.patch('/user/role/:email', verifyToken, async (req, res) => {
      const { role, status } = req.body;
      const email = req.params.email;
      const filter = { email };
      const updateDoc = {
        $set: { role, status: 'Verified' }
      }
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // get user role
    app.get('/users/role/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await userCollection.findOne(query);
      res.send({ role: result?.role });
    })

    // delete a plant from db by seller
    app.delete('/plants/:id', verifyToken, verifySeller, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await plantsCollection.deleteOne(query);
      res.send(result);
    })

    // plant related api
    // save a plant data in db
    app.post('/plants', verifyToken, verifySeller, async (req, res) => {
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

    // get inventory data for seller
    app.get('/plants/seller/:email', verifyToken, verifySeller, async (req, res) => {
      const email = req.params.email;
      const result = await plantsCollection.find({ 'seller.email': email }).toArray()
      res.send(result);
    })

    // Save order data in db
    app.post('/order', verifyToken, async (req, res) => {
      const orderInfo = req.body
      // console.log(orderInfo)
      const result = await ordersCollection.insertOne(orderInfo);
      // send Eamil
      if (result?.insertedId) {
        // To Customer
        sendEmail(orderInfo?.customer?.email, {
          subject: 'Order Successful',
          message: `You have an order successfully. Transaction Id: ${result?.insertedId}`
        })

        // To Seller
        sendEmail(orderInfo?.seller, {
          subject: 'Hurray!, You have an order t oprocess.',
          message: `Get the plants ready for ${orderInfo?.customer?.name}`
        })
      }
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

    // get all orders for specific seller
    app.get('/seller-orders/:email', verifyToken, verifySeller, async (req, res) => {
      const email = req.params.email;
      const query = { seller: email };
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

    // update a seller order & status
    app.patch('/orders/:id', verifyToken, verifySeller, async (req, res) => {
      const { status } = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { status }
      }
      const result = await ordersCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // admin stat
    app.get('/admin-stat', verifyToken, verifyAdmin, async (req, res) => {
      // get total user, total plants
      // const totalUser = await userCollection.countDocuments(); // if we want filter or query.but estimatedDocumentCount are not filter or query.
      const totalUser = await userCollection.estimatedDocumentCount();
      const totalPlants = await plantsCollection.estimatedDocumentCount();

      /* const allOrder = await ordersCollection.find().toArray();
      const totalOrder = allOrder.length
      const totalPrice = allOrder.reduce((sum, order) => sum + order.price, 0) */

      // generate chart data
      const chartData = await ordersCollection.aggregate([
        { $sort: { _id: -1 } },
        {
          $addFields: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: { $toDate: '$_id' },
              },
            },
            quantity: { $sum: '$quantity' },
            price: { $sum: '$price' },
            order: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            date: '$_id',
            quantity: 1,
            order: 1,
            price: 1,
          }
        },
      ]).toArray();
      // console.log(chartData)

      const orderDetails = await ordersCollection.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$price' },
            totalOrder: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
          }
        }
      ]).next();

      res.send({ totalPlants, totalUser, ...orderDetails, chartData })
    })

    // create payment intent
    app.post('/create-payment-intent', verifyToken, async (req, res) => {
      const { quantity, plantId } = req.body;
      const query = { _id: new ObjectId(plantId) }
      const plant = await plantsCollection.findOne(query)
      if (!plant) {
        return res.status(400).send({ message: 'Plant Not Found' })
      }
      const totalPrice = (quantity * plant.price) * 100; // total price in cent(poysa)
      const { client_secret } = await stripe.paymentIntents.create({
        amount: totalPrice,
        currency: 'usd',
        automatic_payment_methods: {
          enabled: true,
        },
      });
      res.send({ clientSecret: client_secret })
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
