// Student ID
const STUDENT_ID = "M00982229";

// Function to show and hide sections dynamically
function showSection(sectionId) {
    // Hide all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.style.display = 'none';
    });

    // Hide navigation bar for search results
    const navbar = document.querySelector('nav');
    if (sectionId === 'searchResults') {
        navbar.style.display = 'none';
    } else {
        navbar.style.display = 'block'; // Restore navbar for other sections
    }

    // Show the selected section
    document.getElementById(sectionId).style.display = 'block';
}

// Load the correct section based on the URL
function loadSectionFromURL() {
    const path = window.location.pathname; // Get the current URL path
    const sectionMap = {
        [`/${STUDENT_ID}/homepage`]: 'homeSection',
        [`/${STUDENT_ID}/feed`]: 'feedSection',
        [`/${STUDENT_ID}/friends`]: 'friendsSection',
        [`/${STUDENT_ID}/profile`]: 'profileSection',
        [`/${STUDENT_ID}/login`]: 'loginSection',
        [`/${STUDENT_ID}/register`]: 'registrationSection',
    };

    const sectionId = sectionMap[path];
    if (sectionId) {
        showSection(sectionId); // Show the corresponding section

        // If it's the feed section, load posts
        if (sectionId === 'feedSection') {
            loadPosts();
        }

        // If it's the friends section, load friends
        if (sectionId === 'friendsSection') {
            loadFriends();
        }
    } else {
        showSection('homeSection'); // Default to the homepage if no match
    }
}

function navigateToPage(path) {
    window.history.pushState(null, '', path);
    loadSectionFromURL();
}

// Call this function when the page loads
document.addEventListener('DOMContentLoaded', () => {
    loadSectionFromURL();
    loadCurrentFact();
    if (window.location.pathname.includes('/feed')) {
        loadPosts();
    }
});

// Listener for navigation clicks to dynamically load the profile
document.querySelector("nav a[href='/" + STUDENT_ID + "/profile']").addEventListener('click', (event) => {
    event.preventDefault();
    window.history.pushState(null, '', `/${STUDENT_ID}/profile`);
    loadSectionFromURL();
    loadProfile();
});

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === `/${STUDENT_ID}/friends`) {
        loadFriends();
    }
});

// Update navigation to change the URL without reloading
document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default link behavior
        const href = link.getAttribute('href'); // Get the target URL
        window.history.pushState(null, '', href); // Update the browser's URL
        loadSectionFromURL(); // Load the corresponding section
    });
});

// Handle browser back/forward button navigation
window.addEventListener('popstate', loadSectionFromURL);

// Registration
async function registerUser(event) {
    event.preventDefault(); 

    const name = document.getElementById('name').value;
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (password !== confirmPassword) {
        alert('Passwords do not match. Please try again.');
        return;
    }

    try {
        const response = await fetch(`/${STUDENT_ID}/users`, { // AJAX
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, username, email, password }),
        });

        const result = await response.json();
        if (response.ok) {
            alert(result.message);
            window.history.pushState(null, '', `/${STUDENT_ID}/login`);
            loadSectionFromURL();
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (err) {
        console.error("Registration failed:", err);
        alert("An error occurred while registering. Please try again.");
    }
}

// Login
async function loginUser(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`/${STUDENT_ID}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();
        if (response.ok) {
            alert(result.message);
            window.history.pushState(null, '', `/${STUDENT_ID}/profile`);
            loadSectionFromURL();
            loadProfile();
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (err) {
        console.error("Login failed:", err);
        alert("An error occurred while logging in. Please try again.");
    }
}

document.getElementById('registerForm').addEventListener('submit', registerUser);
document.getElementById('loginForm').addEventListener('submit', loginUser);

document.getElementById('resetRegisterForm').addEventListener('click', function() {
    document.getElementById('registerForm').reset();
});

document.getElementById('resetLoginForm').addEventListener('click', function() {
    document.getElementById('loginForm').reset();
});

// Logout
async function logoutUser() {
    try {
        const response = await fetch(`/${STUDENT_ID}/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });

        const result = await response.json();
        if (response.ok) {
            alert(result.message);
            window.history.pushState(null, '', `/${STUDENT_ID}/login`);
            loadSectionFromURL();
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (err) {
        console.error("Logout failed:", err);
        alert("An error occurred while logging out. Please try again.");
    }
}

document.getElementById('logoutButton').addEventListener('click', logoutUser);

// Toggle Post Creation Modal
function toggleCreatePostModal() {
    const modal = document.getElementById('createPostModal');
    modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
}

// Toggle Edit Profile Modal
function toggleEditProfileModal() {
    const modal = document.getElementById("editProfileModal");
    fillEditProfileForm();
    modal.style.display = modal.style.display === "block" ? "none" : "block";
}

async function fillEditProfileForm() {
    try {
        const response = await fetch(`/${STUDENT_ID}/api/profile`, {
            credentials: 'include'
        });
        const profile = await response.json();
        if (response.ok) {
            document.getElementById('editName').value = profile.name;
            document.getElementById('editUsername').value = profile.username;
            document.getElementById('editBio').value = profile.bio || '';
        } else {
            alert('Failed to load profile data.');
        }
    } catch (err) {
        console.error("Error loading profile:", err);
    }
}

async function loadProfile() {
    try {
        const response = await fetch(`/${STUDENT_ID}/api/profile`, {
            credentials: 'include'
        });
        const profile = await response.json();

        if (response.ok) {
            document.querySelector(".profile-pic").src = profile.profilePic;
            document.querySelector(".profile-info h3").textContent = profile.name;
            document.querySelector(".profile-info h2").textContent = profile.username;
            document.querySelector(".profile-bio").textContent = profile.bio || "No bio yet.";
            document.querySelector(".profile-stats p:nth-of-type(1) span").textContent = profile.posts;
            document.querySelector(".profile-stats p:nth-of-type(2) span").textContent = profile.followers;
            document.querySelector(".profile-stats p:nth-of-type(3) span").textContent = profile.following;
        } else {
            alert(profile.error || "Failed to load profile data.");
        }
    } catch (err) {
        console.error("Error loading profile:", err);
    }
}

document.getElementById("editProfileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    try {
        const response = await fetch(`/${STUDENT_ID}/api/profile`, {
            method: "PUT",
            credentials: 'include',  
            body: formData,
        });

        const result = await response.json();
        if (response.ok) {
            alert("Profile updated successfully!");
            loadProfile();
            toggleEditProfileModal();
        } else {
            alert(result.error || "Failed to update profile.");
        }
    } catch (error) {
        console.error("Error updating profile:", error);
        alert("An error occurred. Please try again.");
    }
});

if (window.location.pathname.includes('/profile')) {
    loadProfile();
}

// Send Friend Request
async function sendFriendRequest(userId) {
    try {
        const response = await fetch(`/${STUDENT_ID}/api/friends/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIdToRequest: userId }),
        });

        const result = await response.json();
        if (response.ok) {
            alert(result.message);
            searchUsers();
        } else {
            alert(result.error || 'Failed to send friend request.');
        }
    } catch (err) {
        console.error('Error sending friend request:', err);
        alert('Failed to send friend request.');
    }
}

// Accept friend request
async function acceptFriendRequest(requesterId) {
    try {
        const response = await fetch(`/${STUDENT_ID}/api/friends/accept`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requesterId }),
            credentials: 'include'
        });

        const result = await response.json();
        if (response.ok) {
            alert(result.message);
            loadFriends(); // Refresh the friends list to show the newly accepted friend
        } else {
            alert(result.error || 'Failed to accept friend request.');
        }
    } catch (err) {
        console.error('Error accepting friend request:', err);
        alert('Failed to accept friend request.');
    }
}

// Display friends 
async function loadFriends() {
    try {
        const response = await fetch(`/${STUDENT_ID}/api/friends`, { credentials: 'include' });
        if (!response.ok) {
            console.error("Failed to fetch friends data:", response.statusText);
            throw new Error('Failed to fetch friends data');
        }

        const friendsData = await response.json();
        console.log("Friends data fetched:", friendsData);

        // Current Friends
        const currentFriendsContainer = document.querySelector('.current-friends ul');
        if (friendsData.currentFriends.length === 0) {
            currentFriendsContainer.innerHTML = '<li>No current friends found.</li>';
        } else {
            currentFriendsContainer.innerHTML = '';
            friendsData.currentFriends.forEach(friend => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <b>${friend.name}</b> (@${friend.username})
                    <button class="remove-friend-btn" data-user-id="${friend._id}">Remove Friend</button>
                `;
                currentFriendsContainer.appendChild(li);
            });
        }

        document.querySelectorAll('.remove-friend-btn').forEach(button => {
            const userId = button.getAttribute('data-user-id');
            button.addEventListener('click', () => removeFriend(userId));
        });

        // Sent Requests
        const sentRequestsContainer = document.querySelector('.sent-requests ul');
        if (friendsData.sentRequests.length === 0) {
            sentRequestsContainer.innerHTML = '<li>No sent requests found.</li>';
        } else {
            sentRequestsContainer.innerHTML = friendsData.sentRequests.map(request => `
                <li>${request.name} (@${request.username})
                    <button class="request-sent-btn" disabled>Request Sent</button>
                </li>
            `).join('');
        }

        // Received Requests
        const receivedRequestsContainer = document.querySelector('.received-requests ul');
        if (friendsData.receivedRequests.length === 0) {
            receivedRequestsContainer.innerHTML = '<li>No received requests found.</li>';
        } else {
            receivedRequestsContainer.innerHTML = '';
            friendsData.receivedRequests.forEach(request => {
                const li = document.createElement('li');
                li.innerHTML = `
                    ${request.name} (@${request.username})
                    <button class="accept-request-btn" data-requester-id="${request._id}">Accept</button>
                `;
                receivedRequestsContainer.appendChild(li);
            });
        }

        document.querySelectorAll('.accept-request-btn').forEach(button => {
            const requesterId = button.getAttribute('data-requester-id');
            button.addEventListener('click', () => acceptFriendRequest(requesterId));
        });

    } catch (err) {
        console.error("Error loading friends data:", err);
        alert("Failed to load friends. Please try again later.");
    }
}

// Removing friends
async function removeFriend(userId) {
    try {
        const response = await fetch(`/${STUDENT_ID}/api/friends/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const result = await response.json();
        if (response.ok) {
            alert(result.message);
            loadFriends();
        } else {
            alert(result.error || 'Failed to remove friend.');
        }
    } catch (err) {
        console.error("Error removing friend:", err);
        alert('Failed to remove friend.');
    }
}

// Search users
async function searchUsers(event) {
    if (event) event.preventDefault();

    const query = document.getElementById('searchInput').value.trim();

    if (!query) {
        alert('Please enter a search term.');
        return;
    }

    try {
        const response = await fetch(`/${STUDENT_ID}/api/search-users?q=${encodeURIComponent(query)}`);

        if (!response.ok) {
            const errorResponse = await response.json();
            throw new Error(errorResponse.error || 'Error fetching search results.');
        }

        const users = await response.json();

        const resultsContainer = document.querySelector('#searchResults .results-container');
        resultsContainer.innerHTML = '';

        if (users.length === 0) {
            resultsContainer.innerHTML = '<p>No users found.</p>';
        } else {
            users.forEach(user => {
                const userDiv = document.createElement('div');
                userDiv.classList.add('result-item');
                
                let actionButtonHTML = '';
                if (user.relationshipStatus === 'none') {
                    actionButtonHTML = `<button class="add-friend-btn" data-user-id="${user._id}">Add Friend</button>`;
                } else if (user.relationshipStatus === 'pending_outgoing') {
                    actionButtonHTML = `<button class="request-sent-btn" disabled>Request Sent</button>`;
                } else if (user.relationshipStatus === 'pending_incoming') {
                    actionButtonHTML = `<button class="accept-request-btn" data-requester-id="${user._id}">Accept Request</button>`;
                } else if (user.relationshipStatus === 'friends') {
                    actionButtonHTML = `<button class="friends-btn" disabled>Friends</button>`;
                }

                userDiv.innerHTML = `
                    <img src="${user.profilePic || '/default-profile.png'}" alt="Profile Pic" class="result-icon">
                    <div class="result-info">
                        <h3>${user.name}</h3>
                        <p>@${user.username}</p>
                    </div>
                    ${actionButtonHTML}
                `;

                // Add event listeners for the action buttons
                const addFriendBtn = userDiv.querySelector('.add-friend-btn');
                if (addFriendBtn) {
                    addFriendBtn.addEventListener('click', () => sendFriendRequest(addFriendBtn.getAttribute('data-user-id')));
                }

                const acceptBtn = userDiv.querySelector('.accept-request-btn');
                if (acceptBtn) {
                    acceptBtn.addEventListener('click', () => acceptFriendRequest(acceptBtn.getAttribute('data-requester-id')));
                }

                resultsContainer.appendChild(userDiv);
            });
        }

        showSection('searchResults');
    } catch (err) {
        console.error("Search error:", err);
        alert('An error occurred while searching. Please try again.');
    }
}

document.getElementById('searchButton').addEventListener('click', searchUsers);

// Create Post
async function createPost(event) {
    event.preventDefault();
    const postText = document.getElementById('postText').value;
    const postImage = document.getElementById('postImage').files[0];

    const formData = new FormData();
    formData.append('postText', postText);
    if (postImage) formData.append('postImage', postImage);

    try {
        const response = await fetch(`/${STUDENT_ID}/api/posts`, {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();

        if (response.ok) {
            alert('Post created successfully!');
            document.getElementById('createPostForm').reset();
            toggleCreatePostModal();
            loadPosts(); 
        } else {
            alert(result.error || 'Failed to create post.');
        }
    } catch (err) {
        console.error("Error creating post:", err);
    }
}

// Loading posts
async function loadPosts() {
    try {
        const response = await fetch(`/${STUDENT_ID}/api/posts`, { credentials: 'include' });
        const posts = await response.json();

        const feedContainer = document.querySelector('#feedSection .feed-container');
        feedContainer.innerHTML = '';

        if (posts.length === 0) {
            feedContainer.innerHTML = '<p>No posts available.</p>';
            return;
        }

        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.classList.add('post');
            postElement.setAttribute('data-post-id', post._id);

            postElement.innerHTML = `
                <div class="post-header">
                    <img src="${post.userDetails.profilePic}" alt="User Profile Picture" class="post-profile-pic">
                    <div class="post-user-info">
                        <h3>${post.userDetails.name} (@${post.userDetails.username})</h3>
                        <p class="post-date">${new Date(post.createdAt).toLocaleString()}</p>
                    </div>
                    <img src="/M00982229/Images/deleteIcon.png" class="delete-icon delete-post-icon" data-post-id="${post._id}" alt="Delete Post">
                </div>
                <div class="post-content">
                    <p>${post.text}</p>
                    ${post.imageDetails ? `<img src="${post.imageDetails.data}" class="post-image" alt="Post Image">` : ''}
                </div>
                <div class="post-actions">
                    <button class="like-btn" data-post-id="${post._id}">Like</button>
                    <button class="comment-btn" data-post-id="${post._id}">Comment</button>
                </div>
                <div class="comments-section" style="display:none;"></div>
            `;

            const likeButton = postElement.querySelector('.like-btn');
            likeButton.addEventListener('click', async () => {
                await toggleLike(post._id, likeButton);
            });

            const commentButton = postElement.querySelector('.comment-btn');
            commentButton.addEventListener('click', () => {
                toggleCommentSection(post._id, postElement);
            });

            // Event listener for deleting the post
            const deletePostIcon = postElement.querySelector('.delete-post-icon');
            deletePostIcon.addEventListener('click', () => {
                deletePost(post._id, postElement);
            });

            feedContainer.appendChild(postElement);
        });
    } catch (err) {
        console.error("Error loading posts:", err);
    }
}

// Toggle showing/hiding the comment input & list section
async function toggleCommentSection(postId, postElement) {
    const commentsSection = postElement.querySelector('.comments-section');

    // If it's currently hidden, show it and load comments
    if (commentsSection.style.display === 'none') {
        commentsSection.style.display = 'block';

        await loadComments(postId, commentsSection);

        // Add the comment input form if not already present
        if (!commentsSection.querySelector('.comment-input-area')) {
            const commentInputArea = document.createElement('div');
            commentInputArea.classList.add('comment-input-area');
            commentInputArea.innerHTML = `
                <input type="text" class="new-comment-input" placeholder="Write a comment..." />
                <button class="submit-comment-btn">Submit</button>
            `;
            commentsSection.appendChild(commentInputArea);

            const submitCommentBtn = commentInputArea.querySelector('.submit-comment-btn');
            const newCommentInput = commentInputArea.querySelector('.new-comment-input');
            submitCommentBtn.addEventListener('click', async () => {
                const commentText = newCommentInput.value.trim();
                if (commentText) {
                    const success = await submitComment(postId, commentText);
                    if (success) {
                        // Add the new comment to the comment list
                        appendCommentToList(postId, commentText, commentsSection);
                        newCommentInput.value = ''; 
                        commentInputArea.style.display = 'none';
                    }
                } else {
                    alert('Please enter a comment.');
                }
            });

            // Show the comment input every time when toggling on
            commentInputArea.style.display = 'block'; 
        } else {
            const commentInputArea = commentsSection.querySelector('.comment-input-area');
            commentInputArea.style.display = 'block';
        }
    } else {
        commentsSection.style.display = 'none';
    }

    submitCommentBtn.addEventListener('click', async () => {
        const commentText = newCommentInput.value.trim();
        if (commentText) {
            const newCommentId = await submitComment(postId, commentText);
            if (newCommentId) {
                appendCommentToList(postId, commentText, commentsSection, newCommentId);
                newCommentInput.value = ''; // clear input
                commentInputArea.style.display = 'none';
            }
        } else {
            alert('Please enter a comment.');
        }
    });    
}

// Load existing comments for a post
async function loadComments(postId, commentsSection) {
    try {
        const response = await fetch(`/${STUDENT_ID}/api/posts/${postId}/comments`, {
            credentials: 'include'
        });
        if (!response.ok) {
            console.error("Error fetching comments:", await response.text());
            return;
        }
        const comments = await response.json();

        let commentsList = commentsSection.querySelector('.comments-list');
        if (!commentsList) {
            commentsList = document.createElement('div');
            commentsList.classList.add('comments-list');
            commentsSection.appendChild(commentsList);
        }
        commentsList.innerHTML = '';

        if (comments.length === 0) {
            commentsList.innerHTML = '<p>No comments yet.</p>';
        } else {
            comments.forEach(c => {
                const commentDiv = document.createElement('div');
                commentDiv.classList.add('comment-item');
                commentDiv.setAttribute('data-comment-id', c._id);

                commentDiv.innerHTML = `
                    <div class="comment-header">
                        <span class="commenter-name"><b>${c.commenterDetails.name}</b> (@${c.commenterDetails.username})</span>
                        <span class="comment-date">${new Date(c.createdAt).toLocaleString()}</span>
                        <img src="/M00982229/Images/deleteIcon.png" class="delete-icon delete-comment-icon" data-post-id="${postId}" data-comment-id="${c._id}" alt="Delete Comment">
                    </div>
                    <p class="comment-text">${c.comment}</p>
                `;

                // Event listener for deleting the comment
                const deleteCommentIcon = commentDiv.querySelector('.delete-comment-icon');
                deleteCommentIcon.addEventListener('click', () => {
                    deleteComment(postId, c._id, commentDiv);
                });

                commentsList.appendChild(commentDiv);
            });
        }
    } catch (err) {
        console.error('Error loading comments:', err);
    }
}

// Append a submitted comment to the list
function appendCommentToList(postId, commentText, commentsSection, commentId) {
    let commentsList = commentsSection.querySelector('.comments-list');
    if (!commentsList) {
        commentsList = document.createElement('div');
        commentsList.classList.add('comments-list');
        commentsSection.appendChild(commentsList);
    }

    // Remove "No comments yet." message if it's present
    const noCommentsMsg = commentsList.querySelector('.no-comments-msg');
    if (noCommentsMsg) {
        noCommentsMsg.remove();
    }

    const now = new Date();
    const commentDiv = document.createElement('div');
    commentDiv.classList.add('comment-item');
    commentDiv.setAttribute('data-comment-id', commentId);

    commentDiv.innerHTML = `
        <div class="comment-header" style="position: relative;">
            <span class="commenter-name">You</span>
            <span class="comment-date">${now.toLocaleString()}</span>
            <img src="/M00982229/Images/deleteIcon.png" class="delete-icon delete-comment-icon" data-post-id="${postId}" data-comment-id="${commentId}" alt="Delete Comment">
        </div>
        <p class="comment-text">${commentText}</p>
    `;
    commentsList.appendChild(commentDiv);

    const appendedDeleteIcon = commentDiv.querySelector('.delete-comment-icon');
    appendedDeleteIcon.addEventListener('click', () => {
        deleteComment(postId, commentId, commentDiv); 
    });
}

// Submit a comment to the server
async function submitComment(postId, commentText) {
    try {
        const response = await fetch(`/${STUDENT_ID}/api/posts/${postId}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment: commentText }),
            credentials: 'include'
        });
        const result = await response.json();

        if (response.ok) {
            return result.commentId; 
        } else {
            alert(result.error || 'Failed to add comment.');
            return null;
        }
    } catch (err) {
        console.error('Error adding comment:', err);
        return null;
    }
}

// Deleting posts
async function deletePost(postId, postElement) {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
        const response = await fetch(`/${STUDENT_ID}/api/posts/${postId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const result = await response.json();
        if (response.ok) {
            alert(result.message);
            postElement.remove(); // Remove the post from the DOM
        } else {
            alert(result.error || 'Failed to delete post.');
        }
    } catch (err) {
        console.error('Error deleting post:', err);
        alert('Error deleting post.');
    }
}

// Deleting comments 
async function deleteComment(postId, commentId, commentDiv) {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
        const response = await fetch(`/${STUDENT_ID}/api/posts/${postId}/comments/${commentId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        const result = await response.json();
        if (response.ok) {
            alert(result.message);
            commentDiv.remove(); // Remove the comment from the DOM
        } else {
            alert(result.error || 'Failed to delete comment.');
        }
    } catch (err) {
        console.error('Error deleting comment:', err);
        alert('Error deleting comment.');
    }
}

// Like button
async function toggleLike(postId, button) {
    try {
        const response = await fetch(`/${STUDENT_ID}/api/posts/${postId}/like`, {
            method: 'POST',
            credentials: 'include',
        });
        const result = await response.json();

        if (response.ok) {
            alert(result.message);
            button.textContent = button.textContent === 'Like' ? 'Unlike' : 'Like';
        } else {
            alert(result.error || 'Failed to toggle like.');
        }
    } catch (err) {
        console.error('Error toggling like:', err);
    }
}

// Refresh posts on feed navigation
document.addEventListener('DOMContentLoaded', () => {
    const feedButton = document.querySelector("nav a[href='/" + STUDENT_ID + "/feed']");
    if (feedButton) {
        feedButton.addEventListener('click', (event) => {
            event.preventDefault();
            showSection('feedSection');
            loadPosts();
        });
    }
});

// Web scraped facts
async function loadCurrentFact() {
    try {
        const response = await fetch('/M00982229/api/current-fact', { credentials: 'include' });
        if (!response.ok) {
            throw new Error('Failed to load current fact');
        }
        const data = await response.json();
        const factElement = document.getElementById('bookFactText');
        if (factElement) {
            factElement.textContent = data.fact;
        } else {
            console.error('#bookFactText element not found in DOM!');
        }
    } catch (err) {
        console.error('Error loading fact:', err);
        const factElement = document.getElementById('bookFactText');
        if (factElement) {
            factElement.textContent = 'Error loading fact.';
        }
    }
}

document.addEventListener('DOMContentLoaded', loadCurrentFact);

  
// Load posts when page loads 
document.addEventListener('DOMContentLoaded', loadPosts);
