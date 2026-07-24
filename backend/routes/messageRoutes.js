import express from 'express';
import mongoose from 'mongoose';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import Post from '../models/Post.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Helper to validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const DANGEROUS_EXTENSIONS = [
  'exe', 'msi', 'bat', 'cmd', 'sh', 'vbs', 'ps1', 'apk', 'jar', 'js', 'scr', 'dll', 'sys', 'com', 'py', 'iso', 'zip', 'rar', '7z', 'php', 'html', 'htm'
];

function isSafeAttachment(att) {
  if (!att || !att.name) return false;
  const ext = att.name.split('.').pop().toLowerCase();
  if (DANGEROUS_EXTENSIONS.includes(ext)) return false;
  if (att.fileSize && att.fileSize > 5 * 1024 * 1024) return false;
  return true;
}

// @desc    Get total unread messages count for authenticated user
// @route   GET /api/messages/unread-count
// @access  Private
router.get('/unread-count', protect, async (req, res, next) => {
  try {
    const count = await Message.countDocuments({ recipient: req.user.id, read: false });
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user's conversations list
// @route   GET /api/messages/conversations
// @access  Private
router.get('/conversations', protect, async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ participants: req.user.id })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'username fullname avatar bio');

    // Attach partner info and unread count to each conversation
    const formatted = await Promise.all(
      conversations.map(async (conv) => {
        const partner = conv.participants.find((p) => p._id.toString() !== req.user.id);
        if (!partner) return null;

        const unreadCount = await Message.countDocuments({
          sender: partner._id,
          recipient: req.user.id,
          read: false,
        });

        return {
          _id: conv._id,
          partner,
          lastMessage: conv.lastMessage,
          lastMessageSender: conv.lastMessageSender,
          lastMessageAt: conv.lastMessageAt,
          unreadCount,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
        };
      })
    );

    const validConversations = formatted.filter(Boolean);
    res.json({ conversations: validConversations });
  } catch (error) {
    next(error);
  }
});

// @desc    Get chat message thread with a specific user (With Upward Pagination)
// @route   GET /api/messages/:userId
// @access  Private
router.get('/:userId', protect, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '10', 10);
    const skip = (page - 1) * limit;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot open a chat with yourself' });
    }

    const partner = await User.findById(userId).select('username fullname avatar bio');
    if (!partner) {
      return res.status(404).json({ message: 'User not found' });
    }

    const query = {
      $or: [
        { sender: req.user.id, recipient: userId },
        { sender: userId, recipient: req.user.id },
      ],
    };

    const total = await Message.countDocuments(query);
    const rawMessages = await Message.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sharedProfile', 'username fullname avatar bio')
      .populate({
        path: 'sharedPost',
        select: 'caption image images author createdAt',
        populate: { path: 'author', select: 'username fullname avatar' },
      });

    // Reverse to return chronological order (oldest to newest for front-end rendering)
    const messages = rawMessages.reverse();
    const hasMore = skip + rawMessages.length < total;

    res.json({ messages, partner, page, hasMore, total });
  } catch (error) {
    next(error);
  }
});

// @desc    Send a private message to a specific user with rich media attachments
// @route   POST /api/messages/:userId
// @access  Private
router.post('/:userId', protect, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { text = '', images = [], attachments = [], sharedProfile = null, sharedPost = null } = req.body;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid recipient user ID' });
    }

    if (userId === req.user.id) {
      return res.status(400).json({ message: 'You cannot send messages to yourself' });
    }

    const recipientUser = await User.findById(userId);
    if (!recipientUser) {
      return res.status(404).json({ message: 'Recipient user not found' });
    }

    const safeAttachments = (attachments || []).filter(isSafeAttachment);
    const trimmedText = String(text || '').trim();

    const hasText = trimmedText.length > 0;
    const hasImages = images.length > 0;
    const hasDocs = safeAttachments.length > 0;
    const hasProfile = !!sharedProfile;
    const hasPost = !!sharedPost;

    if (!hasText && !hasImages && !hasDocs && !hasProfile && !hasPost) {
      return res.status(400).json({ message: 'Message cannot be empty. Please include text, images, document, profile, or post.' });
    }

    if (trimmedText.length > 2000) {
      return res.status(400).json({ message: 'Message exceeds maximum length of 2000 characters' });
    }

    // Create the message
    const createdMsg = await Message.create({
      sender: req.user.id,
      recipient: userId,
      text: trimmedText,
      images,
      attachments: safeAttachments,
      sharedProfile: hasProfile ? sharedProfile : null,
      sharedPost: hasPost ? sharedPost : null,
      read: false,
    });

    const populated = await Message.findById(createdMsg._id)
      .populate('sharedProfile', 'username fullname avatar bio')
      .populate({
        path: 'sharedPost',
        select: 'caption image images author createdAt',
        populate: { path: 'author', select: 'username fullname avatar' },
      });

    // Create summary text for Conversation list
    let summary = trimmedText;
    if (!summary) {
      if (hasImages) summary = '📷 Image attachment';
      else if (hasDocs) summary = `📄 ${safeAttachments[0]?.name || 'Document'}`;
      else if (hasProfile) summary = '👤 Shared profile';
      else if (hasPost) summary = '📌 Shared post';
    }

    // Create or update conversation document
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, userId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user.id, userId],
        lastMessage: summary,
        lastMessageSender: req.user.id,
        lastMessageAt: new Date(),
      });
    } else {
      conversation.lastMessage = summary;
      conversation.lastMessageSender = req.user.id;
      conversation.lastMessageAt = new Date();
      await conversation.save();
    }

    res.status(201).json({ message: populated });
  } catch (error) {
    next(error);
  }
});

// @desc    Mark messages from a user as read
// @route   PUT /api/messages/:userId/read
// @access  Private
router.put('/:userId/read', protect, async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (!isValidObjectId(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    await Message.updateMany(
      { sender: userId, recipient: req.user.id, read: false },
      { $set: { read: true } }
    );

    res.json({ success: true, message: 'Messages marked as read' });
  } catch (error) {
    next(error);
  }
});

export default router;
