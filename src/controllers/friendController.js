const User = require("../models/UserModel");
const Notification = require("../models/NotificationModel");
const NotificationTypes = require("../constants/notificationTypes");
const sendEmail = require("../utils/sendEmail");
const logUserActivity = require("../utils/logActivity");
const { FRONTEND_URL } = require("../utils/urls");
const renderEmail = require("../utils/renderEmail");
const { sanitizeString } = require("../utils/sanitize");

// Send a friend request
async function sendFriendRequest(req, res, next) {
  try {
    const email = sanitizeString(req.body.email?.trim() || "");
    
    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }
    
    const currentUserId = req.user.id;

    const sender = await User.findById(currentUserId);
    const recipient = await User.findOne({ email });

    if (!recipient) return res.status(404).json({ message: "Target user not found." });
    if (recipient._id.equals(sender._id)) {
      return res.status(400).json({ message: "You cannot send a friend request to yourself." });
    }

    const alreadyRequested = recipient.friendRequests.some(
      (r) => r.user.toString() === currentUserId && r.status === "Pending"
    );
    const alreadyFriends = recipient.friends.includes(currentUserId);

    if (alreadyRequested) return res.status(400).json({ message: "Friend request already sent." });
    if (alreadyFriends) return res.status(400).json({ message: "You are already friends." });

    // Add friend request
    recipient.friendRequests.push({ user: currentUserId, status: "Pending" });
    await recipient.save();

    // Log + notify
    await Notification.create({
      recipient: recipient._id,
      sender: currentUserId,
      type: NotificationTypes.FRIEND_REQUEST,
      message: `${sender.firstName} ${sender.lastName || ''} sent you a friend request.`
    });

    await logUserActivity(currentUserId, "Sent Friend Request", { to: recipient._id });

    // Try sending email
    const html = renderEmail({
      title: "You've got a friend request",
      preheader: `${sender.firstName} sent you a friend request`,
      bodyHtml: `
        <p>Hi ${recipient.firstName || ""},</p>
        <p><strong>${sender.firstName || ""} ${sender.lastName || ""}</strong> sent you a friend request on Game Tracker.</p>
        <p><a class="button" href="${FRONTEND_URL}/friends?tab=requests">View request</a></p>
      `
    });
    let emailSent = false;
    try {
      const { ok } = await sendEmail(recipient.email, "New Friend Request – Game Tracker", html);
      emailSent = ok;
    } catch (emailErr) {
      console.warn("Friend email failed:", emailErr.message);
    }

    res.json({ message: "Friend request sent.", data: { to: recipient._id }, emailSent });
  } catch (err) {
    next(err);
  }
}


// Accept or reject a friend request
async function respondToFriendRequest(req, res, next) {
  try {
    const { senderId, action } = req.body; // "Accepted" or "Rejected"
    const currentUserId = req.user.id;

    const user = await User.findById(currentUserId);
    const sender = await User.findById(senderId);

    const request = user.friendRequests.find(
      (fr) => fr.user.toString() === senderId && fr.status === "Pending"
    );
    if (!request) return res.status(404).json({ message: "Friend request not found." });

    request.status = action;

    if (action === "Accepted") {
      if (!user.friends.includes(senderId)) user.friends.push(senderId);
      if (!sender.friends.includes(currentUserId)) sender.friends.push(currentUserId);
      await sender.save();

      await Notification.create({
        recipient: senderId,
        sender: currentUserId,
        type: NotificationTypes.FRIEND_ACCEPT, // (UI supports FRIEND_ACCEPT or FRIEND_ACCEPTED)
        message: `${user.firstName} ${user.lastName || ""} accepted your friend request.`
      });

      try {
        await sendEmail(
          sender.email,
          "Friend Request Accepted – Game Tracker",
          `<p>${user.firstName} ${user.lastName || ""} accepted your friend request.</p>`
        );
      } catch (emailErr) {
        console.error("Failed to send friend accept email:", emailErr.message);
      }
    }

    await user.save();

    res.json({
      message: `Friend request ${action.toLowerCase()}.`,
      data: { friendId: senderId, status: action }
    });
  } catch (err) {
    next(err);
  }
}

// Get your pending friend requests
async function getPendingFriendRequests(req, res, next) {
  try {
    const user = await User.findById(req.user.id).populate(
      "friendRequests.user",
      "firstName lastName email"
    );
    const pending = user.friendRequests.filter((fr) => fr.status === "Pending");
    res.json({ message: "Fetched pending friend requests", data: pending });
  } catch (err) {
    next(err);
  }
}

// Get friend list
async function getFriendList(req, res, next) {
  try {
    const user = await User.findById(req.params.id).populate(
      "friends",
      "firstName lastName email"
    );
    res.json({ message: "Fetched friend list", data: user.friends });
  } catch (err) {
    next(err);
  }
}

// Suggest friends
async function getSuggestedFriends(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    const friends = await User.find({ _id: { $in: user.friends } });

    const suggestions = new Set();
    for (const friend of friends) {
      for (const f of friend.friends) {
        if (f.toString() !== req.user.id && !user.friends.includes(f)) {
          suggestions.add(f.toString());
        }
      }
    }

    const suggestedUsers = await User.find({ _id: { $in: [...suggestions] } }).select(
      "firstName lastName email"
    );
    res.json({ message: "Suggested friends fetched", data: suggestedUsers });
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

    user.friends = user.friends.filter((f) => f.toString() !== friendId);
    friend.friends = friend.friends.filter((f) => f.toString() !== userId);

    await user.save();
    await friend.save();

    res.json({ message: "Unfriended successfully.", data: { friendId } });
  } catch (err) {
    next(err);
  }
}

/**
 * Notifications — paginated, with unreadCount
 * GET /friends/notifications?status=all|unread&page=1&limit=20
 */
async function getNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const status = (req.query.status || "all").toLowerCase(); // 'all' | 'unread'
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const skip = (page - 1) * limit;

    const baseQuery = { recipient: userId };
    const unreadQuery = { ...baseQuery, read: false };  

    const [unreadCount, total, items] = await Promise.all([
      Notification.countDocuments(unreadQuery),
      Notification.countDocuments(status === "unread" ? unreadQuery : baseQuery),
      Notification.find(status === "unread" ? unreadQuery : baseQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("sender", "firstName lastName email")
        .lean()
    ]);

    return res.json({
      message: "Fetched notifications",
      data: items,
      meta: { page, limit, total, unreadCount }
    });
  } catch (err) {
    next(err);
  }
}

// Mark one notification read
async function markNotificationAsRead(req, res, next) {
  try {
    
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.id },
      { read: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    res.json({ message: "Notification marked as read", data: notification });
  } catch (err) {
    next(err);
  }
}

// Mark ALL notifications as read
async function readAllNotifications(req, res, next) {
  try {
    const userId = req.user.id;
    const result = await Notification.updateMany(
      { recipient: userId, read: { $ne: true } },  
      { $set: { read: true } }  
    );
    return res.json({
      message: "All notifications marked as read",
      data: {
        matched: result.matchedCount ?? result.n,
        modified: result.modifiedCount ?? result.nModified
      }
    });
  } catch (err) {
    next(err);
  }
}

// Mutuals
async function getMutualFriends(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    const other = await User.findById(req.params.id);
    if (!other) return res.status(404).json({ message: "Other user not found" });

    const mutual = user.friends.filter((friendId) =>
      other.friends.map((f) => f.toString()).includes(friendId.toString())
    );

    const mutualFriends = await User.find({ _id: { $in: mutual } }).select(
      "firstName lastName email"
    );
    res.json({ message: "Fetched mutual friends", data: mutualFriends });
  } catch (err) {
    next(err);
  }
}

// Get requests YOU have sent to others (defaults to Pending only)
async function getSentFriendRequests(req, res, next) {
  try {
    const userId = req.user.id;
    const status = (req.query.status || "Pending"); // allow ?status=Accepted|Rejected|Pending|All

    // Build $elemMatch for status filtering
    const elem =
      status === "All"
        ? { user: userId }
        : { user: userId, status };

    // Find users who have a request from you
    const recipients = await User.find(
      { friendRequests: { $elemMatch: elem } },
      "firstName lastName email friendRequests"
    ).lean();

    // Return as an array of { user: <recipient>, status }
    const data = recipients.map((rec) => {
      const reqFromMe = rec.friendRequests.find(
        (fr) => String(fr.user) === String(userId) && (status === "All" || fr.status === status)
      );
      return {
        user: {
          _id: rec._id,
          firstName: rec.firstName,
          lastName: rec.lastName,
          email: rec.email,
        },
        status: reqFromMe?.status || "Pending",
      };
    });

    res.json({ message: "Fetched sent friend requests", data });
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
  readAllNotifications,
  getMutualFriends,
  getSentFriendRequests
};
