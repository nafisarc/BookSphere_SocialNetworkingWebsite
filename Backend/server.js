// Import required modules
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path');
const session = require('express-session');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

// Middleware Configuration
const app = express();
const PORT = 8080;
const STUDENT_ID = "M00982229";
const dbUrl = 'mongodb://localhost:27017';
const dbName = 'bookSphere';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(`/${STUDENT_ID}`, express.static(path.join(__dirname, '../frontend')));

const upload = multer({ storage: multer.memoryStorage() });
app.use(session({
    secret: 'secretkey',
    resave: false,
    saveUninitialized: true,
}));

// Database connection
let db;
MongoClient.connect(dbUrl)
    .then((client) => {
        console.log("Connected to Database");
        db = client.db(dbName);
    })
    .catch((err) => {
        console.error("Failed to connect to Database:", err);
        process.exit(1);
    });

// Middleware to check if the user is authenticated
const isAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ error: 'You need to log in first' });
    }
    next();
};

// Serve the frontend
const serveFrontend = (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
};

app.get(`/${STUDENT_ID}/homepage`, serveFrontend);
app.get(`/${STUDENT_ID}/feed`, serveFrontend);
app.get(`/${STUDENT_ID}/friends`, serveFrontend);
app.get(`/${STUDENT_ID}/profile`, serveFrontend);
app.get(`/${STUDENT_ID}/login`, serveFrontend);
app.get(`/${STUDENT_ID}/register`, serveFrontend);
app.get(`/${STUDENT_ID}/notifications`, serveFrontend);

// User Registration
app.post(`/${STUDENT_ID}/users`, async (req, res) => {
    const { name, username, email, password } = req.body;

    if (!name || !username || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const existingUser = await db.collection('users').findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await db.collection('users').insertOne({ // Store user info in db
            name, username, email,
            password: hashedPassword,
            bio: '',
            profilePic: '/M00982229/Images/profile-default.png',
            followers: 0,
            following: 0,
            posts: 0,
        });

        console.log("User registered with ID:", result.insertedId);
        res.status(201).json({ message: 'Registered successfully! Please login.' });
    } catch (err) {
        console.error("Error during registration:", err);
        res.status(500).json({ error: 'Failed to register user' });
    }
});

// User Login
app.post(`/${STUDENT_ID}/login`, async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const user = await db.collection('users').findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const match = await bcrypt.compare(password, user.password); // Comparing user input with encrypted pass
        if (match) {
            req.session.user = { id: user._id.toString() };
            res.status(200).json({ message: 'Login successful!' });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (err) {
        console.error("Error during login:", err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout
app.post(`/${STUDENT_ID}/logout`, (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to log out' });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logged out successfully' });
    });
});

// Get User Profile
app.get(`/${STUDENT_ID}/api/profile`, isAuthenticated, async (req, res) => {
    try {
        const userId = new ObjectId(req.session.user.id); // Collects user id to obstain correct information
        const user = await db.collection('users').findOne({ _id: userId });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json({
            name: user.name,
            username: user.username,
            bio: user.bio,
            profilePic: user.profilePic,
            followers: user.followers,
            following: user.following,
            posts: user.posts,
        });
    } catch (err) {
        console.error("Error fetching profile data:", err);
        res.status(500).json({ error: 'Failed to fetch profile data' });
    }
});

// Update Profile
app.put(`/${STUDENT_ID}/api/profile`, isAuthenticated, upload.single("postImage"), async (req, res) => {
    const { name, username, bio } = req.body;
    const profilePic = req.file ? `/${STUDENT_ID}/uploads/${req.file.filename}` : null;

    try {
        const updateData = { name, username, bio };
        if (profilePic) updateData.profilePic = profilePic;

        const result = await db.collection("users").updateOne(
            { _id: new ObjectId(req.session.user.id) },
            { $set: updateData }
        );

        if (result.modifiedCount > 0) {
            res.status(200).json({ message: "Profile updated successfully!" });
        } else {
            res.status(400).json({ error: "No changes detected." });
        }
    } catch (err) {
        console.error("Error updating profile:", err);
        res.status(500).json({ error: "Failed to update profile." });
    }
});

// Display Friends and Requests
app.get(`/${STUDENT_ID}/api/friends`, isAuthenticated, async (req, res) => {
    try {
        const currentUserId = new ObjectId(req.session.user.id);

        // Fetch all friend documents involving the current user
        const friendDocs = await db.collection('friends').find({
            $or: [
                { requesterId: currentUserId },
                { recipientId: currentUserId }
            ]
        }).toArray();

        const acceptedFriendIds = [];
        const sentRequestIds = [];
        const receivedRequestIds = [];

        friendDocs.forEach(doc => {
            if (doc.status === 'accepted') {
                // Determine the other user
                const otherUserId = doc.requesterId.equals(currentUserId) ? doc.recipientId : doc.requesterId;
                acceptedFriendIds.push(otherUserId.toString());
            } else if (doc.status === 'pending') {
                if (doc.requesterId.equals(currentUserId)) {
                    sentRequestIds.push(doc.recipientId.toString());
                } else {
                    receivedRequestIds.push(doc.requesterId.toString());
                }
            }
        });

        const allUserIds = [...new Set([...acceptedFriendIds, ...sentRequestIds, ...receivedRequestIds])];

        const users = await db.collection('users')
            .find({ _id: { $in: allUserIds.map(id => new ObjectId(id)) } })
            .project({ name: 1, username: 1, profilePic: 1 })
            .toArray();

        const friendsData = {
            currentFriends: users.filter(u => acceptedFriendIds.includes(u._id.toString())),
            sentRequests: users.filter(u => sentRequestIds.includes(u._id.toString())),
            receivedRequests: users.filter(u => receivedRequestIds.includes(u._id.toString()))
        };

        res.status(200).json(friendsData);
    } catch (err) {
        console.error("Error fetching friends data:", err);
        res.status(500).json({ error: 'Failed to fetch friends data' });
    }
});

// Search Users
app.get(`/${STUDENT_ID}/api/search-users`, isAuthenticated, async (req, res) => {
    const query = req.query.q;
    const currentUserId = new ObjectId(req.session.user.id);

    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }

    try {
        const users = await db.collection('users').find({
            $or: [
                { username: { $regex: query, $options: 'i' } },
                { name: { $regex: query, $options: 'i' } }
            ]
        }).project({ name: 1, username: 1, profilePic: 1 }).toArray();

        // Determine the relationship status for each user found
        const userRelationshipStatuses = await Promise.all(users.map(async user => {
            const doc = await db.collection('friends').findOne({
                $or: [
                    { requesterId: currentUserId, recipientId: user._id },
                    { requesterId: user._id, recipientId: currentUserId }
                ]
            });

            let relationshipStatus = 'none'; 

            if (doc) {
                if (doc.status === 'accepted') {
                    relationshipStatus = 'friends';
                } else if (doc.status === 'pending') {
                    if (doc.requesterId.equals(currentUserId)) {
                        relationshipStatus = 'pending_outgoing';
                    } else {
                        relationshipStatus = 'pending_incoming';
                    }
                }
            }

            return { ...user, relationshipStatus };
        }));

        res.status(200).json(userRelationshipStatuses);
    } catch (err) {
        console.error("Error searching users:", err);
        res.status(500).json({ error: 'Failed to search users' });
    }
});

// Send Friend Request
app.post(`/${STUDENT_ID}/api/friends/request`, isAuthenticated, async (req, res) => {
    const { userIdToRequest } = req.body;
    const currentUserId = new ObjectId(req.session.user.id);

    if (!userIdToRequest) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    const requestedUserId = new ObjectId(userIdToRequest);

    if (requestedUserId.equals(currentUserId)) {
        return res.status(400).json({ error: 'You cannot send a friend request to yourself.' });
    }

    try {
        const existingRelation = await db.collection('friends').findOne({
            $or: [
                { requesterId: currentUserId, recipientId: requestedUserId },
                { requesterId: requestedUserId, recipientId: currentUserId }
            ]
        });

        if (existingRelation) { // Checks to avoid redundancy
            if (existingRelation.status === 'accepted') {
                return res.status(400).json({ error: 'You are already friends.' });
            } else {
                return res.status(400).json({ error: 'A friend request already exists between you two.' });
            }
        }

        // Create a pending request
        await db.collection('friends').insertOne({
            requesterId: currentUserId,
            recipientId: requestedUserId,
            status: 'pending'
        });

        res.status(200).json({ message: 'Friend request sent.' });
    } catch (err) {
        console.error('Error sending friend request:', err);
        res.status(500).json({ error: 'Failed to send friend request.' });
    }
});

// Accept Friend Request
app.post(`/${STUDENT_ID}/api/friends/accept`, isAuthenticated, async (req, res) => {
    const { requesterId } = req.body;
    const currentUserId = new ObjectId(req.session.user.id);

    if (!requesterId) {
        return res.status(400).json({ error: 'Requester ID is required.' });
    }

    const requesterObjectId = new ObjectId(requesterId);

    try {
        const friendDoc = await db.collection('friends').findOne({
            requesterId: requesterObjectId,
            recipientId: currentUserId,
            status: 'pending'
        });

        if (!friendDoc) {
            return res.status(404).json({ error: 'No pending friend request found from that user.' });
        }

        // Update status to accepted
        await db.collection('friends').updateOne(
            { _id: friendDoc._id },
            { $set: { status: 'accepted' } }
        );

        // Increment followers/following count for both users
        await db.collection('users').updateOne(
            { _id: currentUserId },
            { $inc: { followers: 1, following: 1 } }
        );

        await db.collection('users').updateOne(
            { _id: requesterObjectId },
            { $inc: { followers: 1, following: 1 } }
        );

        res.status(200).json({ message: 'Friend request accepted. You are now friends!' });
    } catch (err) {
        console.error('Error accepting friend request:', err);
        res.status(500).json({ error: 'Failed to accept friend request.' });
    }
});

// Removing a friend
app.delete(`/${STUDENT_ID}/api/friends/:userIdToRemove`, isAuthenticated, async (req, res) => {
    const { userIdToRemove } = req.params;
    const currentUserId = req.session.user.id;

    if (!userIdToRemove) {
        return res.status(400).json({ error: 'User ID is required.' });
    }

    try {
        // Find the existing friendship with status accepted
        const friendDoc = await db.collection('friends').findOne({
            $or: [
                { requesterId: new ObjectId(currentUserId), recipientId: new ObjectId(userIdToRemove), status: 'accepted' },
                { requesterId: new ObjectId(userIdToRemove), recipientId: new ObjectId(currentUserId), status: 'accepted' }
            ]
        });

        if (!friendDoc) {
            return res.status(404).json({ error: 'No friendship found to remove.' });
        }

        // Remove the document
        await db.collection('friends').deleteOne({ _id: friendDoc._id });

        // Decrement followers/following for both users
        await db.collection('users').updateOne(
            { _id: new ObjectId(currentUserId) },
            { $inc: { following: -1, followers: -1 } }
        );
        await db.collection('users').updateOne(
            { _id: new ObjectId(userIdToRemove) },
            { $inc: { following: -1, followers: -1 } }
        );

        res.status(200).json({ message: 'Friend removed successfully.' });
    } catch (err) {
        console.error("Error removing friend:", err);
        res.status(500).json({ error: 'Failed to remove friend.' });
    }
});

// Create Post
app.post(`/${STUDENT_ID}/api/posts`, isAuthenticated, upload.single('postImage'), async (req, res) => {
    try {
        const { postText } = req.body;
        const userId = req.session.user.id;

        if (!postText) {
            return res.status(400).json({ error: 'Post text is required.' });
        }

        let imageId = null;
        if (req.file) {
            const image = {
                data: req.file.buffer,
                contentType: req.file.mimetype,
                fileName: req.file.originalname,
                createdAt: new Date(),
            };

            const result = await db.collection('uploads').insertOne(image);
            imageId = result.insertedId;
        }

        const newPost = {
            userId: new ObjectId(userId),
            text: postText,
            image: imageId,
            createdAt: new Date(),
        };

        const result = await db.collection('posts').insertOne(newPost);
        res.status(201).json({ message: 'Post created successfully!', postId: result.insertedId });
    } catch (err) {
        console.error("Error creating post:", err);
        res.status(500).json({ error: 'Failed to create post.' });
    }
});

// Fetch Posts (from friends and self)
app.get(`/${STUDENT_ID}/api/posts`, isAuthenticated, async (req, res) => {
    try {
        const currentUserId = new ObjectId(req.session.user.id);

        // Find all accepted friendships involving current user
        const friendsDocs = await db.collection('friends').find({
            $or: [
                { requesterId: currentUserId, status: 'accepted' },
                { recipientId: currentUserId, status: 'accepted' }
            ]
        }).toArray();

        const friendIds = new Set();
        friendsDocs.forEach(doc => {
            friendIds.add(doc.requesterId.toString());
            friendIds.add(doc.recipientId.toString());
        });

        // currentUser is also included
        friendIds.add(currentUserId.toString());

        const posts = await db.collection('posts').aggregate([
            {
                $match: {
                    userId: { $in: Array.from(friendIds).map(id => new ObjectId(id)) }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userDetails',
                },
            },
            { $unwind: '$userDetails' },
            {
                $lookup: {
                    from: 'uploads',
                    localField: 'image',
                    foreignField: '_id',
                    as: 'imageDetails',
                },
            },
            { $unwind: { path: '$imageDetails', preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    text: 1,
                    createdAt: 1,
                    userId: 1,
                    'userDetails.name': 1,
                    'userDetails.username': 1,
                    'userDetails.profilePic': 1,
                    'imageDetails.data': 1,
                    'imageDetails.contentType': 1,
                },
            },
            { $sort: { createdAt: -1 } },
        ]).toArray();

        posts.forEach(post => {
            if (post.imageDetails && post.imageDetails.data) {
                post.imageDetails.data = `data:${post.imageDetails.contentType};base64,${post.imageDetails.data.toString('base64')}`;
            }
        });

        res.status(200).json(posts);
    } catch (err) {
        console.error("Error fetching posts:", err);
        res.status(500).json({ error: 'Failed to fetch posts.' });
    }
});

// Delete a Post
app.delete(`/${STUDENT_ID}/api/posts/:postId`, isAuthenticated, async (req, res) => {
    const { postId } = req.params;
    const currentUserId = req.session.user.id;

    try {
        // Find the post
        const post = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
        if (!post) {
            return res.status(404).json({ error: 'Post not found.' });
        }

        // Check if the current user is the owner of the post
        if (post.userId.toString() !== currentUserId) {
            return res.status(403).json({ error: 'You do not have permission to delete this post.' });
        }

        // Delete the post
        await db.collection('posts').deleteOne({ _id: post._id });

        // Optionally, you might also want to delete all comments associated with this post
        await db.collection('comments').deleteMany({ postId: post._id });

        res.status(200).json({ message: 'Post deleted successfully!' });
    } catch (err) {
        console.error('Error deleting post:', err);
        res.status(500).json({ error: 'Failed to delete post.' });
    }
});

// Like/Unlike Post
app.post(`/${STUDENT_ID}/api/posts/:postId/like`, isAuthenticated, async (req, res) => {
    const { postId } = req.params;
    const userId = req.session.user.id;

    try {
        const existingLike = await db.collection('likes').findOne({
            postId: new ObjectId(postId),
            userId: new ObjectId(userId),
        });

        if (existingLike) {
            await db.collection('likes').deleteOne({
                postId: new ObjectId(postId),
                userId: new ObjectId(userId),
            });
            return res.status(200).json({ message: 'Like removed' });
        }

        await db.collection('likes').insertOne({
            postId: new ObjectId(postId),
            userId: new ObjectId(userId),
            createdAt: new Date(),
        });

        res.status(200).json({ message: 'Post liked' });
    } catch (err) {
        console.error('Error liking post:', err);
        res.status(500).json({ error: 'Failed to like post.' });
    }
});

app.post(`/${STUDENT_ID}/api/posts/:postId/comment`, isAuthenticated, async (req, res) => {
    const { postId } = req.params;
    const { comment } = req.body;
    const userId = req.session.user.id;

    if (!comment) {
        return res.status(400).json({ error: 'Comment text is required' });
    }

    try {
        const result = await db.collection('comments').insertOne({
            postId: new ObjectId(postId),
            userId: new ObjectId(userId),
            comment,
            createdAt: new Date(),
        });

        res.status(200).json({ 
            message: 'Comment added successfully!',
            commentId: result.insertedId.toString() // Return the newly created comment's ID
        });
    } catch (err) {
        console.error('Error adding comment:', err);
        res.status(500).json({ error: 'Failed to add comment.' });
    }
});

// Comment on Post
app.get(`/${STUDENT_ID}/api/posts/:postId/comments`, isAuthenticated, async (req, res) => {
    const { postId } = req.params;

    try {
        const comments = await db.collection('comments').aggregate([
            { $match: { postId: new ObjectId(postId) } },
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'commenterDetails'
                }
            },
            { $unwind: '$commenterDetails' },
            {
                $project: {
                    comment: 1,
                    createdAt: 1,
                    'commenterDetails.name': 1,
                    'commenterDetails.username': 1,
                    'commenterDetails.profilePic': 1
                }
            },
            { $sort: { createdAt: 1 } }
        ]).toArray();

        res.status(200).json(comments);
    } catch (err) {
        console.error('Error fetching comments:', err);
        res.status(500).json({ error: 'Failed to fetch comments.' });
    }
});

// Delete comments
app.delete(`/${STUDENT_ID}/api/posts/:postId/comments/:commentId`, isAuthenticated, async (req, res) => {
    const { postId, commentId } = req.params;
    const currentUserId = req.session.user.id;

    try {
        // Find the comment
        const comment = await db.collection('comments').findOne({ _id: new ObjectId(commentId), postId: new ObjectId(postId) });
        if (!comment) {
            return res.status(404).json({ error: 'Comment not found.' });
        }

        // Check if the current user is the owner of the comment
        if (comment.userId.toString() !== currentUserId) {
            return res.status(403).json({ error: 'You do not have permission to delete this comment.' });
        }

        // Delete the comment
        await db.collection('comments').deleteOne({ _id: comment._id });

        res.status(200).json({ message: 'Comment deleted successfully!' });
    } catch (err) {
        console.error('Error deleting comment:', err);
        res.status(500).json({ error: 'Failed to delete comment.' });
    }
});

// Web scraping
async function scrapeWithPuppeteer() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('https://imprintdigital.com/top-20-book-facts/', { waitUntil: 'networkidle2' });
  
    // After the page fully loads, get the HTML
    const content = await page.content();
  
    // Using cheerio on fully rendered content
    const $ = cheerio.load(content);
    const facts = [];
    $('.main_text h2').each((i, elem) => {
      const factText = $(elem).text().trim();
      facts.push(factText);
    });
  
    await browser.close();
    return facts;
  }
  
 
  // Store facts in DB
  async function storeFactsInDB(facts) {
    await db.collection('facts').deleteMany({});
    
    const docs = facts.map((fact, index) => ({ text: fact, index }));
    await db.collection('facts').insertMany(docs);
  
    // Store totalFacts and initialize currentFact
    await db.collection('settings').updateOne(
      { key: 'currentFact' },
      { $set: {
          key: 'currentFact',
          currentIndex: 0,
          lastUpdated: new Date(),
          totalFacts: facts.length
      }},
      { upsert: true }
    );
  }
  
  // Initialize facts: scrape and store
  async function initializeFacts() {
    const facts = await scrapeWithPuppeteer(); // Correct function name
    if (facts.length > 0) {
      console.log(`Found ${facts.length} facts`);
      await storeFactsInDB(facts);
    } else {
      console.log('No facts found, check the selector or the page structure.');
    }
  }
  
  initializeFacts().catch(err => {
    console.error('Error initializing facts:', err);
  });
  
// Endpoint to get current fact
app.get(`/${STUDENT_ID}/api/current-fact`, async (req, res) => { // Correct path
    try {
      const settings = await db.collection('settings').findOne({ key: 'currentFact' });
      if (!settings) {
        return res.status(404).json({ error: 'No fact settings found.' });
      }
  
      const totalFacts = settings.totalFacts || 0;
      if (totalFacts === 0) {
        return res.status(404).json({ error: 'No facts available.' });
      }
  
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      // Rotate fact if more than an hour has passed
      if (new Date(settings.lastUpdated) < oneHourAgo) {
        const newIndex = (settings.currentIndex + 1) % totalFacts;
        await db.collection('settings').updateOne(
          { key: 'currentFact' },
          { $set: { currentIndex: newIndex, lastUpdated: new Date() } }
        );
        settings.currentIndex = newIndex;
      }
  
      const factDoc = await db.collection('facts').findOne({ index: settings.currentIndex });
      if (!factDoc) {
        return res.status(404).json({ error: 'Fact not found.' });
      }
  
      res.json({ fact: factDoc.text });
    } catch (err) {
      console.error('Error retrieving current fact:', err);
      res.status(500).json({ error: 'Internal server error.' });
    }
  });

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}/${STUDENT_ID}`);
});
