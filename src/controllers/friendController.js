const User = require("../models/UserModel");
const Notification = require("../models/NotificationModel");
const sendEmail = require("../utils/sendEmail");

// Send a friend request
async function sendFriendRequest(req, res, next) {
  try {
    const { targetUserId } = req.body;
    const currentUserId = req.user.id;

    // Prevent self-request
    if (currentUserId === targetUserId) {
      return res.status(400).json({ message: "You cannot send a friend request to yourself." });
    }

    const sender = await User.findById(currentUserId);
    const recipient = await User.findById(targetUserId);

    if (!recipient) return res.status(404).json({ message: "Target user not found." });

    // Check for duplicate request or existing friendship
    const alreadyRequested = recipient.friendRequests.some(req =>
      req.user.toString() === currentUserId && req.status === "Pending"
    );
    const alreadyFriends = recipient.friends.includes(currentUserId);

    if (alreadyRequested) {
      return res.status(400).json({ message: "Friend request already sent." });
    }

    if (alreadyFriends) {
      return res.status(400).json({ message: "You are already friends." });
    }

    // Add friend request to recipient
    recipient.friendRequests.push({ user: currentUserId, status: "Pending" });
    await recipient.save();

    // Create in-app notification with clickable link
    await Notification.create({
      recipient: targetUserId,
      sender: currentUserId,
      type: "friend_request",
      message: `${sender.firstName} sent you a friend request. <a href="https://your-frontend.com/friends/requests">View</a>`
    });

    // Send email notification
    const html = `
      <p>Hi ${recipient.firstName},</p>
      <p><strong>${sender.firstName}</strong> sent you a friend request on Game Tracker.</p>
      <p><a href="https://your-frontend.com/friends/requests">Click here to view and respond</a>.</p>
    `;

    await sendEmail(recipient.email, "New Friend Request – Game Tracker", html);

    res.json({ message: "Friend request sent." });
  } catch (err) {
    next(err);
  }
}

// Accept or reject friend request
async function respondToFriendRequest(req, res, next) {
  try {
    const { senderId, action } = req.body; // "Accepted" or "Rejected"
    const currentUserId = req.user.id;

    const user = await User.findById(currentUserId);
    const sender = await User.findById(senderId);

    const request = user.friendRequests.find(
      fr => fr.user.toString() === senderId && fr.status === "Pending"
    );
    if (!request) return res.status(404).json({ message: "Friend request not found." });

    request.status = action;

    if (action === "Accepted") {
      user.friends.push(senderId);
      sender.friends.push(currentUserId);
      await sender.save();

      // Notify sender
      await Notification.create({
        recipient: senderId,
        type: "FriendAccepted",
        message: `${user.firstName} ${user.lastName} accepted your friend request.`
      });

      await sendEmail(
        sender.email,
        "Friend Request Accepted – Game Tracker",
        `<p>${user.firstName} ${user.lastName} accepted your friend request.</p>`
      );
    }

    await user.save();

    res.json({ message: `Friend request ${action.toLowerCase()}.` });
  } catch (err) {
    next(err);
  }
}

// Get current user's pending friend requests
async function getPendingFriendRequests(req, res, next) {
  try {
    const user = await User.findById(req.user.id).populate("friendRequests.user", "firstName lastName email");
    const pending = user.friendRequests.filter(fr => fr.status === "Pending");
    res.json(pending);
  } catch (err) {
    next(err);
  }
}

// Friend list
async function getFriendList(req, res, next) {
  try {
    const user = await User.findById(req.params.id).populate("friends", "firstName lastName email");
    res.json(user.friends);
  } catch (err) {
    next(err);
  }
}

// Suggest friends based on mutuals
async function getSuggestedFriends(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    const friends = await User.find({ _id: { $in: user.friends } });

    let suggestions = new Set();

    for (const friend of friends) {
      for (const f of friend.friends) {
        if (
          f.toString() !== req.user.id &&
          !user.friends.includes(f)
        ) {
          suggestions.add(f.toString());
        }
      }
    }

    const suggestedUsers = await User.find({ _id: { $in: [...suggestions] } }).select("firstName lastName email");
    res.json(suggestedUsers);
  } catch (err) {
    next(err);
  }
}

// Unfriend
async function unfriendUser(req, res, next) {
  try {
    const { friendId } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);
    if (!friend) return res.status(404).json({ message: "User not found" });

    user.friends = user.friends.filter(f => f.toString() !== friendId);
    friend.friends = friend.friends.filter(f => f.toString() !== userId);

    await user.save();
    await friend.save();

    res.json({ message: "Unfriended successfully." });
  } catch (err) {
    next(err);
  }
}

// Notifications list
async function getNotifications(req, res, next) {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(notifications);
  } catch (err) {
    next(err);
  }
}

// Mark notification as read
async function markNotificationAsRead(req, res, next) {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { isRead: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: "Notification not found" });
    res.json(notif);
  } catch (err) {
    next(err);
  }
}

// Mutual friends
async function getMutualFriends(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    const other = await User.findById(req.params.id);
    if (!other) return res.status(404).json({ message: "Other user not found" });

    const mutual = user.friends.filter(friendId =>
      other.friends.map(f => f.toString()).includes(friendId.toString())
    );

    const mutualFriends = await User.find({ _id: { $in: mutual } }).select("firstName lastName email");
    res.json(mutualFriends);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendFriendRequest,
  respondToFriendRequest,
  getPendingFriendRequests,
  getFriendList,
  getSuggestedFriends,
  unfriendUser,
  getNotifications,
  markNotificationAsRead,
  getMutualFriends
};
